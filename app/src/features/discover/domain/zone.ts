/**
 * The three picking states the design names for a zone. The zone service does not report a
 * picking state yet, so only the copy (`zone-state-copy.ts`) and the details screen's type use it.
 */
export const ZONE_STATES = ['unpicked', 'recentlyPicked', 'ripening'] as const;

export type ZoneState = (typeof ZONE_STATES)[number];
