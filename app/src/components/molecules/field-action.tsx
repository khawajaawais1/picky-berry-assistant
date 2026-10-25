import type { ReactNode } from 'react';
import { Pressable } from 'react-native';

import { layout } from '@/constants/theme';

export type FieldActionProps = {
  /** The action's accessible name (“Show password” / “Hide password”). */
  accessibilityLabel: string;
  onPress: () => void;
  /** The glyph the field draws at its trailing edge. */
  children: ReactNode;
  testID?: string;
};

/**
 * A control that lives inside a text field, at the design's 20 px glyph but the repo's 44 px
 * target (`layout.minTouchTarget`).
 *
 * The field's own box cannot be the target: tapping it focuses the input. The reveal control was
 * a 20×23 pressable with nothing around it, so the only way to reveal a password was to hit the
 * glyph itself (frontend review, 2026-10-25). The box is invisible and never affects the field's
 * own 54 px height, which is a floor.
 */
export function FieldAction({ accessibilityLabel, onPress, children, testID }: FieldActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="items-center justify-center"
      onPress={onPress}
      style={{ height: layout.minTouchTarget, width: layout.minTouchTarget }}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
