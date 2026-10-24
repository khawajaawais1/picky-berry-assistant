import { useCallback, useEffect, useState } from 'react';

import {
  clearSavedZones,
  readSavedZones,
  removeSavedZone,
  saveZone,
  type SavedZone,
} from '@/services/saved-zones';

/**
 * The zones the picker has saved ([saved-zones.ts](../services/saved-zones.ts)), as a screen
 * uses them.
 *
 * It lives with the other shared hooks rather than in a feature because the record is the
 * picker's own and outlives one screen: frame 07's bookmark writes it, and both the surface
 * that lists the plan (frame 14's “Saved spots” row, ADR-030) and the settings row that
 * counts it read the same record.
 * A read in flight and a failure a screen has to show are UI state, while the service stays
 * plain storage any caller can use.
 *
 * The same rule as the consent record's hook: a failed write leaves the state showing what is
 * **stored** — re-read, not assumed — so the bookmark can never claim a zone was saved when the
 * device did not keep it, and `error` reports it rather than swallowing it.
 */
export type SavedZonesState = {
  /** The picker's plan, in the order they saved it. */
  zones: SavedZone[];
  /**
   * True while the record is being read. Screens must treat this as “nothing is known yet”:
   * a bookmark must not claim a state before the store has answered.
   */
  loading: boolean;
  /** True when the device would not let the app read or write the record. */
  error: boolean;
  /** Whether one zone is in the plan, as the screen's own control asks. */
  isSaved: (zoneId: string) => boolean;
  /** Saves the zone under the berry it is being read on, or removes it if it is saved. */
  toggle: (zoneId: string, speciesId: string) => Promise<void>;
  /** Deletes the whole plan — the user's way out. */
  clear: () => Promise<void>;
};

export function useSavedZones(): SavedZonesState {
  const [zones, setZones] = useState<SavedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    readSavedZones()
      .then((stored) => {
        if (active) setZones(stored);
      })
      .catch(() => {
        // A store the app cannot read is an empty plan as far as a screen may act, and it is
        // reported rather than presented as the picker's own.
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const isSaved = useCallback(
    (zoneId: string) => zones.some((zone) => zone.zoneId === zoneId),
    [zones],
  );

  const toggle = useCallback(
    async (zoneId: string, speciesId: string) => {
      const saved = zones.some((zone) => zone.zoneId === zoneId);

      try {
        setZones(saved ? await removeSavedZone(zoneId) : await saveZone(zoneId, speciesId));
        setError(false);
      } catch {
        setError(true);
        // Show what is stored, not what was attempted: re-reading is the only honest answer
        // when the write did not happen.
        await readSavedZones()
          .then(setZones)
          .catch(() => setZones([]));
      }
    },
    [zones],
  );

  const clear = useCallback(async () => {
    try {
      await clearSavedZones();
      setZones([]);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  return { clear, error, isSaved, loading, toggle, zones };
}
