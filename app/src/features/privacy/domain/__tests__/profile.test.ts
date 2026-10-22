import { profileInitials } from '../profile';

/**
 * The monogram the account row derives, which is the app's own rather than the design's: frame 14
 * draws an avatar with “AK” over “Aino Korhonen”, and the design's profile is a composed example.
 * What the app has is the account the session is about (ADR-029), so the row derives what it shows
 * instead of inventing it.
 *
 * The row's other derivation — which of the frame's two words the verification line uses — is not
 * here: `identifierKind` is shared with screen 04, whose copy follows the destination, so it lives
 * in `src/utils/identifier.ts` with its own test (ADR-049 §4).
 */
describe('the initials an avatar shows', () => {
  it('takes the first letter of the first two words', () => {
    expect(profileInitials('Aino Korhonen')).toBe('AK');
    expect(profileInitials('Aino Maria Korhonen')).toBe('AM');
  });

  it('writes them the way a name is written', () => {
    expect(profileInitials('aino korhonen')).toBe('AK');
    expect(profileInitials('Äino Öljynen')).toBe('ÄÖ');
  });

  it('ignores the whitespace around and between the words', () => {
    expect(profileInitials('  Aino   Korhonen  ')).toBe('AK');
  });

  it('shows one letter for a name that is one word', () => {
    expect(profileInitials('Aino')).toBe('A');
  });

  it('has nothing to show for a name that is not one', () => {
    // A session cannot carry an empty name (the port refuses one), so this is a floor rather
    // than a state: an avatar with no initials is not a claim about anybody.
    expect(profileInitials('   ')).toBe('');
  });
});
