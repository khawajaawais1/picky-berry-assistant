import type { TranslationKey } from '@/services/i18n';

import type { ZoneConfidence, ZoneRipeness } from '../domain/zone-source';

/**
 * The words for the two facts a source zone carries besides its score: how sure the score is,
 * and how far the season has got. Both are shared by the card and the list rows, so the two
 * views of one zone cannot name its confidence or its ripeness differently.
 *
 * The confidence keys are screen 07's, which already names the three levels in both languages.
 * The ripeness words are the map screen's own (`discover.ripeness.*`): screen 07 says “Ripe
 * now” over a zone it has a full reading for, while a list row only has the payload's four
 * states and needs a word for the two the details screen never draws (`unripe`, `past`).
 */
export const CONFIDENCE_LABEL_KEY: Record<ZoneConfidence, TranslationKey> = {
  high: 'discover.details.confidence.high',
  medium: 'discover.details.confidence.medium',
  low: 'discover.details.confidence.low',
};

export const RIPENESS_LABEL_KEY: Record<ZoneRipeness, TranslationKey> = {
  unripe: 'discover.ripeness.unripe',
  ripening: 'discover.ripeness.ripening',
  ripe: 'discover.ripeness.ripe',
  past: 'discover.ripeness.past',
};
