import { STUB_CODE, verifyCode } from '../stand-in-code';

/**
 * The stand-in code, where it now lives: one rule the screen and the session port both ask, and
 * the only thing standing between a typed six digits and a session while the account service does
 * not exist (ADR-027).
 *
 * These are the cases that used to sit with screen 04's rules. They moved with the rule rather
 * than being rewritten, because what they pin did not change: one code, no near miss, and nothing
 * at all in a production build.
 */
describe('verifyCode', () => {
  it('accepts the stand-in code while no account service can check one', () => {
    // The app has no account service, so nothing can tell a real code from a wrong one;
    // the flow past screen 04 is walked with this one code until the API exists.
    expect(verifyCode(STUB_CODE, 'development')).toBe('accepted');
    expect(verifyCode(STUB_CODE, 'preview')).toBe('accepted');
  });

  it('refuses every other code, so a near miss is not a way in', () => {
    expect(verifyCode('000001', 'development')).toBe('rejected');
    expect(verifyCode('482169', 'development')).toBe('rejected');
    expect(verifyCode('', 'development')).toBe('rejected');
  });

  it('accepts nothing at all in a production build', () => {
    // A shipped build has no account service either, and a stand-in answer must never be
    // what lets someone in: this is the whole security value of the rule.
    expect(verifyCode(STUB_CODE, 'production')).toBe('rejected');
    expect(verifyCode('482169', 'production')).toBe('rejected');
  });
});
