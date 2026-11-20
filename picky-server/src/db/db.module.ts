import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { DB_SERVICE } from './db.constants';
import { DbService } from './db.service';

@Global()
@Module({
  providers: [
    {
      provide: DB_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Pool =>
        new Pool({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: config.get<number>('DB_POOL_MAX', 10),
          idleTimeoutMillis: 30_000,
          ssl:
            config.get<string>('DB_SSL') === 'disable'
              ? false
              : { rejectUnauthorized: false },
          options: '-c search_path=public,extensions',
        }),
    },
    DbService,
  ],
  exports: [DbService],
})
export class DbModule {}
