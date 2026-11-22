import { Injectable } from '@nestjs/common';
import { DbService } from '../db/db.service';

export interface FailedAuditInput {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  requestId: string;
  ip: string | null;
  userAgent: string | null;
  detail: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly database: DbService) {}

  async recordFailure(input: FailedAuditInput): Promise<void> {
    await this.database.pool.query(
      `INSERT INTO audit_log
         (actor_id, action, target_type, target_id, detail, request_id,
          reason, outcome, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, 'failure', $8, $9)`,
      [
        input.actorId,
        input.action,
        input.targetType,
        input.targetId,
        JSON.stringify(input.detail),
        input.requestId,
        input.reason,
        input.ip,
        input.userAgent,
      ],
    );
  }
}
