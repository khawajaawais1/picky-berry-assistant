import type { Page } from '@playwright/test';

import { appPages } from './app-pages';

/**
 * The accessibility-tree walk: what every control on every built screen must expose, and the
 * reading that decides whether it does.
 *
 * It lives apart from the walk itself (`e2e/accessibility.spec.ts`) for the reason
 * `e2e/measure.ts` does: so the instrument can be tested on its own page
 * (`e2e/a11y-tree.spec.ts`), where a planted violation proves the walk would see one. A walk
 * that can only ever report “fine” is worse than no walk — it moves the defect into CI's blind
 * spot with a green tick on top (the measurement probes' own words, and the reason this file and
 * those have the same shape).
 *
 * Two readings come out of it: `readPage`, which settles first and is what the walk uses, and
 * `readInFlight`, which reads a screen **while an action on it is working** — the state a settled
 * reading can never reach, because settling is what waits it out.
 *
 * **Why a browser, and not a Jest render.** The defect class this walks for cannot exist in React
 * Native Testing Library: React Native folds `aria-*` into `accessibilityState` before a host
 * element exists, so a Jest render can hold the contract the app *intends* and never the tree a
 * browser computes. States were dropped on this target twice before — the consent checkbox's
 * `aria-checked`, the chip rows' (ADR-020, ADR-043) — each time leaving a state in a colour
 * alone, and each time found by hand on one screen. This is the same rule read systematically:
 * **every control a screen exposes has a role, an accessible name, and the state the page
 * declares for it** (AGENTS.md §11.2, SECURITY.md §11).
 *
 * **What it reads, and why in this order.**
 *
 * 1. The page's controls, as the page itself describes them: an explicit `role` or the one its tag
 *    has, the states it declares (`aria-*`, and a native `checked`/`disabled`), and whether it can
 *    be reached at all.
 * 2. The page's accessibility tree, through Playwright's `ariaSnapshot` — the browser's computed
 *    tree rather than the source's intent: each node's role, its computed accessible name, and the
 *    states that are *true* of it (`[checked]`, `[disabled]`, `[busy]`, `[selected]`, `[expanded]`,
 *    `[pressed]`). A state that is false is absent from the tree, which is exactly why the DOM side
 *    exists: a declaration of `false` and a declaration that was dropped look the same in the tree.
 * 3. The two are paired by role and name, and compared as **counts**, not element by element — the
 *    states a snapshot can show, that is, which is every declared state but `busy` (the one a
 *    snapshot never carries, measured in `a11y-tree.spec.ts` and read from the page instead). That
 *    is not a shortcut: a screen reads its stores on mount, so the disabled state of a control
 *    that is loading flips inside the reading, and a per-element pairing reported a mismatch that
 *    was the screen's first frame rather than its state. Counts read the screen, and `settle`
 *    gives the screen a moment to be the screen first.
 *
 * **What it cannot see**, recorded so a later reader does not over-trust it: a state the app keeps
 * in React state and declares nowhere in the DOM or on the platform's own element (the tree can
 * only carry what the browser was told); **a busy flag in the tree at all** — Playwright's snapshot
 * has none, so `aria-busy` is read from the page and held by its own rule rather than paired with a
 * flag that cannot exist; whether a name is a *good* name; a control that claims no
 * role because it cannot act — a screen that draws a chip as a reading is a decision, not a defect
 * (ADR-043); and **a name the target drops**. The map's own labels are that case: the platform reads
 * their `accessibilityLabel`s, Chromium ignores them on a role-less `div`, and the zones' states
 * therefore arrive as one flat run of text — measured, and known issue 36. A walk that demanded
 * more of them would be asking for a repair whose shape is a design decision.
 */

/** The roles that act, or that carry a state a user has to be told. */
export const ACTIONABLE_ROLES = [
  'button',
  'checkbox',
  'combobox',
  'link',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
] as const;

