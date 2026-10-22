import {
  CODE_LENGTH,
  RESEND_COOLDOWN_SECONDS,
  formatCountdown,
  isCodeComplete,
} from '../verification';

/**
 * Screen 04's rules, as pure data: what a complete code is, how the frame's `00:28`
 * is written, and how long the resend action waits.
 *
 * Whether a code is one the app can **accept** is not tested here any more: that rule moved to
 * the session seam with the rest of the account service's stand-in, and its cases are in
 * `src/services/session/__tests__/stand-in-code.test.ts` (ADR-027).
 */
describe('a verification code', () => {
  it('is six digits, as the frame draws it', () => {
    expect(CODE_LENGTH).toBe(6);
  });

  it('is complete only when it is exactly those six digits', () => {
    expect(isCodeComplete('482169')).toBe(true);

    expect(isCodeComplete('')).toBe(false);
    expect(isCodeComplete('48216')).toBe(false);
    expect(isCodeComplete('4821690')).toBe(false);
  });

  it('is not complete when anything in it is not a digit', () => {
    // A code arrives by paste as often as by keyboard, so what a paste can carry has to
    // be rejected here rather than trusted: a space or a letter is not a digit.
    expect(isCodeComplete('482 16')).toBe(false);
    expect(isCodeComplete('48216a')).toBe(false);
    expect(isCodeComplete('１２３４５６')).toBe(false);
  });
});

describe('formatCountdown', () => {
  it('writes the frame’s minutes and seconds, at the value the frame draws', () => {
    expect(formatCountdown(28)).toBe('00:28');
  });

  it('pads both fields, so the label’s width does not jump', () => {
    expect(formatCountdown(9)).toBe('00:09');
    expect(formatCountdown(60)).toBe('01:00');
    expect(formatCountdown(600)).toBe('10:00');
  });

  it('never counts below zero', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});

describe('the resend cooldown', () => {
  it('is a whole number of seconds, so the label never shows a fraction', () => {
    // The frame draws a cooldown in progress (`available in 00:28`) and says nothing
    // about how long it is; 60 s is this app's choice and an owner question
    // (PROJECT.md). What is checked here is that it is a duration the countdown can
    // count: a positive whole number of seconds.
    expect(Number.isInteger(RESEND_COOLDOWN_SECONDS)).toBe(true);
    expect(RESEND_COOLDOWN_SECONDS).toBeGreaterThan(0);
  });
});
