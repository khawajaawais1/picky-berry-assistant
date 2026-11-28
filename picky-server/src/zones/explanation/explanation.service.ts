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
      return this.fallback(code, lang);
    }

    let missingValue = false;
    const text = template[lang].replace(
      /\{([a-z0-9_]+)\}/g,
      (_match, key: string) => {
        const value = inputs[key];
        const formatted =
          key === 'window_start' || key === 'window_end'
            ? this.formatWindowDate(value, lang)
            : this.formatReportCount(value);
        if (formatted === null) {
          missingValue = true;
          return '';
        }
        return formatted;
      },
    );
    return missingValue ? this.fallback(code, lang) : text;
  }

  private formatWindowDate(value: unknown, lang: 'fi' | 'en'): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const date = new Date(`${value}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return null;
    if (lang === 'fi') {
      const parts = new Intl.DateTimeFormat('fi-FI', {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'UTC',
      }).formatToParts(date);
      const day = parts.find((part) => part.type === 'day')?.value;
      const month = parts.find((part) => part.type === 'month')?.value;
      return day && month ? `${day}.${month}.` : null;
    }
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    }).format(date);
  }

  private formatReportCount(value: unknown): string | null {
    const count = Number(value);
    return value !== null &&
      value !== undefined &&
      Number.isInteger(count) &&
      count >= 0
      ? String(count)
      : null;
  }

  private fallback(code: string, lang: 'fi' | 'en'): string {
    this.logger.warn(
      { reason_code: code },
      'Unknown score explanation reason code or missing input',
    );
    return lang === 'fi'
      ? 'Lisätietoja ei ole saatavilla.'
      : 'No additional explanation is available.';
  }
}
