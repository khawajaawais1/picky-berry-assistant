import { router, useCanGoBack } from 'expo-router';

import { YourDataScreen } from '@/features/privacy';
import { shareText } from '@/services/share-text';

/**
 * The screen the export path is used from — **the design never drew it** (ADR-040). It is reached
 * from the notice (`/terms-privacy`), whose “Take a copy” row names it.
 *
 * A route only wires a screen to a feature's public API. Here that wiring is the one thing the app
 * cannot do inside a feature's own test: handing the copy to the platform's share sheet
 * (`src/services/share-text.ts`, which takes the document and the sheet's title — the screen's own
 * translated name). Nothing navigates on the result, because the copy's destination is the user's
 * choice inside the sheet; the screen says what the platform answered.
 *
 * The back control is offered only when the screen was pushed onto a stack: a deep link straight to
 * this route has nowhere to go back to, and a control that cannot act must not claim a role
 * (AGENTS.md §11.2).
 */
export default function YourDataRoute() {
  const canGoBack = useCanGoBack();

  return (
    <YourDataScreen onBack={canGoBack ? () => router.back() : undefined} onShare={shareText} />
  );
}