/**
 * The state each role has to declare, and the flag the tree carries when it is true. ARIA pairs
 * these: a checkbox with no checked state is not a reading a screen reader can give, and a tab
 * with no selected state cannot say which destination is current.
 *
 * A native `<input>` is exempt from the *declaration* half only: its state is the platform's own
 * (`checked`, `disabled`) and the tree reads it from there. The agreement half applies to it like
 * everything else.
 */
export const ROLE_STATE: Record<string, { attribute: string; flag: string }> = {
  checkbox: { attribute: 'aria-checked', flag: 'checked' },
  menuitemcheckbox: { attribute: 'aria-checked', flag: 'checked' },
  menuitemradio: { attribute: 'aria-checked', flag: 'checked' },
  option: { attribute: 'aria-selected', flag: 'selected' },
  radio: { attribute: 'aria-checked', flag: 'checked' },
  switch: { attribute: 'aria-checked', flag: 'checked' },
  tab: { attribute: 'aria-selected', flag: 'selected' },
};

/**
 * The states that are read wherever they are declared rather than being one role's own: a disabled
 * action, a control that is busy, an expanded disclosure, a pressed toggle. Each is declarable on
 * any role, and each has to reach a screen reader — one that cannot hear “unavailable” offers an
 * action nobody can use.
 *
 * `shownInTree` says whether a browser's snapshot can carry the state *at all*, which is a property
 * of the instrument and not of the app: a state a snapshot never shows cannot be paired with the
 * page's declaration, because the pairing could only ever report the app's honest declaration as a
 * defect. `busy` is the one such state — Playwright's `ariaSnapshot` has no busy flag (measured on
 * a planted control, `a11y-tree.spec.ts`), so it is read from the page and held by its own rule
 * below.
 */
export const DECLARED_STATE: Record<string, { flag: string; shownInTree: boolean }> = {
  'aria-busy': { flag: 'busy', shownInTree: false },
  'aria-disabled': { flag: 'disabled', shownInTree: true },
  'aria-expanded': { flag: 'expanded', shownInTree: true },
  'aria-pressed': { flag: 'pressed', shownInTree: true },
};

/** A control the walk found on the page, as the page itself describes it. */
export type Control = {
  /** What the element says it is: an explicit `role`, or the role its tag has by default. */
  role: string;
  /** Its accessible name, as the page declares it — the key it is paired on. */
  name: string;
  /** The states the DOM declares, by attribute name. */
  declares: Record<string, boolean>;
  /** Whether the element can be reached at all — a native control, or anything focusable. */
  focusable: boolean;
  /** The element's own opening tag, trimmed — what a failure has to name. */
  outline: string;
};

/** One node of the page's accessibility tree. */
export type TreeNode = {
  role: string;
  name: string;
  /** The states the browser computed as true, from `[checked]`-style markers. */
  flags: string[];
};

/** Every attribute the walk reads on the page, and the flag each one shows as. */
const STATE_FLAGS: readonly (readonly [string, string])[] = [
  ...new Map([
    ...Object.values(ROLE_STATE).map((state) => [state.attribute, state.flag] as const),
    ...Object.entries(DECLARED_STATE).map(([attribute, state]) => [attribute, state.flag] as const),
  ]).entries(),
];

/** The attributes whose flag the tree carries because the role itself requires the state. */
const ROLE_STATE_FLAGS = new Set(Object.values(ROLE_STATE).map((state) => state.attribute));

/**
 * The states that are compared with the tree, in both directions. Everything the page declares here
 * has to be shown, and everything shown has to be declared; a state whose flag no snapshot carries
 * is excluded for the reason `DECLARED_STATE` records.
 */
const PAIRED_STATE: readonly (readonly [string, string])[] = [...STATE_FLAGS].filter(
  ([attribute]) =>
    ROLE_STATE_FLAGS.has(attribute) || (DECLARED_STATE[attribute]?.shownInTree ?? false),
);

