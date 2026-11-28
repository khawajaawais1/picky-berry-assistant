import { ConfigService } from '@nestjs/config';

export function minimumAnalyticsUsers(config: ConfigService): number {
  return (
    config.get<number>('ANALYTICS_MIN_USERS') ??
    config.get<number>('MIN_REPORTERS_FOR_AVERAGE', 3)
  );
}
