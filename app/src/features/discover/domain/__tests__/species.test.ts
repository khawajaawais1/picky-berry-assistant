import { SPECIES, isSpecies } from '../species';

/**
 * The app's species vocabulary is the pilot's, not one frame's: the team's four species codes
 * are bilberry, lingonberry, cloudberry and crowberry (`CONTEXT.md` §7 at the repository root),
 * while the Figma frame draws three chips. The fourth is appended rather than inserted, so the
 * order the design draws its three chips in survives.
 */
describe('the app’s species vocabulary', () => {
  it('names the pilot’s four species, keeping the design’s three in their order', () => {
    expect(SPECIES).toEqual(['lingonberry', 'bilberry', 'cloudberry', 'crowberry']);
  });

  it('accepts only the app’s own species from a value the app did not build', () => {
    // The route's query string is external input (SECURITY.md §4): a species the chips cannot
    // name must fall back to the pilot berry rather than reaching a cache key of its own.
    expect(isSpecies('bilberry')).toBe(true);
    expect(isSpecies('blueberry')).toBe(false);
    expect(isSpecies(['bilberry'])).toBe(false);
    expect(isSpecies(undefined)).toBe(false);
    expect(isSpecies('')).toBe(false);
  });
});
