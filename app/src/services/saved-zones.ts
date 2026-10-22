import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The zones the picker means to walk to: what frame 07's “Save zone” control writes
 * (node `5:23081`) and what the same control takes back.
 *
 * The frame draws a bookmark beside its “Navigate · 1.4 km” action, and a bookmark that only
 * lights up until the screen closes is not a bookmark. This is the record behind it: the zone's
 * identifier and the moment it was saved, kept **on this device only** and sent nowhere — no
 * server call carries it, exactly as the consent record does not (ADR-020, ADR-024).
 *
 * It is a record rather than a screen's own state because the frame's control has to be able to
 * show the saved zone back, and because the four questions AGENTS.md §11 asks of every stored
 * field must be answerable by the app itself:
 *
 * - **Who may read it** — this app, on this device. Nothing is sent, and no other app is given
 *   access to it.
 * - **How the user gets a copy** — the control on the zone's own screen shows whether that zone
 *   is saved, and the list frame 14's “Saved spots” row opens draws the whole plan in the order
 *   it was made (`src/app/(app)/saved-spots.tsx`, ADR-030); both read it through
 *   `readSavedZones()`.
 * - **How it is corrected** — the same control: the second press removes the zone.
 * - **How it is deleted** — `removeSavedZone()` for one zone, `clearSavedZones()` for all of
 *   them (which signing out calls, `src/services/sign-out.ts`), and uninstalling the app, which
 *   removes the whole store.
 *
 * The lawful basis for storing it is the owner's decision, still open (PROJECT.md, question 15)
 * and owed for every field the app keeps — this one included.
 *
 * Plain storage, deliberately: no React here, so any caller can use it and the screen's view of
 * it (`useSavedZones`) stays a hook in `src/hooks/`.
 */

/**
 * The key is versioned: a record whose shape changes gets a new key rather than being read as if
 * it were the old shape. A value under a key the app does not know is simply not read, which is
 * the same state as never having saved a zone.
 */
export const SAVED_ZONES_STORAGE_KEY = 'picky.saved-zones.v1';

/** One zone the picker saved: which zone, and when they saved it. */
export type SavedZone = {
  /** The zone's identifier, as the map's own labels spell it (“Z14”). */
  zoneId: string;
  /** When the picker saved it, ISO-8601 — the plan's own order is the order it was made in. */
  savedAt: string;
};

/** A zone identifier the app could not have saved is not one; this is the boundary. */
function assertZoneId(zoneId: string): void {
  if (typeof zoneId !== 'string' || zoneId.trim() === '') {
    throw new RangeError('a saved zone needs the identifier of the zone that was saved');
  }
}

/**
 * Reads one stored entry strictly. Anything the app cannot understand — a truncated write, a
 * hand-edited value, a shape from another version — is not a saved zone, and an entry that is
 * not one is dropped rather than making the whole record unreadable.
 */
function parseSavedZone(value: unknown): SavedZone | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const { savedAt, zoneId } = value as Record<string, unknown>;

  if (typeof zoneId !== 'string' || zoneId.trim() === '') {
    return null;
  }

  if (typeof savedAt !== 'string' || savedAt === '' || Number.isNaN(Date.parse(savedAt))) {
    return null;
  }

  return { savedAt, zoneId };
}

/**
 * The zones the picker has saved, in the order they were saved.
 *
 * A stored value the app cannot understand reads as an empty plan — never as a zone the picker
 * did not save — for the same reason a consent is never read out of unreadable data.
 */
export async function readSavedZones(): Promise<SavedZone[]> {
  const raw = await AsyncStorage.getItem(SAVED_ZONES_STORAGE_KEY);

  if (raw === null) {
    return [];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // The one swallowed error in this module, and deliberately so: the alternative is a crash
    // whose whole content is a plan the picker can simply make again.
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.map(parseSavedZone).filter((zone): zone is SavedZone => zone !== null);
}

/**
 * Saves a zone and hands back the record as it now stands.
 *
 * A zone that is already saved is left as it is, timestamp and all: the control that calls this
 * is a toggle, so a second call is a stale screen pressing “save” on a zone that is already in
 * the plan, not a second plan. A write that fails rejects — a screen must never light its
 * bookmark up over a record the device refused.
 */
export async function saveZone(zoneId: string, savedAt: Date = new Date()): Promise<SavedZone[]> {
  assertZoneId(zoneId);

  const saved = await readSavedZones();

  if (saved.some((zone) => zone.zoneId === zoneId)) {
    return saved;
  }

  const record = [...saved, { savedAt: savedAt.toISOString(), zoneId }];

  await AsyncStorage.setItem(SAVED_ZONES_STORAGE_KEY, JSON.stringify(record));

  return record;
}

/**
 * Takes one zone back out of the plan and hands back what is left. Removing a zone that is not
 * saved is not an error: the picker's intent — that zone is not in their plan — holds either way.
 */
export async function removeSavedZone(zoneId: string): Promise<SavedZone[]> {
  assertZoneId(zoneId);

  const remaining = (await readSavedZones()).filter((zone) => zone.zoneId !== zoneId);

  await AsyncStorage.setItem(SAVED_ZONES_STORAGE_KEY, JSON.stringify(remaining));

  return remaining;
}

/** Deletes the whole plan: the user's way out, and what signing out calls. */
export async function clearSavedZones(): Promise<void> {
  await AsyncStorage.removeItem(SAVED_ZONES_STORAGE_KEY);
}
