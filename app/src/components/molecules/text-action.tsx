import { Pressable } from 'react-native';

import type { TypographyVariant } from '@/constants/theme';
import { layout } from '@/constants/theme';

import { AppText } from '../atoms';

export type TextActionProps = {
  label: string;
  /**
   * Omit it while the action cannot act — the frame draws one waiting on a countdown.
   * An action without a handler claims no role, so a screen reader is never offered
   * something that does nothing.
   */
  onPress?: () => void;
  /** The metric the frame gives this action; the design's links are 14 px. */
  variant?: TypographyVariant;
  /** The frame centres some text actions across the column and sets others at its start. */
  align?: 'left' | 'center';
  testID?: string;
};

/**
 * The design's secondary action: a text link in the accent colour, semibold. It carries
 * the same accessibility contract every action in this app does — `button` role and an
 * accessible label only while it can act, **and no place in the tab order while it cannot**.
 *
 * That second half is the target's rather than React Native's: `react-native-web` gives every
 * `Pressable` `tabIndex = disabled ? -1 : 0`, so a text action waiting on a countdown — or one
 * whose screen has no destination to open — was a keyboard tab stop that did nothing when it was
 * reached. Found by the accessibility-tree walk over every built screen
 * (`e2e/accessibility.spec.ts`), on frame 15's own count line, which draws the frame's words and
 * opens nothing.
 *
 * Written twice before it came here (screen 01's sign-in action, screen 03's terms link
 * and sign-in action), which is when the repository extracts a shared component
 * (AGENTS.md §2.5), and the screens since then draw it wherever a secondary action is.
 */
export function TextAction({
  label,
  onPress,
  variant = 'bodySmall',
  align = 'left',
  testID,
}: TextActionProps) {
  return (
    <Pressable
      accessibilityLabel={onPress ? label : undefined}
      accessibilityRole={onPress ? 'button' : undefined}
      className={align === 'center' ? 'w-full items-center' : undefined}
      onPress={onPress}
      // An action that cannot act is not a tab stop either: a keyboard or a screen reader has to
      // land on something that does something.
      tabIndex={onPress === undefined ? -1 : 0}
      // The label is the design's 20 px line; the target is the repo's 44 px floor (AGENTS.md
      // §11). The box grows around the copy without changing its metrics.
      style={{
        justifyContent: 'center',
        minHeight: layout.minTouchTarget,
        minWidth: layout.minTouchTarget,
      }}
      testID={testID}
    >
      <AppText style={{ fontWeight: '600' }} tone="accent" variant={variant}>
        {label}
      </AppText>
    </Pressable>
  );
}
