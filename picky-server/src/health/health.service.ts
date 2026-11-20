import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

@Injectable()
export class HealthService {
  constructor(private readonly database: DbService) {}

  async check(): Promise<{ status: 'ok'; db: 'ok' }> {
    await this.database.pool.query('SELECT 1');
    return { status: 'ok', db: 'ok' };
  }
}
