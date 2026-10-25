import { router, useCanGoBack } from 'expo-router';

import { ActiveVisitScreen } from '@/features/discover';
/**
 * Screen 09 · Core picker · Active visit (Figma node `5:23185`).
 *
 * A route only wires a screen to a feature's public API. It is reached from screen 08's “Start
 * walking”; its way out is the frame's **“End visit”**, which opens the quick report (screen 10).
 * The frame's back control is offered the same way as everywhere else: only when the screen was
 * actually pushed onto a stack.
 */
export default function ActiveVisitRoute() {
  const canGoBack = useCanGoBack();

  return (
    <ActiveVisitScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onEnd={() => router.push('/post-visit-feedback')}
    />
  );
}
