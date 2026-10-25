# ADR-023 — The local gate runs the formatting check too

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Agent session, recorded as the owner's request

## Context

ADR-008 item 5 made `npm run verify` the one command for the gate — typecheck + lint + test — and
left the formatting check to a separate step in CI. Two documents then described the same thing
differently, and the difference was invisible:

- CONTRIBUTING.md tells a contributor to run `npm run verify` before **every commit**;
- the command it names did not check formatting, while Prettier is the repository's formatter and
  `format:check` was a gate — just a gate that lived only in `.github/workflows/mobile-ci.yml`.

So a contributor could run exactly what the repository asked for, see it pass, and commit files
Prettier would rewrite. The commit went to review (or to `main`, or nowhere, if no branch was
pushed) carrying a claim that it had been verified while the tree was not Prettier-clean. The
failure is also the cheapest kind to fix and the one an author is best placed to fix: a file that
needs formatting is named in two seconds, before the typecheck and the suite have even started.

## Decision

1. **`npm run verify` = `format:check` + `typecheck` + `lint` + `test`.** The formatting check is
   **first** in the chain: it is the cheapest gate, and it should name an unformatted file before
   the slow gates run. One command is once again the whole gate its documentation claims.
2. **CI keeps its individual steps.** The workflow's verify job names each check, so a failure is
   legible in the UI, and it runs `npm test -- --ci`, which the local gate deliberately does not
   (`--ci` is Jest's CI mode; a chain of npm scripts does not forward it to Jest, and passing it
   through `npm run verify -- --ci` would set an npm config variable instead of reaching Jest).
3. **A test keeps the two lists equal.**
   `src/config/__tests__/verify-gate.test.ts` reads `package.json` and the workflow and fails when
   either stops running one of the four checks. Duplicated lists drift; this one cannot do it
   silently any more.
4. **Pre-commit hooks stay deferred** (ADR-008 item 6 is unchanged). Nothing runs on commit in
   this repository, and this ADR does not change that — it changes what the command a contributor
   is told to run *means*.

## Alternatives considered

- **Leave `verify` as it was and instruct contributors to run `format:check` too.** Rejected: that
  is a two-command gate, which is what the single-command gate exists to avoid, and the second
  command is exactly the one people skip.
- **Add Husky + lint-staged so the commit cannot be made at all.** Still deferred (ADR-008 item 6):
  it enforces the same rule, but with install-time machinery in every clone and a slower commit,
  and it can be bypassed with `--no-verify`, which CONTRIBUTING.md forbids anyway. Revisit if a
  formatting-only commit reaches review again.
- **Make CI run `npm run verify` instead of its own steps.** Rejected: the workflow needs `--ci` for
  Jest, and moving the gate behind one opaque step would make a red job say “verify failed” rather
  than which check failed.
- **Format on write (`npm run format`) instead of checking.** Rejected: it rewrites whatever it
  touches, including files a given change did not intend to modify, which is how a diff gains
  unrelated churn (CONTRIBUTING.md forbids exactly that).
- **Drop the formatting check altogether.** Rejected: Prettier's value is that nobody argues about
  formatting; a gate nobody runs locally turns it back into a CI-only opinion.

## Consequences

- A contributor who runs one command now runs the whole gate, and the failure it produces first is
  the one with the smallest fix: `npm run format`.
- The gate is slower by Prettier's run over the repository (a few seconds) — accepted, and paid
  before the expensive gates rather than after them.
- **The formatting check now covers the files the author is working on, not just the commit.** A
  tree with an unformatted file anywhere fails the gate, even when that file is unrelated to the
  change — the same scope CI already had, so the two agree.
- `docs/*.md` remain outside Prettier (`.prettierignore` keeps prose under human review, ADR-008),
  so documentation is not reformatted by the gate.
- The gate's contents are now asserted rather than described: removing a check from either list
  fails `npm test`. That is a test of the repository's tooling, not of the app, which is why it
  lives in `src/config/__tests__` — and because it runs inside `npm run verify`, the guard cannot
  be skipped without failing the gate it describes.

## Related

- ADR-008 (item 5 amended here; items 2, 3, 6 unchanged), CONTRIBUTING.md, TESTING.md,
  DEFINITION_OF_DONE.md, `.github/workflows/mobile-ci.yml`,
  `src/config/__tests__/verify-gate.test.ts`