/** How many readings of a screen `settle` will take before it reads what it has. */
const SETTLE_ATTEMPTS = 10;
const SETTLE_PAUSE_MS = 100;

/**
 * The route of every page file the app has — read from `src/app` by `./app-pages`, the same
 * reading the screen inventory asserts (`src/config/__tests__/screen-inventory.test.ts`) and the
 * prototype readings share, so “every built screen” means the app's own routes rather than a
 * hand-kept list a new screen can be left out of. `+not-found.tsx` is Expo Router's fallback,
 * walked here like the layout harness measures it (`/+not-found`).
 */
export function routesOfTheApp(): string[] {
  return appPages().map((page) => page.route);
}

/**
 * What counts as a control: anything natively interactive (a link, button, field or select), and
 * anything carrying a `role` or a `tabindex` — which is how this target renders a React Native
 * `Pressable`, as a `div` that acts.
 *
 * Two things are deliberately not controls. A node that claims no role and cannot be focused: the
 * app draws controls that cannot act as readings (AGENTS.md §11.2), and a walk that flagged those
 * would be demanding the opposite of the rule. And anything the page does not put in the
 * accessibility tree — `aria-hidden`, or not rendered at all: the router keeps the screen it left
 * mounted, and a decorative drawing inside a named control is hidden on purpose. Both are filters
 * below, and the second one costs something worth naming there.
 */
export async function controlsOn(page: Page): Promise<Control[]> {
  return page.evaluate(
    (stateAttributes: string[]) => {
      const IMPLICIT: Record<string, string> = {
        a: 'link',
        button: 'button',
        select: 'combobox',
        textarea: 'textbox',
      };

      const implicitRole = (element: Element): string => {
        const tag = element.tagName.toLowerCase();

        if (tag === 'input') {
          const type = (element as HTMLInputElement).type;

          return type === 'checkbox' || type === 'radio' ? type : 'textbox';
        }

        return IMPLICIT[tag] ?? '';
      };

      /**
       * The page's own name for the element, which is the key the tree is paired on. `aria-label`
       * is what this app sets on every control it draws, so it is the name in practice; the rest is
       * the browser's own resolution order, near enough to pair on and never used as a claim.
       */
      const nameOf = (element: Element): string => {
        const labelled = element.getAttribute('aria-labelledby');

        if (labelled !== null) {
          return (
            labelled
              .split(/\s+/)
              .map((id) => document.getElementById(id)?.textContent ?? '')
              .join(' ')
              .trim() ||
            (element.getAttribute('aria-label') ?? '')
          );
        }

        const label = element.getAttribute('aria-label');

        if (label !== null && label !== '') {
          return label;
        }

        if (element.id !== '') {
          const own = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);

          if (own !== null) {
            return (own.textContent ?? '').trim();
          }
        }

        // A field's name is its placeholder only as a last resort, which is where a screen that
        // forgot a label gets caught rather than silently named.
        return (
          (element.textContent ?? '').replace(/\s+/g, ' ').trim() ||
          element.getAttribute('placeholder') ||
          ''
        );
      };

      const candidates = [
        ...document.querySelectorAll(
          // `tabindex="-1"` is deliberately not a control: it is out of the tab order, which is how
          // this target renders an action that cannot act (`react-native-web`'s `tabIndex = disabled
          // ? -1 : 0`) — and an inert action that claims no role is a reading, not a control. One
          // that *does* claim a role is still read, through `[role]` or its own tag.
          'a[href], button, input:not([type="hidden"]), select, textarea, [role], [tabindex]:not([tabindex="-1"])',
        ),
      ]
        .filter((element) => element.checkVisibility?.() ?? true)
        // Hidden from the accessibility tree is not a control: the page has said, in its own words,
        // that this node is not part of what a screen reader meets. Without this the pairing below
        // reports a false defect the moment a control hides a drawing inside itself — which is what
        // the busy action does with its spinner (`aria-hidden`, found by the in-flight reading).
        // What it also means, recorded rather than implied: a whole *action* hidden from the tree is
        // a defect this walk cannot see, and no shipped screen hides one.
        .filter((element) => element.closest('[aria-hidden="true"]') === null);

      return candidates.map((element) => {
        const declared = new Map(
          [...element.attributes]
            .filter((attribute) => attribute.name.startsWith('aria-'))
            .map((attribute) => [attribute.name, attribute.value]),
        );
        const role = element.getAttribute('role') ?? implicitRole(element);
        const declares: Record<string, boolean> = {};

        for (const attribute of stateAttributes) {
          const value = declared.get(attribute);

          if (value !== undefined) {
            declares[attribute] = value === 'true';
          }
        }

        // The platform's own states, which the tree reads whether or not an attribute says so.
        // Without this half a correct native control would look like one whose state was never
        // declared, and the walk would report the opposite of the truth about it.
        if (element instanceof HTMLInputElement) {
          if (element.type === 'checkbox' || element.type === 'radio') {
            declares['aria-checked'] = element.checked;
          }
        }

        if (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) {
          declares['aria-disabled'] = declares['aria-disabled'] === true || element.disabled;
        }

        return {
          declares,
          focusable:
            element.matches('a[href], button, input, select, textarea') ||
            Number(element.getAttribute('tabindex') ?? '-1') >= 0,
          name: nameOf(element),
          outline: (element.outerHTML ?? '').replace(/\s+/g, ' ').slice(0, 120),
          role,
        };
      });
    },
    STATE_FLAGS.map(([attribute]) => attribute),
  );
}

