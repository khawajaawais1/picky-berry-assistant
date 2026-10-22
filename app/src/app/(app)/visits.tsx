import { SeasonInsightsScreen } from '@/features/discover';

/**
 * Screen 11 · Core picker · Visits and analytics (Figma node `5:23343`).
 *
 * A route only wires a screen to a feature's public API, and this screen needs nothing from the
 * route: it reads the device's report queue through the feature's own hook. The frame has no back
 * control — in the design this screen is a tab — and neither does the route, because a tab's
 * navigation is the bar and not the history underneath it (a control that cannot act must not claim
 * a role, AGENTS.md §11.2; `src/config/__tests__/shell-tab-roots.test.ts` holds the rule).
 *
 * Screen 10's save leads here: the picker's own report is the top of the history, which is what
 * makes the queue visible instead of a promise.
 */
export default function VisitsRoute() {
  return <SeasonInsightsScreen />;
}
