/// <reference types="node" />
// Node's file APIs, for reading the four route files. `tsconfig.json` restricts the automatic type
// set to `jest`, so this file asks for the other one it needs by name.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * “Does a tab destination offer a back control?”
 *
 * The frames draw no back control on 06, 11, 12 and 14: in the design each of those screens **is
 * a tab**, and a tab's navigation is the core navigation bar, not the stack underneath it. The
 * routes used to pass `onBack` whenever `router.canGoBack()` was true, which reads as “this screen
 * was pushed onto something” but is not: entering the shell from onboarding pushes `/discover` onto
 * a stack that still holds the welcome, sign-up and consent screens, so the app's home screen grew a
 * back arrow that walked the picker back into a flow they had finished. Nothing failed — a browser
 * opening the route by URL has no history, so the harness never saw it, and it was found on a phone.
 *
 * The fix is a rule rather than a condition: a tab destination never offers back. This file holds
 * it, because the routes are thin by design and the rule is about which of them may claim a
 * control — the same kind of document guard `screen-inventory.test.ts` and `control-claims.test.ts`
 * are. What it cannot see is a back control built some other way than the `Screen` template's
 * `onBack` prop; that would be a new primitive, and this test says so where it fails.
 */
const ROOT = join(__dirname, '..', '..', '..');

/** The four destinations the shell's bar draws, and the route each one's screen is mounted by. */
const TAB_ROOTS = ['discover.tsx', 'visits.tsx', 'alerts.tsx', 'privacy-settings.tsx'] as const;

describe('the app shell’s tab destinations', () => {
  it.each(TAB_ROOTS)('%s offers no back control, because the bar is a tab’s navigation', (file) => {
    const source = readFileSync(join(ROOT, 'src', 'app', '(app)', file), 'utf8');

    expect(source).not.toContain('onBack=');
  });
});
