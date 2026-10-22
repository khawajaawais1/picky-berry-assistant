import { translate } from '../index';

describe('translate', () => {
  it('returns the source string for the source language', () => {
    expect(translate('en', 'onboarding.welcome.action')).toBe('Get started');
  });

  it('returns the Finnish string in Finnish', () => {
    expect(translate('fi', 'onboarding.welcome.action')).toBe('Aloita');
    expect(translate('fi', 'onboarding.createAccount.action')).toBe('Luo tili');
  });

  it('never returns an empty string', () => {
    expect(translate('fi', 'onboarding.createAccount.consent').length).toBeGreaterThan(10);
  });
});
