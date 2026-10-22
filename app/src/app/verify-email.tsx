import { router } from 'expo-router';

import {
  EXAMPLE_EMAIL,
  EXAMPLE_NAME,
  OnboardingVerificationScreen,
  forgetVerificationRequest,
  peekVerificationRequest,
} from '@/features/onboarding';
import { sessionPort } from '@/services/session';
import { identifierKind } from '@/utils/identifier';

/**
 * Screen 04 · Onboarding · Verification (Figma node 5:22840).
 *
 * A route only wires a screen to a feature's public API. The destination the code is for
 * comes from the sign-up that just happened, held inside the feature rather than in the
 * route: a route parameter is a URL on the web target, and an address does not belong in
 * a history (see `pending-verification.ts`). A cold start on this route — a reload, a deep
 * link — has no sign-up behind it, so the screen names the design's example address, exactly
 * as screen 03 shows the frame's example values as placeholders.
 *
 * **Which identifier that is** is read here, from the destination the flow holds, and handed to
 * the screen as `destinationKind`: the frame draws one state and the flow has two, so the screen's
 * title and its action back to the field follow it (ADR-049 §3, assumed 2026-10-13; the rule itself
 * is `identifierKind`, shared with the account row that needed it first — ADR-049 §4).
 *
 * The **name** is handed over with the code, because it is the account's own name and the
 * session carries it (ADR-029). A cold start has none either, so the frame's example name takes
 * its place — the same fallback the address gets, and for the same reason: there is no sign-up
 * here to have collected one.
 *
 * The screen hands the completed code up rather than judging it, and this is where it is
 * answered: the code and the address go to the **session port**, which exchanges them for a
 * session or refuses them (`src/services/session/`). Today that port is behind a stand-in that
 * accepts one code and refuses everything in a production build (ADR-027); when the account
 * service exists, the same call goes to it and this route does not change.
 *
 * A refused credential is reported by the screen, so nothing here moves the flow on for one. A
 * session the app could not keep rejects, which is not a success either: the screen says so and
 * the user stays on this step rather than arriving signed out on the next one.
 *
 * **This screen serves two journeys** (ADR-034): a sign-up, which continues to screen 05, and a
 * sign-in, which ends inside the app. What differs between them is what the pending request
 * carries — a sign-up has the name screen 03 collected, a sign-in has none, because a returning
 * account's name is the account service's answer (ADR-038) — and where the route sends the user
 * once the session exists.
 */
export default function VerifyEmailRoute() {
  const request = peekVerificationRequest();
  // Screen 04 draws one state and this flow has two identifiers, so the route hands the screen the
  // kind of destination it is holding — the fact the copy follows (ADR-049 §3). A cold start has no
  // sign-up behind it, so it falls back to the frame's example address and the state that names it.
  const destination = request?.destination ?? EXAMPLE_EMAIL;

  return (
    <OnboardingVerificationScreen
      destination={destination}
      destinationKind={identifierKind(destination)}
      onBack={() => router.back()}
      onChangeDestination={() => router.back()}
      onSubmitCode={async (code) => {
        const result = await sessionPort.signIn({
          code,
          // A sign-up offers the name it collected; a sign-in offers none, and the session
          // records that the app has no name for the account rather than borrowing one. A cold
          // start — this route opened on its own — has no journey behind it either, so it keeps
          // the frame's example name.
          ...(request === null
            ? { displayName: EXAMPLE_NAME }
            : request.displayName === null
              ? {}
              : { displayName: request.displayName }),
          identifier: request?.destination ?? EXAMPLE_EMAIL,
        });

        if (!result.ok) {
          return false;
        }

        // The journey this code belongs to is over, so what it remembered of it goes too —
        // and the session it produced is what the app is now holding. A sign-in lands in the
        // app: screen 05 asks for a consent a returning user has already given or refused, and
        // it belongs to signing up (ADR-034).
        const returning = request?.purpose === 'sign-in';
        forgetVerificationRequest();
        router.push(returning ? '/discover' : '/location-consent');

        return true;
      }}
    />
  );
}