/**
 * The page's accessibility tree, as the nodes the walk asserts over.
 *
 * The snapshot is YAML-ish lines: `- button "Save zone"`, `- tab "Profile" [selected]`, `- button
 * "Saved spots": Saved spots 0 spots…` — role, then the computed name, then the states that are
 * true, then the node's own text. A line with no role word before its colon (`- /url: …`, the
 * snapshot's own session notes) is a value and not a node, so it is skipped rather than read as a
 * control with a name nobody wrote.
 */
export function nodesIn(snapshot: string): TreeNode[] {
  return snapshot.split('\n').flatMap((line) => {
    const match =
      /^\s*-\s+([a-z]+)(?:\s+"((?:[^"\\]|\\.)*)")?\s*(\[[^\]]*\])?\s*(?::\s?(.*))?$/.exec(line);

    if (match === null) {
      return [];
    }

    const [, role, name, flags] = match;

    return [
      {
        flags: [...(flags ?? '').matchAll(/\[([^\]=]+)(?:=[^\]]*)?\]/g)].map(
          ([, flag]) => flag ?? '',
        ),
        name: (name ?? '').replace(/\\(["\\])/g, '$1'),
        role: role ?? '',
      },
    ];
  });
}

/** What the walk found on one screen, in the words a failure has to be readable in. */
export type Finding = string;

/** Whether the tree exposes a node as one of the roles that act. */
function isActionable(role: string): boolean {
  return (ACTIONABLE_ROLES as readonly string[]).includes(role);
}

/** Roles a browser keeps out of the accessibility tree, so pairing them would invent findings. */
const TREE_EXEMPT_ROLES = new Set(['none', 'presentation']);

/** What the page and the tree each say about one `role · name` pair. */
type Pair = {
  /** How many controls the page has under this pair. */
  controls: number;
  /** How many tree nodes it has under this pair. */
  nodes: number;
  /** How many controls declare each state true. */
  declared: Map<string, number>;
  /** How many tree nodes carry each state's flag. */
  shown: Map<string, number>;
};

function bump(counts: Map<string, number>, key: string): void {
  counts.set(key, (counts.get(key) ?? 0) + 1);
}

