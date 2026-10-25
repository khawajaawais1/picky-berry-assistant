import { createFirebasePasswordResetRequest, type FirebaseFetch } from '../firebase-password-reset';

/**
 * The real provider adapter, held at the boundary where it meets Firebase: the request it sends,
 * the answers it treats as success, and the two refusals the screen can report.
 *
 * No test reaches the network. The `fetch` it is given is the recorder, so the endpoint, body and
 * error handling are checked without sending an email to anyone.
 */
const KEY = 'firebase-web-key';
const EMAIL = 'aino@example.fi';

function response({
  body = {},
  ok = true,
  status = 200,
}: {
  body?: unknown;
  ok?: boolean;
  status?: number;
} = {}) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

function fetchReturning(answer: ReturnType<typeof response>) {
  return jest.fn<ReturnType<FirebaseFetch>, Parameters<FirebaseFetch>>(async () => answer);
}

describe('createFirebasePasswordResetRequest', () => {
  it('builds no request when no key is configured', () => {
    expect(createFirebasePasswordResetRequest({ apiKey: null })).toBeNull();
    expect(createFirebasePasswordResetRequest({ apiKey: '   ' })).toBeNull();
  });

  it('posts the address to Firebase’s sendOobCode endpoint with the public key', async () => {
    const fetchImpl = fetchReturning(response());

    const request = createFirebasePasswordResetRequest({ apiKey: KEY, fetchImpl });
    await request?.(`  ${EMAIL}  `);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'PASSWORD_RESET', email: EMAIL }),
      },
    );
  });

  it('accepts a request Firebase accepted', async () => {
    const request = createFirebasePasswordResetRequest({
      apiKey: KEY,
      fetchImpl: fetchReturning(response()),
    });

    expect(await request?.(EMAIL)).toEqual({ ok: true });
  });

  it('keeps the same answer when Firebase says the address has no account', async () => {
    // The screen must not be an account-existence oracle. Firebase's explicit EMAIL_NOT_FOUND
    // becomes the same accepted result a registered address gets.
    const request = createFirebasePasswordResetRequest({
      apiKey: KEY,
      fetchImpl: fetchReturning(
        response({
          body: { error: { message: 'EMAIL_NOT_FOUND' } },
          ok: false,
          status: 400,
        }),
      ),
    });

    expect(await request?.(EMAIL)).toEqual({ ok: true });
  });

  it.each(['INVALID_EMAIL', 'TOO_MANY_ATTEMPTS_TRY_LATER'])(
    'refuses the request when Firebase answers %s',
    async (message) => {
      const request = createFirebasePasswordResetRequest({
        apiKey: KEY,
        fetchImpl: fetchReturning(
          response({ body: { error: { message } }, ok: false, status: 400 }),
        ),
      });

      expect(await request?.(EMAIL)).toEqual({ ok: false, reason: 'refused' });
    },
  );

  it.each([
    [
      'a rejected key',
      response({ body: { error: { message: 'API_KEY_INVALID' } }, ok: false, status: 400 }),
    ],
    ['an unauthorised key', response({ ok: false, status: 401 })],
    ['a provider outage', response({ ok: false, status: 503 })],
  ])('reports %s as unavailable', async (_what, answer) => {
    const request = createFirebasePasswordResetRequest({
      apiKey: KEY,
      fetchImpl: fetchReturning(answer),
    });

    expect(await request?.(EMAIL)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('reports a network that never reached Firebase as unavailable', async () => {
    const fetchImpl = jest.fn<ReturnType<FirebaseFetch>, Parameters<FirebaseFetch>>(async () => {
      throw new Error('the network refused the request');
    });
    const request = createFirebasePasswordResetRequest({ apiKey: KEY, fetchImpl });

    expect(await request?.(EMAIL)).toEqual({ ok: false, reason: 'unavailable' });
  });

  it('still refuses an empty request without asking the network', async () => {
    const fetchImpl = fetchReturning(response());

    const request = createFirebasePasswordResetRequest({ apiKey: KEY, fetchImpl });

    await expect(request?.('   ')).rejects.toBeInstanceOf(RangeError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
