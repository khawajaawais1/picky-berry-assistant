import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { REASON_TEMPLATES } from './templates';

@Injectable()
export class ExplanationService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ExplanationService.name);
  }

  renderReason(
    code: string,
    inputs: Record<string, unknown>,
    lang: 'fi' | 'en',
  ): string {
    const template = REASON_TEMPLATES[code];
    if (!template) {
      this.logger.warn(
        { reason_code: code },
        'Unknown score explanation reason code',
      );
      return lang === 'fi'
        ? 'Lisätietoja ei ole saatavilla.'
        : 'No additional explanation is available.';
    }

    return template[lang].replace(
      /\{([a-z0-9_]+)\}/g,
      (_match, key: string) => {
        if (key === 'suitability_pct') {
          const suitability = Number(inputs.suitability);
          return Number.isFinite(suitability)
            ? String(Math.round(suitability * 100))
            : '—';
        }
        const value = inputs[key];
        if (
          value === null ||
          value === undefined ||
          !Number.isFinite(Number(value))
        ) {
          return '—';
        }
        return key === 'avg_rating_7d'
          ? Number(value).toFixed(1)
          : String(Math.round(Number(value)));
      },
    );
  }
}
