# ADR-027 — One stand-in verification code, and it does not exist in a production build

- **Status:** Accepted
- **Date:** 2026-10-10
- **Amended 2026-10-10:** the rule moved from `features/onboarding/domain/verification.ts` to
  `src/services/session/stand-in-code.ts` (`STUB_CODE`, `verifyCode`, `CodeVerdict`), because a
  second caller now asks the same question: the session port uses it to decide whether a code may
  produce a session (ADR-028). The decision below is unchanged — one code, refused in a
  production build — and the cases that hold it moved with it, to
  `src/services/session/__tests__/stand-in-code.test.ts`.
- **Deciders:** Project owner (asked for `000000` as the test code until the APIs exist); the gate below is this repository's

## Context

Frame 04 (`5:22840`) is the one screen in the flow that asks the server a question — “is this code
the one we sent?” — and there is no server: ADR-013 decides Firebase Authentication and PROJECT.md's
open question 12 is still open on whether the app talks to Firebase directly or through our own
backend. The screen was therefore built with its verify action unwired, and the flow could not be
walked past it: every screen behind it (frame 05's location consent and the whole app shell) was
reachable only by typing a URL.

The owner asked (2026-10-10) for the code `000000` to be accepted “for testing until all APIs are
done”. That is a reasonable testing affordance and a dangerous one: **the client is untrusted**
(SECURITY.md §4), a code that lets someone in is exactly what an authentication bypass looks like,
and a shipped build that accepted six zeroes would be one — with nothing in this repository able to
notice, because the app has no device tests.

`EXPO_PUBLIC_APP_ENV` already exists for this kind of thing: it is the build's declared environment
(`development`, `preview`, `production`), it is validated in `src/config/env.ts`, and
`.env.example` documents it. What it lacked was an accessor for code that needs that one answer.

## Decision

1. **The acceptance is one pure rule**, `verifyCode(code, environment)` — in
   `src/services/session/stand-in-code.ts` since the amendment above. Outside a production build it accepts exactly
   `STUB_CODE` (`'000000'`) and refuses every other code — a near miss is not a way in, and a wrong
   code is a state the screen can be tested against. In a production build it refuses
   **everything**, including the stand-in.
2. **The environment is read through `appEnvironment()`** in `src/config/env.ts`, the only module
   allowed to read `EXPO_PUBLIC_*` values (AGENTS.md §5). An unset value is `development`, which is
   what a local run is; a value that is not one of the three answers `production`, so a typo in a
   build's configuration cannot become a door (`loadConfig` still reports the misconfiguration).
3. **A production build offers no verification at all.** There is nothing that can check a code
   there, so the screen's action is disabled rather than standing in for an answer nobody gave
   (AGENTS.md §11.2).
4. **A refused code says so.** The screen draws a `danger`-coloured line under the action, written
   app-side like the other screens' `saveFailed` lines, and clears it when the code is edited. The
   design draws no failure state; its own error treatment remains open question 11.
5. **An accepted code leads to screen 05** (`/location-consent`) and drops the pending sign-up record
   the flow was holding (`forgetVerificationRequest`).
6. **The rule is a stand-in, not a mode.** It is one code, it is not user-toggleable, it stores,
   logs and sends nothing, and it is documented where a tester will find it: the function's own
   comment, `PROJECT.md` (known issue 24) and `.env.example`. When the account service lands,
   `STUB_CODE` and `verifyCode` are deleted and the answer comes from the server with the rest of
   the flow.

## Alternatives considered

- **Accept any six digits.** Walkable, and worse: the screen would then accept typos, there would be
  no failure state to test, and “anything works” cannot be told apart from a real check.
- **Gate on `__DEV__`.** True only under Metro, so the exported web build — which is how the owner
  reviews the app and how the layout harness measures every screen — would have the stand-in off,
  making it useless exactly where it is wanted.
- **A hidden debug affordance** (a long press, a query parameter, a developer screen). A runtime
  switch that can be left on in a build that forgot it, and one more affordance nobody designed.
- **A real test account, or a mocked account service.** Needs the very service that does not exist
  yet (open question 12); the reason this stand-in exists is that the decision is still open.
- **Accept the code in every build, “just for now”.** Rejected outright: that is an authentication
  bypass shipped to users, with no test in this repository able to catch it.

## Consequences

- The flow past frame 04 can be walked today, in both languages: typing `000000` on
  `/verify-email` and pressing the action opens `/location-consent` (verified in the browser on the
  exported build).
- A build made with `EXPO_PUBLIC_APP_ENV=production` accepts no code and disables the action. The
  way back in for a real user is the missing sign-in screen (PROJECT.md, known issue 23), which is
  an owner decision rather than a side effect of this one.
- **The gate was wrong for a day, and the way it was wrong is worth keeping.** The first
  implementation read the variable through the name it stores
  (`process.env[PUBLIC_ENV_VARS.appEnvironment]`), and Expo substitutes a value only for a
  *literal* `process.env.EXPO_PUBLIC_<NAME>` read — so nothing was substituted, the read came back
  unset in every bundle, and `appEnvironment()` answered `development` in a production build, which
  accepted `000000` (found by building one, not by reading the source). Jest cannot see this:
  Node's `process.env` is a real object, so the unit tests passed either way. `declaredPublicEnv`
  in `src/config/env.ts` now reads in the literal shape, ARCHITECTURE.md §3.5 records the
  requirement for any future read, and `e2e/production-export.spec.ts` holds both of this ADR's
  promises in a real `EXPO_PUBLIC_APP_ENV=production` export.
- The `danger` failure line is copy the design does not draw, added knowingly: a press that cannot
  be honoured must not be silent (AGENTS.md §2.3). Its contrast pair was already asserted
  (`src/constants/__tests__/contrast.test.ts`), and the line's Finnish wording was measured with the
  rest of the screen's copy by the layout harness in both languages at both text sizes (ADR-018/019).
- `verifyCode` is deliberately **not** exported from the feature's public API: only the screen asks
  the question, and the seam that matters later is the account service, not this rule.
- When the API arrives: delete the stand-in, wire the screen to the service, remove the
  `.env.example` note and update PROJECT.md's known issue 24 and open question 12 together. Until
  then this ADR is what a later reader needs to see why a credential-accepting constant is in the
  repository at all.
