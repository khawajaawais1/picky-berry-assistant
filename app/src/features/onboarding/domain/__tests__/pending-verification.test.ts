import {
  forgetVerificationRequest,
  peekVerificationRequest,
  rememberSignInRequest,
  rememberVerificationRequest,
} from '../pending-verification';

/**
 * The hand-off between screens 03 and 04: which address the code was just sent to, and the
 * name the account is being created with.
 *
 * It is deliberately *not* a route parameter: an address in the navigation state ends up
 * in the URL of the web target and in whatever a share or a history keeps. A module in
 * the feature keeps it in memory for the flow, and the API will replace it with what the
 * code request actually returns (see PROJECT.md).
 *
 * The name travels with the address because it belongs to the account the code is about:
 * the session screen 04 receives carries it, and the settings screen draws it back as whose
 * settings these are (ADR-029).
 *
 * What the request also carries is **which journey asked for the code** (ADR-034). A returning
 * user signs in with the same code screen a sign-up uses — that is the reading the design owner
 * chose — so the screen behind this record has to know whether the account being reached is the
 * one screen 03 just created or one that already exists. The two differ in what they carry and
 * where they lead: a sign-up has the name it collected and goes on to screen 05, a sign-in has
 * no name at all (the account service would have it, and does not exist yet) and goes into the
 * app.
 */
const NAME = 'Aino Korhonen';

beforeEach(() => {
  forgetVerificationRequest();
});

describe('the pending verification request', () => {
  it('is absent before anyone has signed up', () => {
    expect(peekVerificationRequest()).toBeNull();
  });

  it('remembers the destination the code is for, and the name it is about', () => {
    rememberVerificationRequest('aino@example.fi', NAME);

    expect(peekVerificationRequest()).toEqual({
      destination: 'aino@example.fi',
      displayName: NAME,
      purpose: 'sign-up',
    });
  });

  it('trims what it is given, so the copy names the address and not the whitespace', () => {
    rememberVerificationRequest('  aino@example.fi  ', `  ${NAME}  `);

    expect(peekVerificationRequest()).toEqual({
      destination: 'aino@example.fi',
      displayName: NAME,
      purpose: 'sign-up',
    });
  });

  it('remembers a returning user’s address, and no name, because none was collected', () => {
    // Reading A of the sign-in screen: one identifier field, then the code screen the sign-up
    // already walks. There is no name on this path — the account's own name is the service's
    // answer, and no service exists — so the request carries none rather than inventing one.
    rememberSignInRequest('  aino@example.fi  ');

    expect(peekVerificationRequest()).toEqual({
      destination: 'aino@example.fi',
      displayName: null,
      purpose: 'sign-in',
    });
  });

  it('has nothing to remember when a sign-in names no address', () => {
    rememberSignInRequest('   ');

    expect(peekVerificationRequest()).toBeNull();
  });

  it('has nothing to remember when the address is empty', () => {
    // The form already refuses this; a blank line on screen 04 would be worse than the
    // frame's example address, so an empty value is treated as no request at all.
    rememberVerificationRequest('   ', NAME);

    expect(peekVerificationRequest()).toBeNull();
  });

  it('has nothing to remember when the account would have no name', () => {
    // A session is about an account with a name it can be shown under (ADR-029), and the form
    // refuses this too: a request that cannot produce one is not a request.
    rememberVerificationRequest('aino@example.fi', '   ');

    expect(peekVerificationRequest()).toBeNull();
  });

  it('keeps only the latest request, so a second sign-up cannot read the first one', () => {
    rememberVerificationRequest('aino@example.fi', NAME);
    rememberVerificationRequest('+358401234567', 'Matti Laine');

    expect(peekVerificationRequest()).toEqual({
      destination: '+358401234567',
      displayName: 'Matti Laine',
      purpose: 'sign-up',
    });
  });

  it('lets a sign-in replace a sign-up in flight, so the code screen answers the newer ask', () => {
    rememberVerificationRequest('aino@example.fi', NAME);
    rememberSignInRequest('matti@example.fi');

    expect(peekVerificationRequest()).toEqual({
      destination: 'matti@example.fi',
      displayName: null,
      purpose: 'sign-in',
    });
  });

  it('forgets on request, once the code has been verified', () => {
    rememberVerificationRequest('aino@example.fi', NAME);

    forgetVerificationRequest();

    expect(peekVerificationRequest()).toBeNull();
  });

  it('does not share the stored object with its caller', () => {
    rememberVerificationRequest('aino@example.fi', NAME);

    const request = peekVerificationRequest();
    expect(request).not.toBeNull();

    // Handing out the stored object would let a caller edit what the next screen reads.
    if (request) {
      request.destination = 'someone@example.fi';
      request.displayName = 'Someone Else';
    }

    expect(peekVerificationRequest()).toEqual({
      destination: 'aino@example.fi',
      displayName: NAME,
      purpose: 'sign-up',
    });
  });
});
