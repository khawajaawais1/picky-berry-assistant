import type { ConfigResult } from '@/config/env';

import { passwordResetAvailability } from '../password-reset';

/**
 * The one question the route asks before it wires the reset screen (ADR-065 decision 4,
 * amended): the team API's account service takes reset requests, so a build that can reach it
 * offers one. Its mail is not delivered yet, so the screen claims an accepted request, never a
 * sent email.
 */
const CONFIGURED: ConfigResult = {
  ok: true,
  config: { environment: 'production', apiBaseUrl: 'https://api.example.test' },
};
const UNUSABLE: ConfigResult = {
  ok: false,
  problems: [{ variable: 'EXPO_PUBLIC_API_BASE_URL', reason: 'missing' }],
};

describe('passwordResetAvailability', () => {
  it('offers a reset, as an accepted request, in a build that can reach the account service', () => {
    expect(passwordResetAvailability(CONFIGURED)).toBe('accepted');
  });

  it('offers none in a build whose API configuration is unusable', () => {
    expect(passwordResetAvailability(UNUSABLE)).toBe('unavailable');
  });
});