/**
 * The rule, in one place: every control has a role, a name, and the state the page declares.
 *
 * Four questions, asked separately because they fail separately. A walk that only counted controls
 * would pass a screen whose every action is unnamed; one that only read the tree would pass a
 * screen whose checked state the target dropped; one that only read the DOM would pass a screen
 * whose state never reached a screen reader; and one that only read actionable roles would pass a
 * map that announces itself as nothing (the fourth, `img`, is the one role whose whole purpose is
 * to be named).
 */
export function findingsIn(input: {
  /** The screen, as a route, so a failure names where to look. */
  route: string;
  controls: readonly Control[];
  nodes: readonly TreeNode[];
}): Finding[] {
  const findings: Finding[] = [];

  // 1. The tree's side of the name rule: an action a screen reader cannot name is an action it
  //    cannot offer, whatever the DOM says.
  for (const node of input.nodes) {
    if (isActionable(node.role) && node.name.trim() === '') {
      findings.push(`${input.route} · the tree exposes a “${node.role}” with no accessible name`);
    }
  }

  // 1b. A drawing is either content, and carries a text alternative (WCAG 1.1.1), or decoration,
  //     and is hidden from the tree. An unnamed one is neither: a browser exposes an `<svg>` as
  //     `img`, so the node announces “image” and nothing else. The role/name rules above cannot
  //     see it — an image does not act — which is how the app's own map sat unnamed on three
  //     screens until this rule was written (known issue 35).
  for (const node of input.nodes) {
    if (node.role === 'img' && node.name.trim() === '') {
      findings.push(`${input.route} · the tree exposes an image with no accessible name`);
    }
  }

  const pairs = new Map<string, Pair>();
  const pairOf = (role: string, name: string): Pair => {
    const key = `${role} · ${name || '(unnamed)'}`;
    const existing = pairs.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const created: Pair = {
      controls: 0,
      declared: new Map(),
      nodes: 0,
      shown: new Map(),
    };
    pairs.set(key, created);

    return created;
  };

  // 2. The page's side: what it declares, and whether the element can act at all.
  for (const control of input.controls) {
    const label = `${input.route} · ${control.role === '' ? 'no role' : control.role} — ${control.outline}`;

    if (control.focusable && !isActionable(control.role)) {
      findings.push(`${label}: focusable but claims no role that acts`);
    }

    // The role's own state, declared in the DOM at all. This is the half that catches a state the
    // target dropped: `react-native-web` rendered a checked `Pressable` with the state in
    // `accessibilityState` and nothing in the browser, and a checkbox whose state is nowhere is not
    // a checkbox a screen reader can report.
    const required = ROLE_STATE[control.role];

    if (required !== undefined && control.declares[required.attribute] === undefined) {
      findings.push(
        `${label}: role “${control.role}” declares no ${required.attribute}, so its ${required.flag} state is nowhere for a screen reader`,
      );
    }

    // 2b. A control that says it is **working** has to say it cannot act. The busy flag is the one
    //     state a snapshot never shows (see `DECLARED_STATE`), so this half is read from the page:
    //     without an unavailable state beside `aria-busy`, a screen reader is told neither that the
    //     action is running nor that it cannot be pressed — the spinner is all a sighted user gets,
    //     and a drawing is not a state (AGENTS.md §11.2). The role and name halves of this rule are
    //     1 and 2 above, which every control that acts is already held to.
    if (control.declares['aria-busy'] === true && control.declares['aria-disabled'] !== true) {
      findings.push(
        `${label}: working (aria-busy) and declares no unavailable state, so nothing says it cannot be pressed`,
      );
    }

    if (TREE_EXEMPT_ROLES.has(control.role)) {
      continue;
    }

    const pair = pairOf(control.role, control.name);
    pair.controls += 1;

    for (const [attribute] of PAIRED_STATE) {
      if (control.declares[attribute] === true) {
        bump(pair.declared, attribute);
      }
    }
  }

  for (const node of input.nodes) {
    if (node.role === '' || TREE_EXEMPT_ROLES.has(node.role)) {
      continue;
    }

    const pair = pairOf(node.role, node.name);
    pair.nodes += 1;

    for (const [attribute, flag] of PAIRED_STATE) {
      if (node.flags.includes(flag)) {
        bump(pair.shown, attribute);
      }
    }
  }

  // 3. The agreement: what the page has, the tree has; what the page declares, the tree shows.
  for (const [key, pair] of pairs) {
    if (pair.controls === 0) {
      continue;
    }

    if (pair.nodes < pair.controls) {
      findings.push(
        `${input.route} · ${pair.controls - pair.nodes} of the ${pair.controls} “${key}” control(s) are not in the accessibility tree`,
      );

      continue;
    }

    for (const [attribute, flag] of PAIRED_STATE) {
      const declared = pair.declared.get(attribute) ?? 0;
      const shown = pair.shown.get(attribute) ?? 0;

      if (declared > shown) {
        findings.push(
          `${input.route} · ${declared} “${key}” control(s) declare ${attribute}=true and the tree shows [${flag}] on ${shown}`,
        );
      }

      if (shown > declared) {
        findings.push(
          `${input.route} · the tree shows [${flag}] on ${shown} “${key}” node(s) and ${declared} declare ${attribute}=true`,
        );
      }
    }
  }

  return findings;
}

