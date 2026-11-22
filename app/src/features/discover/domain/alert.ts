import type { TranslationKey } from '@/services/i18n';

export { formatRadius } from './alert-radius';

export type Confidence = 'high' | 'medium' | 'low';
export type AlertRipeness = 'unripe' | 'ripening' | 'ripe' | 'past';

export const ALERT_CONFIDENCE = ['high', 'medium', 'low'] as const satisfies readonly Confidence[];

export function confidenceLabelKey(confidence: Confidence): TranslationKey {
  return `discover.details.confidence.${confidence}`;
}
