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
 * The field's own box cannot be the target: tapping it focuses the input. The touch target is
 * grown with hit slop rather than a 44 px visual box: a 44 px child made the password field taller
 * than the email field beside it, because the field's height is its content plus its inset
 * (frontend review, 2026-10-25, reported from Expo Go). The glyph is 20 px in both callers.
 */
const GLYPH_SIZE = 20;
const HIT_SLOP = (layout.minTouchTarget - GLYPH_SIZE) / 2;

export function FieldAction({ accessibilityLabel, onPress, children, testID }: FieldActionProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className="items-center justify-center"
      hitSlop={HIT_SLOP}
      onPress={onPress}
      testID={testID}
    >
      {children}
    </Pressable>
  );
}
