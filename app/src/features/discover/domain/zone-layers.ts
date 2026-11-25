import { SPECIES, type Species } from './species';
import type { Zone, ZoneScore } from './zone-source';

/**
 * What the screen shows when more than one berry chip is on.
 *
 * A zone carries **one score per berry**, and the zone service answers one berry at a time
 * (`GET /zones?species=…`). With every chip on, the screen has several answers for the same
 * rings, and the honest reading is:
 *
 * - **one ring per zone**, not one per berry, so a zone both berries score appears once;
 * - **the best selected score wins**, because the question the map answers is “where is good for
 *   the berries I chose?”; a zone that is ripe for lingonberry is worth drawing even if its
 *   bilberry score is low;
 * - **the berry that produced that score is kept**, so the card and the list can name the layer
 *   they are printing instead of relabelling a score with the wrong berry.
 *
 * The function is pure and takes the answers as the screen's hook already has them. It never
 * reads the clock or the source: a restored cache and a fresh answer merge the same way.
 */
export type MergedZones = {
  /** One zone per ring, ordered by the first selected berry that scored it. */
  zones: readonly Zone[];
  /** The berry whose score each zone's top-level figures are, by zone id. */
  layer: ReadonlyMap<string, Species>;
};

/** The selected berries in the app's own order, so a merge is deterministic. */
export function selectedLayers(selected: readonly Species[]): readonly Species[] {
  return SPECIES.filter((species) => selected.includes(species));
}

function bestScore(
  scores: Readonly<Partial<Record<Species, ZoneScore>>>,
  layers: readonly Species[],
): { species: Species; score: ZoneScore } | null {
  let best: { species: Species; score: ZoneScore } | null = null;

  for (const species of layers) {
    const score = scores[species];
    if (score === undefined) continue;
    if (best === null || score.score > best.score.score) best = { species, score };
  }

  return best;
}

/**
 * The older of two instants, or `null` when either cannot state one.
 *
 * The same rule `oldestUpdatedAt` applies to a whole answer: a merged zone may only claim the
 * freshness its least-fresh copy supports, and a copy with no timestamp makes the claim
 * unsupportable rather than invisible.
 */
function olderInstant(a: string | null | undefined, b: string | null | undefined): string | null {
  if (a === undefined || a === null || b === undefined || b === null) return null;
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

export function mergeZoneAnswers(
  answers: ReadonlyMap<Species, readonly Zone[]>,
  selected: readonly Species[],
): MergedZones {
  const layers = selectedLayers(selected);
  const zones = new Map<string, Zone>();
  const layer = new Map<string, Species>();

  for (const species of layers) {
    for (const zone of answers.get(species) ?? []) {
      const best = bestScore(zone.scores, layers);
      // The answer was parsed for `species`, so this is the score that layer answered; a zone
      // that somehow carries none is not a zone this merge can place.
      if (best === null) continue;

      const current = zones.get(zone.id);
      const merged: Zone = {
        ...zone,
        score: best.score.score,
        confidence: best.score.confidence,
        ripeness: best.score.ripeness,
        updatedAt: current
          ? olderInstant(current.updatedAt, zone.updatedAt)
          : (zone.updatedAt ?? null),
      };

      // Later copies may score higher than the one already held; keep the better figures and
      // the berry that produced them.
      if (current === undefined || merged.score > current.score) {
        zones.set(zone.id, merged);
        layer.set(zone.id, best.species);
      } else {
        zones.set(zone.id, { ...current, updatedAt: merged.updatedAt });
      }
    }
  }

  return { layer, zones: [...zones.values()] };
}
