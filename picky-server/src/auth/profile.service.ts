import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { QueryResultRow } from 'pg';
import { DbService } from '../db/db.service';
import { SpeciesService } from '../species/species.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface ProfileRow extends QueryResultRow {
  id: string;
  email: string;
  email_verified_at: Date | null;
  nickname: string | null;
  role: string;
  privacy_level: string;
  background_location: boolean;
  alert_radius_km: number;
  species_interest: string[];
  lang: string;
  created_at: Date;
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly database: DbService,
    private readonly species: SpeciesService,
  ) {}

  async getProfile(userId: string): Promise<Record<string, unknown>> {
    const result = await this.database.pool.query<ProfileRow>(
      `SELECT id, email, email_verified_at, nickname, role, privacy_level,
              background_location, alert_radius_km, species_interest, lang, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('User not found.');
    return this.toProfile(row);
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileDto,
  ): Promise<Record<string, unknown>> {
    if (Object.keys(input).length === 0) {
      throw new UnprocessableEntityException('At least one field is required.');
    }
    if (input.nickname !== undefined && !input.nickname.trim()) {
      throw new UnprocessableEntityException('Nickname cannot be blank.');
    }
    if (input.species_interest) {
      await Promise.all(
        input.species_interest.map((code) => this.species.validate(code)),
      );
    }

    const values: unknown[] = [userId];
    const updates: string[] = [];
    if (input.nickname !== undefined) {
      values.push(input.nickname.trim());
      updates.push(`nickname = $${values.length}`);
    }
    if (input.alert_radius_km !== undefined) {
      values.push(input.alert_radius_km);
      updates.push(`alert_radius_km = $${values.length}`);
    }
    if (input.species_interest !== undefined) {
      values.push(input.species_interest);
      updates.push(`species_interest = $${values.length}`);
    }
    if (input.lang !== undefined) {
      values.push(input.lang);
      updates.push(`lang = $${values.length}`);
    }

    const result = await this.database.pool.query<ProfileRow>(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, email, email_verified_at, nickname, role, privacy_level,
                 background_location, alert_radius_km, species_interest, lang, created_at`,
      values,
    );
    if (!result.rows[0]) throw new NotFoundException('User not found.');
    return this.toProfile(result.rows[0]);
  }

  async updatePrivacy(
    userId: string,
    input: UpdatePrivacyDto,
  ): Promise<Record<string, unknown>> {
    if (Object.keys(input).length === 0) {
      throw new UnprocessableEntityException('At least one field is required.');
    }
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query<{
        nickname: string | null;
        privacy_level: string;
        background_location: boolean;
      }>(
        `SELECT nickname, privacy_level, background_location
         FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [userId],
      );
      const row = current.rows[0];
      if (!row) throw new NotFoundException('User not found.');
      const privacyLevel = input.privacy_level ?? row.privacy_level;
      if (privacyLevel === 'public' && !row.nickname?.trim()) {
        throw new UnprocessableEntityException({
          error: 'NICKNAME_REQUIRED',
          message: 'A nickname is required for public privacy.',
        });
      }

      const backgroundLocation =
        input.background_location ?? row.background_location;
      await client.query(
        `UPDATE users SET privacy_level = $2, background_location = $3
         WHERE id = $1`,
        [userId, privacyLevel, backgroundLocation],
      );
      if (
        input.background_location !== undefined &&
        input.background_location !== row.background_location
      ) {
        await client.query(
          `INSERT INTO consents (user_id, kind, version, granted)
           VALUES ($1, 'background_location', NULL, $2)`,
          [userId, input.background_location],
        );
      }
      await client.query('COMMIT');
      return {
        privacy_level: privacyLevel,
        background_location: backgroundLocation,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async registerDevice(
    userId: string,
    input: RegisterDeviceDto,
  ): Promise<void> {
    await this.database.pool.query(
      `INSERT INTO devices (user_id, fcm_token, platform, app_version, last_seen_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (fcm_token) DO UPDATE
       SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform,
           app_version = EXCLUDED.app_version, last_seen_at = now()`,
      [userId, input.fcm_token, input.platform, input.app_version ?? null],
    );
  }

  async exportData(userId: string): Promise<Record<string, unknown>> {
    const profile = await this.database.pool.query<ProfileRow>(
      `SELECT id, email, email_verified_at, nickname, role, privacy_level,
              background_location, alert_radius_km, species_interest, lang, created_at
       FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [userId],
    );
    if (!profile.rows[0]) throw new NotFoundException('User not found.');

    const [consents, devices, visits, reports] = await Promise.all([
      this.database.pool.query(
        `SELECT kind, version, granted, created_at
         FROM consents WHERE user_id = $1 ORDER BY created_at`,
        [userId],
      ),
      this.database.pool.query(
        `SELECT id, platform, right(fcm_token, 6) AS token_suffix, last_seen_at
         FROM devices WHERE user_id = $1 ORDER BY created_at`,
        [userId],
      ),
      this.database.pool.query(
        `SELECT v.id, v.zone_id, z.name AS zone_name, v.started_at, v.ended_at,
                v.duration_s, v.manual, v.status, v.reject_reason
         FROM visits v LEFT JOIN zones z ON z.id = v.zone_id
         WHERE v.user_id = $1 ORDER BY v.started_at DESC, v.id DESC`,
        [userId],
      ),
      this.database.pool.query(
        `SELECT id, zone_id, species, rating, visit_id, created_at
         FROM reports WHERE user_id = $1 ORDER BY created_at DESC, id DESC`,
        [userId],
      ),
    ]);
    return {
      profile: this.toProfile(profile.rows[0]),
      consents: consents.rows,
      devices: devices.rows,
      visits: visits.rows,
      reports: reports.rows,
    };
  }

  private toProfile(row: ProfileRow): Record<string, unknown> {
    return {
      id: row.id,
      email: row.email,
      email_verified: row.email_verified_at !== null,
      nickname: row.nickname,
      role: row.role,
      privacy_level: row.privacy_level,
      background_location: row.background_location,
      alert_radius_km: row.alert_radius_km,
      species_interest: row.species_interest,
      lang: row.lang,
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
