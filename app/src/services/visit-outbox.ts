import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Finished visits waiting to reach the team API's `POST /visits` (ADR-066). A visit the network
 * lost, or one finished just before the app closed, is still sent on the next launch, and the
 * server records it once because its id is the `client_id`.
 *
 * Plain storage, deliberately: no React here, so any caller can use it.
 *
 * The four questions AGENTS.md §11 asks of every stored field:
 *
 * - **Who may read it** — this app, on this device, until the visit is sent. It holds the zone and
 *   the start and end of a finished visit, and whether the picker ended it by hand — never a
 *   position fix.
 * - **How the user gets a copy** — the notice at `/terms-privacy` lists it while it holds any, and
 *   the copy at `/your-data` carries each entry.
 * - **How it is corrected** — it is not: the entry is what the tracker saw, and the server judges it.
 * - **How it is deleted** — each entry when the server has answered it, `clearVisitOutbox()` when the
 *   picker signs out, and uninstalling the app.
 */
export const VISIT_OUTBOX_STORAGE_KEY = 'picky.visit-outbox.v1';

export type OutboxVisit = {
  /** The tracker's own id, sent as `client_id`. */
  clientId: string;
  zoneId: string;
  startedAt: string;
  endedAt: string;
  /** True when the picker ended the visit by hand; absent in entries written before 2026-11-21. */
  manual?: boolean;
};

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isInstant(value: unknown): value is string {
  return typeof value === 'string' && INSTANT.test(value) && !Number.isNaN(Date.parse(value));
}

function parseEntry(value: unknown): OutboxVisit | null {
  if (typeof value !== 'object' || value === null) return null;

  const { clientId, endedAt, manual, startedAt, zoneId } = value as Record<string, unknown>;
  if (!isText(clientId) || !isText(zoneId) || !isInstant(startedAt) || !isInstant(endedAt)) {
    return null;
  }

  return { clientId, zoneId, startedAt, endedAt, ...(manual === true ? { manual: true } : {}) };
}

/** The waiting visits, oldest first. Anything unreadable reads as nothing, never as a visit. */
export async function readVisitOutbox(): Promise<OutboxVisit[]> {
  const raw = await AsyncStorage.getItem(VISIT_OUTBOX_STORAGE_KEY);
  if (raw === null) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Deliberately swallowed: an unreadable outbox is one the tracker can fill again, and a crash
    // on launch would serve nobody. It must never read as visits.
    return [];
  }

  if (!Array.isArray(parsed)) return [];
  return parsed.map(parseEntry).filter((entry): entry is OutboxVisit => entry !== null);
}

/** Adds a finished visit once. A write that fails rejects, so no visit is reported as kept. */
export async function addToVisitOutbox(visit: OutboxVisit): Promise<void> {
  if (parseEntry(visit) === null) throw new RangeError('an outbox entry is a finished visit');

  const held = await readVisitOutbox();
  if (held.some((entry) => entry.clientId === visit.clientId)) return;

  await AsyncStorage.setItem(VISIT_OUTBOX_STORAGE_KEY, JSON.stringify([...held, visit]));
}

/** Removes the visit the server has answered. */
export async function removeFromVisitOutbox(clientId: string): Promise<void> {
  const held = await readVisitOutbox();
  await AsyncStorage.setItem(
    VISIT_OUTBOX_STORAGE_KEY,
    JSON.stringify(held.filter((entry) => entry.clientId !== clientId)),
  );
}

/** Deletes the whole outbox: what signing out calls. */
export async function clearVisitOutbox(): Promise<void> {
  await AsyncStorage.removeItem(VISIT_OUTBOX_STORAGE_KEY);
}
