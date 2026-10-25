import { useEffect } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { AppText, type AppTextProps } from '../atoms';

export type StatusMessageProps = AppTextProps & {
  /**
   * Whether iOS should speak the line when it appears. On by default: a sentence the screen paints
   * because of an action is a sentence the user has to hear. A caller that draws an already-final
   * reading may switch it off.
   */
  announce?: boolean;
};

/**
 * One line of screen state that can change while the screen stays open — a refused sign-in, a
 * filter's count, a store that could not be read.
 *
 * It is a **live region**, because painting a sentence is not announcing it: a screen reader stays
 * where the user is, and every one of these lines was silent. The state is declared three ways for
 * the three targets — `role="status"` and `aria-live="polite"` for the web, Android's
 * `accessibilityLiveRegion`, and an explicit `AccessibilityInfo` announcement on iOS, which has no
 * live region at all.
 *
 * It is a *reading*, not a control: no role of an action, no focusable box, no tab stop.
 */
export function StatusMessage({ announce = true, children, ...rest }: StatusMessageProps) {
  const message = typeof children === 'string' ? children : undefined;

  useEffect(() => {
    if (!announce || message === undefined || Platform.OS !== 'ios') {
      return;
    }

    AccessibilityInfo.announceForAccessibility(message);
  }, [announce, message]);

  return (
    <AppText aria-live="polite" accessibilityLiveRegion="polite" role="status" {...rest}>
      {children}
    </AppText>
  );
}
