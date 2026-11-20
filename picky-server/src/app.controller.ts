import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';
import { HealthService } from './health/health.service';

@Controller('health')
export class AppController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @Public()
  getHealth(): Promise<{ status: 'ok'; db: 'ok' }> {
    return this.health.check();
  }
}
