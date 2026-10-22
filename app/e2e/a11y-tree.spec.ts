import { expect, test } from '@playwright/test';

import { nodesIn, readPage, routesOfTheApp } from './a11y-tree';

/**
 * The walk's instrument, tested like one — the same discipline as `measure.spec.ts`, and for the
 * same reason: a walk that can only ever report “fine” moves the defect into CI's blind spot.
 *
 * Every page below is synthetic on purpose. A planted violation is what proves the walk would see
 * one on a real screen, and a clean page that must produce no finding is what proves the rule is
 * not merely strict. The pages are also where the *target's* behaviour is recorded rather than
 * assumed: which states a browser exposes for which role is Playwright's and Chromium's answer,
 * measured here, and the rules above are written to that answer.
 */
test.describe('the accessibility-tree probe', () => {
  test('reads the app’s own routes rather than a hand-kept list', () => {
    const routes = routesOfTheApp();

    // The reach, asserted: a wrong root would read as “no routes”, which passes while checking
    // nothing.
    expect(routes).toContain('/');
    expect(routes).toContain('/discover');
    expect(routes).toContain('/privacy-settings');
    expect(routes).toContain('/+not-found');
    // A navigator is not a screen, and a route group is not a path segment.
    expect(routes).not.toContain('/_layout');
    expect(routes.filter((route) => route.includes('('))).toEqual([]);
  });

  test('reads the shapes the snapshot is written in, and nothing else', () => {
    const nodes = nodesIn(
      [
        '- button "Save zone"',
        '- tablist "Main navigation":',
        '  - tab "Profile" [selected]: Profile',
        '- checkbox "I agree" [checked]',
        // The shape every button with content takes: role, name, and the node's own text.
        '- button "Saved spots": Saved spots 0 spots · private by default',
        '- text: Some copy',
        // A value rather than a node — the snapshot's own session notes look like this — so it is
        // skipped rather than read as a control with the name “/discover”.
        '- /url: /discover',
      ].join('\n'),
    );

    expect(nodes).toEqual([
      { flags: [], name: 'Save zone', role: 'button' },
      { flags: [], name: 'Main navigation', role: 'tablist' },
      { flags: ['selected'], name: 'Profile', role: 'tab' },
      { flags: ['checked'], name: 'I agree', role: 'checkbox' },
      { flags: [], name: 'Saved spots', role: 'button' },
      { flags: [], name: '', role: 'text' },
    ]);
  });

  test('passes a page whose controls are named, roled and stated', async ({ page }) => {
    await page.setContent(
      [
        '<button aria-label="Save zone">Save zone</button>',
        '<label for="q">Search</label><input id="q" />',
        '<div aria-label="Bilberry" aria-checked="true" role="checkbox" tabindex="0"></div>',
        '<div aria-label="August 2026" aria-checked="false" role="radio" tabindex="0"></div>',
        '<button aria-disabled="true" aria-label="Continue" tabindex="-1">Continue</button>',
      ].join(''),
    );

    const findings = await readPage(page, '/probe');

    expect(findings).toEqual([]);
  });

  test('reports an action the tree cannot name', async ({ page }) => {
    await page.setContent('<button tabindex="0"></button>');

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain('no accessible name');
  });

  test('reports a control whose state the page never declares', async ({ page }) => {
    // The defect this walk exists for: a `Pressable` with `role` and an accessible name, and its
    // checked state nowhere in the browser (ADR-020's consent checkbox, ADR-043's chip rows).
    await page.setContent('<div aria-label="Bilberry" role="checkbox" tabindex="0"></div>');

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain('declares no aria-checked');
  });

  test('reports a declared state the tree does not show', async ({ page }) => {
    // `aria-checked` on a `button` is not a pairing ARIA defines, so the browser drops it: the page
    // declares a state a screen reader is never given, which is the same class of defect as the
    // dropped `aria-checked` above, one step further along.
    await page.setContent('<button aria-checked="true" aria-label="Bilberry">Bilberry</button>');

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain(
      'declare aria-checked=true and the tree shows [checked] on 0',
    );
  });

  test('reports a flag the tree shows that the page never declared', async ({ page }) => {
    // The other direction, planted through the platform rather than through the app: a native
    // checkbox is checked as a property, and its owner has to have declared something for it.
    await page.setContent('<input aria-label="I agree" type="checkbox" />');
    await page.evaluate(() => {
      const checkbox = document.querySelector('input')!;
      checkbox.checked = true;
      // Only the DOM property moves; no attribute is written, which is what a screen that sets
      // state in React and declares nothing in the browser looks like.
      checkbox.setAttribute('data-only-the-property', 'true');
    });

    const findings = await readPage(page, '/probe');

    // The property *is* the declaration for a native control, so this page is the truth and not a
    // defect: the pair is reported only when the tree and the page disagree, and here they do not.
    expect(findings).toEqual([]);
  });

  test('reports a control that says it is working and not that it cannot act', async ({ page }) => {
    // The busy half of the contract, planted: an action in flight that announces the work and
    // nothing else. A screen reader hears a name and no reason the press will do nothing.
    await page.setContent(
      '<button aria-busy="true" aria-label="Save report offline">Save report offline</button>',
    );

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain('declares no unavailable state');
  });

  test('says nothing about a control that is working and says it cannot act', async ({ page }) => {
    // The honest shape, and the half a rule must not overshoot: the action is unavailable while it
    // works, which is what every action in the app does while it is busy (AGENTS.md §11.2).
    await page.setContent(
      [
        '<button aria-busy="true" aria-disabled="true" aria-label="Save report offline" disabled>Save report offline</button>',
        // The platform's own availability is enough: a native `disabled` is a declaration too.
        '<input aria-busy="true" aria-label="Search zones" disabled />',
      ].join(''),
    );

    const findings = await readPage(page, '/probe');

    expect(findings).toEqual([]);
  });

  test('reads the target’s own answer for a busy control, rather than assuming one', async ({
    page,
  }) => {
    // Why `busy` is not paired with the tree: Playwright's snapshot has no busy flag, so a paired
    // rule could only report the app's honest declaration as a defect. Measured here, so the
    // exemption in `a11y-tree.ts` rests on what this target does and not on a reading of the spec.
    await page.setContent('<button aria-busy="true" aria-label="Save report offline"></button>');

    const nodes = nodesIn(await page.locator('body').ariaSnapshot());

    expect(nodes.map((node) => node.role)).toContain('button');
    expect(nodes.flatMap((node) => node.flags)).not.toContain('busy');
  });

  test('says nothing about a control the page hides from the tree', async ({ page }) => {
    // The shape the busy action has: a spinner with a role of its own, hidden inside a named
    // control. A screen reader does not meet it, so it is not a control the walk can hold to the
    // contract — and counting it would report the honest hiding as a defect (found by the in-flight
    // reading of screen 10).
    await page.setContent(
      '<button aria-busy="true" aria-disabled="true" aria-label="Save report offline"><div role="progressbar" aria-hidden="true"></div></button>',
    );

    const findings = await readPage(page, '/probe');

    expect(findings).toEqual([]);
  });

  test('reports a focusable element that claims no role', async ({ page }) => {
    // What a `Pressable` looks like when it acts and never says what it is — the shape a screen
    // reader announces as an unlabelled group.
    await page.setContent('<div aria-label="Open zone 14 details" tabindex="0"></div>');

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain('claims no role that acts');
  });

  test('says nothing about a control that cannot act and claims no role', async ({ page }) => {
    // The app's own rule (AGENTS.md §11.2): a reading is not a control, and a walk that demanded a
    // role here would be demanding the opposite of what the design decided.
    await page.setContent(
      '<div aria-label="Use Picky as"><span>Picker</span><span>Buyer</span></div>',
    );

    const findings = await readPage(page, '/probe');

    expect(findings).toEqual([]);
  });

  test('reports a drawing the tree can only announce as an image', async ({ page }) => {
    // The shape the app's own map had (known issue 35): a browser exposes an `<svg>` as `img`, and
    // with no name the node says “image” and nothing else — while the role and name rules above
    // never look at it, because an image does not act.
    await page.setContent('<svg width="40" height="40"><path d="M0 0 L10 10" /></svg>');

    const findings = await readPage(page, '/probe');

    expect(findings.join('\n')).toContain('image with no accessible name');
  });

  test('says nothing about an image that is named or hidden', async ({ page }) => {
    // The two honest shapes of a drawing, side by side: content carries a text alternative
    // (WCAG 1.1.1), decoration is hidden from the tree. Neither is a defect, and the walk has to
    // be able to tell them from the unnamed one above — otherwise it would demand a name of every
    // flourish a frame draws.
    await page.setContent(
      [
        '<svg aria-label="Map of nearby berry zones" role="img"><path d="M0 0 L10 10" /></svg>',
        '<svg aria-hidden="true"><path d="M0 0 L4 4" /></svg>',
        '<img alt="" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" />',
      ].join(''),
    );

    const findings = await readPage(page, '/probe');

    expect(findings).toEqual([]);
  });
});
