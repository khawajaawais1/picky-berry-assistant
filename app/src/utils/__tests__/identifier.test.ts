import { identifierKind } from '../identifier';

/**
 * The one rule that says which of the two identifiers an account is reached by.
 *
 * Screen 03 offers both — an address and a number — and two places need the same answer about
 * what was typed: the account row on frame 14, which prints “Email verified” or “Phone verified”
 * and must not print the wrong one over an identifier, and screen 04's copy, which follows the
 * destination the code belongs to (ADR-049 §3.1–§3.2). It is not a validation: whether an
 * identifier is one the account service will accept is the provider's answer, not a client check
 * (CONTEXT.md, **Credential**).
 */
describe('which of the two identifiers a string is', () => {
  it('is an address when it carries an @', () => {
    expect(identifierKind('aino@example.fi')).toBe('email');
    expect(identifierKind('  aino@example.fi  ')).toBe('email');
  });

  it('is a number for anything else screen 03 or the sign-in screen collected', () => {
    expect(identifierKind('+358 40 123 4567')).toBe('phone');
    expect(identifierKind('0401234567')).toBe('phone');
  });

  it('reads an empty string as neither, and still answers', () => {
    // A floor rather than a state: the flow refuses an empty identifier before a screen is asked
    // about one (screen 03's form, the sign-in screen's action), so nothing renders this. The rule
    // still answers, because a caller that had to check for emptiness first would be reading the
    // same string twice.
    expect(identifierKind('')).toBe('phone');
  });
});
