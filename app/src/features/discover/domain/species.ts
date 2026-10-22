/**
 * The species a zone can be reported for, as identifiers rather than words: the frame's
 * chips read “Lingonberry”, “Bilberry” and “Cloudberry” in English and “Puolukka”,
 * “Mustikka” and “Lakka” in Finnish, and the two words are the catalogue's
 * (`report.species.*`), never this list's. `components/species-copy.ts` is the one place
 * that joins the two.
 *
 * The first three are the frame's (node 5:22959, the chips left to right); `crowberry` is the
 * pilot's fourth species code (`CONTEXT.md` §7 at the repository root) and is appended rather
 * than inserted, so the order the design draws its three chips in is unchanged. A set is drawn
 * in the order it was written, and a reordering would silently move a chip on screen.
 */
export const SPECIES = ['lingonberry', 'bilberry', 'cloudberry', 'crowberry'] as const;

export type Species = (typeof SPECIES)[number];