/**
 * One whole reading of a page that is already open: the controls it exposes, its accessibility
 * tree, and what the rules make of the pair. The walk and the probe's own cases both come through
 * here, so “what the walk found” and “what the probe proved” are one reading.
 *
 * It waits for the page to settle first, because a screen reads its stores on mount and the frame
 * before that is not the screen: the settings switch is disabled while the consent record loads,
 * the zone screen's save action while the plan loads. Reading through that frame reported a
 * mismatch that was the load, not the screen — so the readings are repeated until two of them
 * agree. A page that never settles is read anyway, and its findings stand: a screen whose controls
 * keep moving is not made to pass by waiting longer.
 */
export async function readPage(page: Page, route: string): Promise<Finding[]> {
  let previous = '';
  let controls: Control[] = [];

  for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt += 1) {
    controls = await controlsOn(page);
    const current = JSON.stringify(controls);

    if (current === previous) {
      break;
    }

    previous = current;

    if (attempt < SETTLE_ATTEMPTS - 1) {
      await page.waitForTimeout(SETTLE_PAUSE_MS);
    }
  }

  const nodes = nodesIn(await page.locator('body').ariaSnapshot());

  return findingsIn({ controls, nodes, route });
}

/** One whole reading as it was taken: what the page exposed, what the tree showed, and what the
 * rules made of the pair. The walk uses its findings; a reading of a screen **in flight** needs the
 * reading itself, because “nothing was found” is only half of what it has to say: the floor below.
 */
export type Reading = {
  controls: Control[];
  nodes: TreeNode[];
  findings: Finding[];
};

/**
 * One reading of a page that is already open, taken **now**.
 *
 * It deliberately does not settle, which is the whole reason it exists beside `readPage`: a screen
 * whose action is working is only in that state for as long as the work takes, and `readPage`'s
 * wait-for-two-agreeing-readings would sit through exactly the frame under test — the loop's whole
 * purpose is to read the screen *after* its load, and here the load is the state.
 *
 * What it reads is the same instrument, so a state the instrument cannot see is missing here for the
 * same recorded reason: the busy flag, which no snapshot carries, is read from the page (see
 * `DECLARED_STATE` and the rule in `findingsIn`).
 *
 * A caller has to have **seen** the state before reading it (`expect(locator).toHaveCount(1)` on
 * the declaration, or a wait for the control that is working), because a reading is a point in time
 * and this one is taken at whatever point it is asked for.
 */
export async function readInFlight(page: Page, route: string): Promise<Reading> {
  const controls = await controlsOn(page);
  const nodes = nodesIn(await page.locator('body').ariaSnapshot());

  return { controls, findings: findingsIn({ controls, nodes, route }), nodes };
}
