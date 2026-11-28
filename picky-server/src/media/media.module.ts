import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MlModule } from '../ml/ml.module';
import { MediaController, PhotoUploadInterceptor } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [JobsModule, MlModule],
  controllers: [MediaController],
  providers: [MediaService, PhotoUploadInterceptor],
})
export class MediaModule {}
