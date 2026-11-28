import {
  ConflictException,
  Injectable,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DbService } from '../db/db.service';
import { JobsService } from '../jobs/jobs.service';
import { MlClientService } from '../ml/ml-client.service';
import { MlDetectionResponse } from '../ml/ml.types';

interface StoredPhoto {
  id: string;
  submission_id: string;
  counts: Record<string, number>;
  total: number;
  model_version: string;
}

export interface PhotoUpload {
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly database: DbService,
    private readonly jobs: JobsService,
    private readonly ml: MlClientService,
    private readonly config: ConfigService,
  ) {}

  async analyze(
    userId: string,
    photoId: string | undefined,
    submissionId: string | undefined,
    photo: PhotoUpload | undefined,
  ): Promise<{ statusCode: 200 | 201; body: Record<string, unknown> }> {
    if (!isUuid(photoId) || !isUuid(submissionId)) {
      throw new UnprocessableEntityException({
        error: 'VALIDATION_ERROR',
        message: 'Idempotency-Key and submission_id must be UUIDs.',
      });
    }
    const replay = await this.findPhoto(photoId);
    if (replay) {
      if (replay.user_id !== userId || replay.submission_id !== submissionId) {
        throw this.submissionConflict();
      }
      return { statusCode: 200, body: this.toResponse(replay) };
    }
    if (!photo || photo.size === 0) {
      throw new UnprocessableEntityException({
        error: 'INVALID_PHOTO',
        message: 'A photo file is required.',
      });
    }
    if (photo.size > this.config.get<number>('MAX_PHOTO_BYTES', 4_000_000)) {
      throw this.photoTooLarge();
    }
    const detectedType = imageType(photo.buffer);
    if (!detectedType || detectedType.mime !== photo.mimetype) {
      throw new UnprocessableEntityException({
        error: 'INVALID_PHOTO',
        message: 'Send a valid JPEG, PNG, or WebP image.',
      });
    }

    await this.assertSubmissionOwner(userId, submissionId);
    await this.assertPhotoCapacity(userId, submissionId);

    const result: MlDetectionResponse = await this.ml.analyzePhoto(
      photo.buffer,
      detectedType.mime,
      detectedType.filename,
    );

    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const lockKeys = [
        `photo:${photoId}`,
        `submission:${submissionId}`,
      ].sort();
      for (const lockKey of lockKeys) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          lockKey,
        ]);
      }
      const afterLock = await client.query<
        StoredPhoto & { user_id: string | null }
      >(
        `SELECT id, user_id, submission_id, counts, total, model_version
         FROM photos WHERE id = $1`,
        [photoId],
      );
      if (afterLock.rows[0]) {
        if (
          afterLock.rows[0].user_id !== userId ||
          afterLock.rows[0].submission_id !== submissionId
        ) {
          throw this.submissionConflict();
        }
        await client.query('COMMIT');
        return { statusCode: 200, body: this.toResponse(afterLock.rows[0]) };
      }
      await this.assertPhotoCapacity(userId, submissionId, client);
      const inserted = await client.query<StoredPhoto>(
        `INSERT INTO photos
           (id, user_id, submission_id, counts, total, model_version, image_width, image_height)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
         RETURNING id, submission_id, counts, total, model_version`,
        [
          photoId,
          userId,
          submissionId,
          JSON.stringify(result.counts),
          result.total,
          result.model_version,
          result.image_size.width,
          result.image_size.height,
        ],
      );
      const reports = await client.query<{
        zone_id: string;
        species: string;
      }>(
        `SELECT DISTINCT zone_id, species
         FROM reports WHERE submission_id = $1`,
        [submissionId],
      );
      for (const report of reports.rows) {
        await this.jobs.enqueue(
          'recompute_zone_score',
          { zone_id: report.zone_id, species: report.species },
          `recompute:${report.zone_id}:${report.species}`,
          client,
        );
      }
      await client.query('COMMIT');
      return { statusCode: 201, body: this.toResponse(inserted.rows[0]) };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async findPhoto(
    photoId: string,
  ): Promise<(StoredPhoto & { user_id: string | null }) | undefined> {
    const result = await this.database.pool.query<
      StoredPhoto & { user_id: string | null }
    >(
      `SELECT id, user_id, submission_id, counts, total, model_version
       FROM photos WHERE id = $1`,
      [photoId],
    );
    return result.rows[0];
  }

  private async assertSubmissionOwner(
    userId: string,
    submissionId: string,
  ): Promise<void> {
    const result = await this.database.pool.query<{ user_id: string | null }>(
      `SELECT user_id FROM photos WHERE submission_id = $1
       UNION ALL
       SELECT user_id FROM reports WHERE submission_id = $1`,
      [submissionId],
    );
    if (result.rows.some((row) => row.user_id !== userId)) {
      throw this.submissionConflict();
    }
  }

  private async assertPhotoCapacity(
    userId: string,
    submissionId: string,
    queryable: {
      query: <T>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
    } = this.database.pool,
  ): Promise<void> {
    const [submission, capacity] = await Promise.all([
      queryable.query<{ user_id: string | null }>(
        `SELECT user_id FROM photos WHERE submission_id = $1
         UNION ALL
         SELECT user_id FROM reports WHERE submission_id = $1`,
        [submissionId],
      ),
      queryable.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM photos
         WHERE submission_id = $1`,
        [submissionId],
      ),
    ]);
    if (submission.rows.some((row) => row.user_id !== userId)) {
      throw this.submissionConflict();
    }
    if (
      Number(capacity.rows[0]?.count ?? 0) >=
      this.config.get<number>('MAX_PHOTOS_PER_SUBMISSION', 5)
    ) {
      throw new UnprocessableEntityException({
        error: 'TOO_MANY_PHOTOS',
        message: 'The submission already has the maximum number of photos.',
      });
    }
  }

  private toResponse(photo: StoredPhoto): Record<string, unknown> {
    return {
      photo_id: photo.id,
      submission_id: photo.submission_id,
      counts: photo.counts,
      total: Number(photo.total),
      model_version: photo.model_version,
    };
  }

  private photoTooLarge(): PayloadTooLargeException {
    return new PayloadTooLargeException({
      error: 'PHOTO_TOO_LARGE',
      message: 'Resize to about 1280 px JPEG.',
    });
  }

  private submissionConflict(): ConflictException {
    return new ConflictException({
      error: 'SUBMISSION_CONFLICT',
      message: 'Submission identifier is already in use.',
    });
  }
}

function isUuid(value: string | undefined): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function imageType(
  bytes: Buffer,
): { mime: string; filename: string } | undefined {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mime: 'image/jpeg', filename: 'photo.jpg' };
  }
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return { mime: 'image/png', filename: 'photo.png' };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { mime: 'image/webp', filename: 'photo.webp' };
  }
  return undefined;
}
