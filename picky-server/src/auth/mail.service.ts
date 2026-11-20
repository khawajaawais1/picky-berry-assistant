import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class MailService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MailService.name);
  }

  sendVerification(userId: string, email: string, link: string): void {
    if (this.config.get<string>('MAIL_MODE') !== 'console') {
      throw new Error('Unsupported mail delivery mode.');
    }
    void email;
    void link;
    this.logger.info(
      { user_id: userId },
      'Email verification requested; message content withheld.',
    );
  }
}
