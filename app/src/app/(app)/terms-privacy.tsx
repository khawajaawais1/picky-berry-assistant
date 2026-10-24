import { router, useCanGoBack } from 'expo-router';

import { TermsPrivacyScreen } from '@/features/privacy';
/**
 * The screen frame 14's “Terms & privacy” row opens (Figma node `5:23688`; the screen behind it was
 * never drawn — ADR-039).
 *
 * A route only wires a screen to a feature's public API, and this screen has almost nothing to
 * wire: it reads the records the device is holding and states what is true about them, and none of
 * them is changed from here. The one destination is the copy — `/your-data` (ADR-040) — which the
 * rights card's “Take a copy” row names. The back control is offered only when the screen was
 * pushed onto a stack — a deep link has nowhere to go back to, and a control that cannot act must
 * not claim a role (AGENTS.md §11.2).
 */
export default function TermsPrivacyRoute() {
  const canGoBack = useCanGoBack();

  return (
    <TermsPrivacyScreen
      onBack={canGoBack ? () => router.back() : undefined}
      onOpenYourData={() => router.push('/your-data')}
    />
  );
}
