import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { DB_SERVICE } from './db.constants';
import { DbSchema } from './db.types';

@Injectable()
export class DbService implements OnModuleDestroy {
  readonly pool: Pool;
  readonly query: Kysely<DbSchema>;

  constructor(@Inject(DB_SERVICE) pool: Pool) {
    this.pool = pool;
    this.query = new Kysely<DbSchema>({
      dialect: new PostgresDialect({ pool }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.query.destroy();
  }
}
