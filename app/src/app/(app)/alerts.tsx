import { AlertsScreen } from '@/features/discover';

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`).
 *
 * A route only wires a screen to a feature's public API, and this screen needs nothing from the
 * route: the design's alert is the feature's own sample. The frame has no back control — in the
 * design this screen is a tab — and neither does the route, because a tab's navigation is the bar
 * and not the history underneath it (a control that cannot act must not claim a role, AGENTS.md
 * §11.2; `src/config/__tests__/shell-tab-roots.test.ts` holds the rule).
 *
 * Nothing links here but the bar: the core navigation the design draws on frames 06–14 owns the tab.
 */
export default function AlertsRoute() {
  return <AlertsScreen />;
}
