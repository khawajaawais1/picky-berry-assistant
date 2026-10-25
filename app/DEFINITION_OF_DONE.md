# DEFINITION_OF_DONE.md

A feature, fix or refactor is **not** complete until the applicable items below
are satisfied. "Applicable" is a judgement you must state; an unchecked item needs
a written reason, not silence.

Last updated: 2026-10-08 (EU privacy and accessibility added as standing
requirements; see AGENTS.md §11).

## Functionality

- [ ] The requirement is implemented as specified (and the requirement is written
      down in `PROJECT.md`, not only in a chat).
- [ ] Happy path works.
- [ ] Edge cases handled: empty, single item, maximum size, malformed input,
      repeated/concurrent action.
- [ ] Loading state handled.
- [ ] Empty state handled.
- [ ] Error state handled: failure visible to the user, actionable, never a raw
      stack trace or an infinite spinner.
- [ ] Offline behaviour considered for anything that writes data (queued,
      retried, or explicitly refused — never silently lost).
- [ ] Accessibility (AGENTS.md §11.2): every interactive element has a role, an
      accessible name and a correct disabled/busy/checked state; an action that
      cannot act claims no role; tap targets are at least `layout.minTouchTarget`;
      text survives the largest system font scale; colour comes from the tokens and
      every pair the screen paints has a contrast case in
      `src/constants/__tests__/contrast.test.ts`.
- [ ] Accessibility contract asserted in tests (role, name, state) — the evidence
      for the item above, not just a claim. Every built screen's controls are also walked
      in the export the app ships (`npm run test:layout`, `e2e/a11y-tree.ts`), which fails a
      screen whose controls lack a role, lack an accessible name, or declare a state the
      browser's tree does not show — the screen is covered by that walk as soon as its route
      exists, so nothing here needs adding per screen.
- [ ] The screen was checked in **every shipped language**, because Finnish is longer
      than English (ADR-017), and at **the largest system text size** (ADR-019) —
      `npm run test:layout` measures both in CI — and in the scheme the design defines.
- [ ] GDPR (AGENTS.md §11.1): any new personal data has a recorded lawful basis and
      purpose, the minimum collection, and an answer for who may read it, how the user
      gets a copy, corrects it and deletes it. Consent, if used, is an affirmative
      action — never pre-ticked.

## Architecture

- [ ] Code sits in the correct layer and feature (`ARCHITECTURE.md` §3).
- [ ] Atomic Design respected; no business logic in a component.
- [ ] Cross-feature access goes through the other feature's `index.ts`.
- [ ] Shared code does not import from `features/**`.
- [ ] No unnecessary coupling and no speculative abstraction.
- [ ] New significant decision recorded as an ADR.

## TDD

- [ ] Tests written before or with the implementation (see TESTING.md §1).
- [ ] Unit tests for domain rules, validation and helpers.
- [ ] Component tests for new/changed UI behaviour.
- [ ] Integration test through the feature's public API where wiring is involved.
- [ ] Security-relevant paths have an explicit rejection test.
- [ ] Tests were observed failing before the implementation (or the exception is
      stated in the report).
- [ ] E2E for critical flows once E2E infrastructure exists; otherwise said so.

## Security

- [ ] Authentication impact reviewed.
- [ ] Authorization reviewed — object-level ownership enforced **server-side** for
      every new resource, with proof in the form of a test or a documented plan.
- [ ] Input validation reviewed at every trust boundary (API responses, deep
      links, push payloads, user input, files).
- [ ] No client-side check is relied on for a security decision.
- [ ] Rate limiting / abuse impact reviewed for new endpoints and write paths.
- [ ] Secrets reviewed: nothing secret in the client, in the repo, in `.env.example`,
      in logs or in error messages; `EXPO_PUBLIC_*` used only for public values.
- [ ] File handling reviewed (size, type, extension, generated names, metadata).
- [ ] Privacy reviewed: minimum collection, server-enforced visibility, no
      location or personal data in logs/analytics/errors.
- [ ] Logging reviewed: no tokens, credentials, coordinates or personal data.
- [ ] Any remaining risk is reported explicitly (never hidden).

## Quality gates

- [ ] `npm run verify` passes — the whole gate in one command: the formatting check, then the
      typecheck, the lint and the tests (ADR-023). The four checks below are what it runs.
- [ ] `npm run lint` passes with no new warnings or errors.
- [ ] `npm run format:check` passes.
- [ ] `npm test` passes; no test skipped, disabled or weakened.
- [ ] `npm run doctor` (expo-doctor) reports no new issue.
- [ ] No `console.log`, debug flag, temporary bypass or commented-out code.
- [ ] No secrets, credentials, private keys or `.env` file committed.
- [ ] The app still starts (`npm start`) and the touched screen renders.
- [ ] Documentation updated where material (see AGENTS.md §6).

## Reporting

- [ ] The response follows the `Implemented / Tests / Security / Architecture /
      Documentation / Remaining Issues` format.
- [ ] Every check reported as passing was executed in this session; anything not
      run is reported as not run.
- [ ] Known limitations and follow-up work are listed.

## Anti-patterns that make "done" false

- Claiming a feature is complete because the code compiles.
- Claiming tests pass without running them, or reporting a filtered command's exit
  code without inspecting its output.
- Removing or skipping a test to get a green run.
- Using `any`, `@ts-ignore`, `eslint-disable` or a coverage exclusion to silence a
  real problem (a justified suppression with a comment is acceptable; a silent one
  is not).
- Leaving the repository in a state where another engineer cannot reproduce the
  result from `README.md`.
