import type { TranslationKey } from '@/services/i18n';

import type { ZoneState } from '../domain/zone';

/**
 * The catalogue key for each zone state, in one place because two screens name them: the
 * map's legend (frame 06, node 5:22986) and the zone screen's state pill (frame 07, node
 * 5:23063). “Unpicked” is the design's word for the same zone on both, so the two must read
 * the same string — a second copy of this map is how one screen would start saying “Not
 * picked yet” while the other says “Unpicked”.
 */
export const ZONE_STATE_LABEL_KEY: Record<ZoneState, TranslationKey> = {
  unpicked: 'discover.legend.unpicked',
  recentlyPicked: 'discover.legend.recentlyPicked',
  ripening: 'discover.legend.ripening',
};
