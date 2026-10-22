import { EMPTY_LOCATION_CONSENT, canContinue } from '../location-consent';

/**
 * Screen 05's rule. The frame draws its consent row ticked; the app ships it unchecked and
 * asks the user first, because a consent given by the design's drawn state is not a consent
 * the user gave (AGENTS.md §11.1).
 *
 * What the row consents to is visit tracking while the app is open — the app's own limit, since
 * background capture is an owner decision that has not been taken (ADR-047).
 */
describe('location consent', () => {
  it('starts without the consent, so the user has to give it', () => {
    expect(EMPTY_LOCATION_CONSENT.visitTracking).toBe(false);
  });

  it('does not let the screen continue before the consent has been given', () => {
    expect(canContinue(EMPTY_LOCATION_CONSENT)).toBe(false);
    expect(canContinue({ visitTracking: false })).toBe(false);
  });

  it('lets the screen continue once the user has consented to visit tracking', () => {
    expect(canContinue({ visitTracking: true })).toBe(true);
  });

  it('takes the consent back when the user withdraws it', () => {
    // The row is a decision, not a one-way switch: unticking it takes the screen back to
    // where it started, including the action's state.
    expect(canContinue({ visitTracking: false })).toBe(false);
  });
});
