/**
 * What the settings screen's account row derives from a session, as pure functions.
 *
 * Frame 14 draws that row with the design's own example on it — “AK”, “Aino Korhonen”,
 * “aino@example.fi · Email verified” — and the app has the account the session is about instead
 * (ADR-029): its identifier and the name screen 03 collected. So the row works out what it shows
 * rather than being told it:
 *
 * - the initials the avatar shows, because the session holds a name rather than a monogram;
 * - which of the frame's two words the line uses — “Email verified” or “Phone verified” — because
 *   the app must not print the wrong one over an identifier. That half is **not here**: the rule
 *   lives in the shared pure helpers as `identifierKind` (`src/utils/identifier.ts`), where the
 *   account surface reads it (ADR-049 §4).
 *
 * Neither is validation. The app never decides whether an identifier is usable — screen 03
 * collects it and the provider accepts or refuses it (CONTEXT.md, **Credential**) — and a rule
 * that guessed would be a client-side check pretending to be an answer.
 */

/** How many letters an avatar shows; the frame draws two. */
const INITIALS = 2;

/**
 * The letters to paint in the account's avatar: the first letter of the name's first two words.
 *
 * A name is `Capitalised Words` in both shipped languages, so the first letters are the
 * monogram; a one-word name gets one letter rather than a made-up second.
 */
export function profileInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '')
    .slice(0, INITIALS)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}
