import { router, useCanGoBack, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { ActiveVisitScreen } from '@/features/discover';
import { endTrackedVisit, useVisitSession } from '@/features/visits';

/**
 * Screen 09 · Core picker · Active visit (Figma node `5:23185`).
 *
 * A route only wires a screen to a feature's public API. It reads the visit the mounted tracker
 * publishes (`useVisitSession`) and hands the screen that reading, so the title, arrival time and
 * timer describe the visit the app is actually making. Its way out is the frame's **“End visit”**:
 * the tracker finalizes the visit, and the route opens the quick report (screen 10) on it.
 *
 * The same transition opens the report when the tracker finalizes a visit on its own, because a
 * visit whose grace window passed after the picker left can no longer continue. The route watches
 * the reading rather than the press, so both endings take one path; `openedReportFor` keeps a
 * re-render from opening the same report twice.
 */
export default function ActiveVisitRoute() {
  const canGoBack = useCanGoBack();
  const { active, candidate, lastFinalized } = useVisitSession();
  const openedReportFor = useRef<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (active !== null || lastFinalized === null) return;
      if (openedReportFor.current === lastFinalized.visitId) return;

      openedReportFor.current = lastFinalized.visitId;
      router.replace('/post-visit-feedback');
    }, [active, lastFinalized]),
  );

  return (
    <ActiveVisitScreen
      candidate={candidate}
      onBack={() => (canGoBack ? router.back() : router.replace('/discover'))}
      onEnd={
        active === null
          ? undefined
          : () => {
              endTrackedVisit();
            }
      }
      visit={active}
    />
  );
}
