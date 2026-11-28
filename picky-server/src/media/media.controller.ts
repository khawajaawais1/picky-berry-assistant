import {
  CallHandler,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { Observable, catchError, throwError } from 'rxjs';
import { ExecutionContext } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.interface';
import { MediaService, PhotoUpload } from './media.service';

type AuthenticatedRequest = Request & { user: AuthUser };

const maxPhotoBytes = Number(process.env.MAX_PHOTO_BYTES ?? 4_000_000);
const MulterPhotoInterceptor = FileInterceptor('photo', {
  limits: { fileSize: maxPhotoBytes },
});

@Injectable()
export class PhotoUploadInterceptor implements NestInterceptor {
  private readonly upload = new MulterPhotoInterceptor();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    try {
      const observable = await this.upload.intercept(context, next);
      return observable.pipe(
        catchError((error: unknown) =>
          throwError(() => normalizeUploadError(error)),
        ),
      );
    } catch (error) {
      throw normalizeUploadError(error);
    }
  }
}

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(PhotoUploadInterceptor)
  async analyze(
    @Headers('idempotency-key') photoId: string | undefined,
    @Query('submission_id') submissionId: string | undefined,
    @UploadedFile() photo: PhotoUpload | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<Record<string, unknown>> {
    const result = await this.media.analyze(
      request.user.id,
      photoId,
      submissionId,
      photo,
    );
    response.status(result.statusCode);
    return result.body;
  }
}

function normalizeUploadError(error: unknown): unknown {
  if (error instanceof PayloadTooLargeException) {
    return new PayloadTooLargeException({
      error: 'PHOTO_TOO_LARGE',
      message: 'Resize to about 1280 px JPEG.',
    });
  }
  return error;
}
