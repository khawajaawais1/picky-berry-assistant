import { SPECIES } from '../species';

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
});
