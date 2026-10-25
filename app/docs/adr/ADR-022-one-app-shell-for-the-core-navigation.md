# ADR-022 — One app shell owns the core navigation, and the shell is where the bar's routing lives

- **Status:** Accepted
- **Date:** 2026-10-10
- **Deciders:** Agent session, recorded as an assumption for the project owner (PROJECT.md open question 22 was open when this was built)

## Context

Frames 06–14 all draw the same bar (node `5:23012`): four destinations — Discover, Visits, Alerts,
Profile — with one of them current, sitting above the device's home area. The screens those frames
belong to exist and are reached by their own routes; none of them had the bar, and every one of
them recorded that gap in its own doc comment.

Building it raises three questions the design does not answer, which is why PROJECT.md carried
them as open question 22: whether the three unbuilt destinations are placeholders, whether tab
state is one stack or four, and whether a deep link or a push from onboarding keeps the bar.

What the design *does* answer:

- The bar is the same four destinations on all nine frames, in the same order, with the same
  glyphs and the same current-state treatment.
- Each frame marks a different one current: 06–08 Discover, 09–11 Visits, 12 Alerts, 13–14 Profile.
- Frames 01–05 (onboarding) draw no bar at all.

Two of the three open questions are answered by what already exists: the destinations are not
placeholders — `/discover`, `/visits`, `/alerts` and `/privacy-settings` are built screens — and a
push from onboarding (screen 05's action leads to the picker) lands on a screen whose frame draws
the bar, so it must keep it.

## Decision

**One shell, mounted once, in a route group.** The nine routes the frames draw the bar on move into
`src/app/(app)/`, whose `_layout.tsx` renders the screen and the bar; onboarding stays outside the
group and keeps no bar. The group does not change any URL: Expo Router strips group segments, so
`/discover` is still `/discover`.

**The bar knows no routes** (`CoreNavigation` is presentational: `activeKey` in, `onSelect` out).
The shell owns both halves of the mapping — which route each destination opens, and which
destination each screen in the group belongs to — because that is route-layer knowledge, and
because a shared component that knew the app's URLs would be the layering inversion AGENTS.md §3
forbids.

**One stack, and switching a destination navigates rather than pushes.** The four destinations are
peers: `navigate` updates what the shell shows. The app's history is not thrown away — the
destination the user came from is still behind them, so the platform back gesture has somewhere to
go, which is what a four-stack navigator would also have to provide.

**The bar owns the bottom safe-area edge,** since the frame puts its own 8 px inset above the home
area and its surface continues into it. The screens above it hand that edge over (`Screen`'s
`edges` prop), which is what stops the two from adding the same inset twice.

## Alternatives considered

- **Render the bar in each of the nine screens.** Rejected: nine copies of one design, and nine
  places to keep in step when the design changes one item.
- **Let each feature screen own its tab identity** (a prop per screen). Rejected: it puts the shell's
  vocabulary inside three features that have no other interest in it, and the mapping would then be
  declared nine times instead of once.
- **`expo-router`'s `Tabs` navigator instead of a route group.** Rejected for now: it is React
  Navigation's bottom-tab bar, whose indicator, metrics and label treatment are not the design's,
  and restyling it to node `5:23012` means fighting its layout for every value in the frame.
  Revisit if four separate tab stacks are wanted (below).
- **Four stacks (one per destination).** The platform-standard behaviour, and the natural upgrade if
  the owner wants each destination to remember its own history. It needs a nested navigator per
  destination inside the group; the bar, the mappings and the screens do not change. Left for the
  owner (PROJECT.md open question 22).
- **A horizontally scrollable bar at large text sizes.** Rejected: it hides destinations behind a
  gesture exactly where a user with large text needs them visible, and it needs a scroll container
  in the chrome of every screen. The bar wraps to a second row instead (see Consequences).
- **Truncating or shrinking a destination's label.** Rejected: a tab whose name is cut down to
  “Discov…” or rendered below the text size the user asked for is a destination they have to guess
  at, and WCAG 1.4.4 is the requirement this bar has to meet.

## Consequences

- The bar's four labels are copy on every shell screen, so the layout harness measures them with
  each screen, in both languages, at both text sizes (`e2e/layout.spec.ts`).
- **A path the shell does not map draws no bar.** A screen added to the group without saying which
  destination it belongs to therefore fails visibly — and the harness fails on the missing bar —
  rather than showing a bar that claims the user is somewhere they are not.
- **The bar wraps at the largest system text size, and an item keeps a quarter as its minimum.**
  An item is a quarter of a 390 px bar, and neither English “Discover” nor Finnish “Hälytykset” fits
  that quarter at 200 %. The harness measured the alternative: the browser cut the label off. Two
  things fix it and both are needed — the item takes its content's width (`flexGrow: 1`,
  `flexBasis: 'auto'`) with a `25 %` minimum, because `react-native-web` gives a flex item
  `min-width: 0` and `flex-1` alone therefore kept the quarter and clipped the word; and the bar
  wraps, so four items that no longer fit share two rows rather than hiding a destination. At the
  design's own text size the minimum is what decides and the four are 90x51 in one row, exactly as
  the frame draws them (measured in the built export at 390 px).
- The bar's current destination is stated twice — `accessibilityState.selected` for the platforms
  and `aria-selected` for the web target — because the built export showed `react-native-web`
  writing only the former, leaving the state in colour alone. The browser spec is where the web half
  is measured; the unit test holds the native half.
- Onboarding is deliberately outside the shell, so a future screen has to decide which side of the
  line it belongs to. That is a decision, not an accident: it is how frames 01–05 keep the design's
  full-height layout.
