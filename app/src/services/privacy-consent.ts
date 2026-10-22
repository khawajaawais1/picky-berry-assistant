import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The user's privacy consent, kept as a record on the device.
 *
 * It is a record rather than a screen's own state because a consent only means something
 * if the app can show what was agreed and when, and because withdrawing it has to be as
 * easy as giving it (GDPR Art. 7; AGENTS.md §11.1). It is **sent nowhere**: there is no
 * backend and nothing captures position yet, so no processor is involved and no transfer
 * happens (ADR-020 records the decision and what it costs).
 *
 * **What the record consents to, in the app's own words.** Visit tracking **while the app is
 * open**. The frames drew the heavier promise — timing a visit “even with the screen locked” —
 * and the app does not do that: position is read in the foreground only, behind this record
 * (ADR-045), and background capture is an owner decision that has not been taken (ADR-047).
 * The field is named `visitTracking` rather than the frames' “background” for exactly that
 * reason: a stored field whose name claims more than the app does is a claim nobody can keep.
 *
 * Plain storage, deliberately: no React here, so any caller can use it and the screens'
 * view of it (`usePrivacyConsent`) is a hook in `src/hooks/`.
 *
 * The four questions AGENTS.md §11 asks of every stored field:
 *
 * - **Who may read it** — this app, on this device. No server call carries it, and nothing
 *   else on the device is given access to it.
 * - **How the user gets a copy** — the switch on the privacy screen and the row on screen
 *   05 both show the stored value; there is no export yet, and this field carries no
 *   content beyond a boolean and a timestamp.
 * - **How it is corrected** — the same two controls: either writes the new value.
 * - **How it is deleted** — `clearPrivacyConsent()`, which the privacy screen's "Sign out"
 *   calls (`src/services/sign-out.ts`), and uninstalling the app, which removes the whole
 *   store. That sign-out deletes the consent is this repository's assumption rather than an
 *   owner decision — PROJECT.md, open question 25 records it as one to confirm.
 *
 * There is deliberately no `useEffect` that writes on read: a consent is written when the
 * user decides, never because a screen was opened.
 */

/**
 * The key is versioned: a record whose shape changes gets a new key rather than being read
 * as if it were the old shape. A value under a key the app does not know is simply not
 * read, which is the same state as never having decided.
 */
export const CONSENT_STORAGE_KEY = 'picky.privacy-consent.v2';

/**
 * The key the record lived under until 2026-10-12, when the field was renamed from the
 * frames' `backgroundTracking` to what the app actually does. A value under it can no longer
 * be read — its shape is the old one, and the app will not guess what a picker agreed to
 * under a promise it no longer makes — so `readPrivacyConsent` clears it away instead of
 * leaving a record behind that nothing can show or withdraw (the four questions, above).
 */
const LEGACY_CONSENT_STORAGE_KEY = 'picky.privacy-consent.v1';

export type PrivacyConsent = {
  /** Visit tracking while the app is open — what screen 05's row consents to (ADR-047). */
  visitTracking: boolean;
  /** When the user last decided, ISO-8601. What makes the consent demonstrable on device. */
  decidedAt: string;
};

/**
 * Reads a stored value strictly. Anything the app cannot understand — a truncated write, a
 * hand-edited value, a shape from another version — is **no consent**, never a yes.
 */
function parseConsent(raw: string | null): PrivacyConsent | null {
  if (raw === null) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    // The one swallowed error in this app, and deliberately so: the alternative is a crash
    // whose whole content is a preference the app can simply ask for again. What it must
    // never do is read unreadable data as a consent — it falls through to `null`, and the
    // screens then show an unanswered consent rather than a given one.
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const { visitTracking, decidedAt } = parsed as Record<string, unknown>;

  if (typeof visitTracking !== 'boolean') {
    return null;
  }

  if (typeof decidedAt !== 'string' || decidedAt === '') {
    return null;
  }

  return { visitTracking, decidedAt };
}

/**
 * What the user has agreed to, or `null` when they have never decided.
 *
 * A record from the previous shape is cleared on the way through: every screen that changes
 * a consent reads it first (through `usePrivacyConsent`), so this is the one place the
 * leftover is met, and removing it is a deletion of data the app cannot show — not a write
 * that makes a decision for anyone.
 */
export async function readPrivacyConsent(): Promise<PrivacyConsent | null> {
  const raw = await AsyncStorage.getItem(CONSENT_STORAGE_KEY);

  if (raw === null) {
    await AsyncStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);
    return null;
  }

  return parseConsent(raw);
}

/**
 * Records a decision and hands back what was stored, so a caller never has to guess the
 * timestamp. A write that fails rejects: the caller has to know that nothing was kept.
 */
export async function recordPrivacyConsent(
  visitTracking: boolean,
  decidedAt: Date = new Date(),
): Promise<PrivacyConsent> {
  const consent: PrivacyConsent = { visitTracking, decidedAt: decidedAt.toISOString() };

  await AsyncStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  await AsyncStorage.removeItem(LEGACY_CONSENT_STORAGE_KEY);

  return consent;
}

/** Deletes the record: the user's way out, and what signing out calls. */
export async function clearPrivacyConsent(): Promise<void> {
  await AsyncStorage.removeItem(CONSENT_STORAGE_KEY);
}
