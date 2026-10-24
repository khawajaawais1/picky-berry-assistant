import { router, useCanGoBack } from 'expo-router';

import { ZoneReportsScreen } from '@/features/discover';
/**
 * The list behind frame 07's “See all 11” — **the design never drew it** (ADR-044).
 *
 * A route only wires a screen to a feature's public API. The frame's link names the zone's
 * reports for the week, and the design's eleven are its own sample week; what the app can hold is
 * the reports saved on this phone, so the screen states both rather than standing the sample in
 * for the phone's record. It is reached from the zone screen's own row, and the frame draws a back
 * control there, so the route offers one only when the screen was actually pushed onto a stack —
 * which keeps a deep link from drawing a control that cannot act.
 */
export default function ZoneReportsRoute() {
  const canGoBack = useCanGoBack();

  return <ZoneReportsScreen onBack={canGoBack ? () => router.back() : undefined} />;
}
