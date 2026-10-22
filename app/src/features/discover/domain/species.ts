/**
 * The species a zone can be reported for, as identifiers rather than words: the frame's
 * chips read “Lingonberry”, “Bilberry” and “Cloudberry” in English and “Puolukka”,
 * “Mustikka” and “Lakka” in Finnish, and the two words are the catalogue's
 * (`discover.species.*`), never this list's. `components/species-copy.ts` is the one place
 * that joins the two.
 *
 * The order is the frame's (node 5:22959, the three chips left to right), because a set is
 * drawn in the order it was written and a reordering would silently move a chip on screen.
 */
export const SPECIES = ['lingonberry', 'bilberry', 'cloudberry'] as const;

export type Species = (typeof SPECIES)[number];
