/**
 * Public API of the `visits` feature.
 *
 * Everything else in this folder is an implementation detail. The domain is pure
 * and deterministic: a caller feeds it presence samples (from a location source)
 * and consumes visits and events. No GPS, storage or network lives here yet, which
 * is why the first slice can be verified without a device or a backend.
 *
 * What changed on 2026-10-12: the position an app can read is now real
 * (`src/services/location`, behind a port and the picker's consent, ADR-045),
 * `presenceSamplesFor` is the rule that joins it to this domain — a containment
 * answer in, the tracker's samples out, with what was left closed before what was
 * entered is opened — and `useVisitPresence` is the whole chain in one hook: fixes
 * in, visits and events out. It still has **no caller in a screen**, and it ships no
 * zone list of its own: containment needs real rings, nothing returns a zone yet
 * (PROJECT.md, known issue 14), and a scripted list in the app would be invented
 * geography (ADR-046).
 */
export {
  DEFAULT_VISIT_POLICY,
  parseVisitPolicy,
  type VisitPolicy,
  type VisitPolicyParseResult,
} from './domain/visit-policy';

export {
  findContainingZone,
  isPointInPolygon,
  type Point,
  type ZonePolygon,
  type ZoneResolution,
  type ZoneRing,
} from './domain/zone-containment';

export {
  useVisitPresence,
  type UseVisitPresenceOptions,
  type VisitPresenceState,
} from './hooks/use-visit-presence';

export { presenceSamplesFor } from './domain/position-presence';

export {
  applyPresence,
  createVisitTrackerState,
  defaultLocalDayOf,
  finalizeExpired,
  type CandidateEntry,
  type PresenceSegment,
  type Visit,
  type VisitEvent,
  type VisitTrackerDeps,
  type VisitTrackerResult,
  type VisitTrackerState,
  type ZonePresenceSample,
} from './domain/visit-lifecycle';
