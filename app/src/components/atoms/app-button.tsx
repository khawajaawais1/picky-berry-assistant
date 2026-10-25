import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

import { AppText } from './app-text';

export type AppButtonVariant = 'primary' | 'secondary';

export type AppButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: AppButtonVariant;
  /** Shows progress and blocks interaction while an async action is running. */
  busy?: boolean;
  /** Rendered before the label — the design's actions lead with a glyph. */
  icon?: ReactNode;
  /**
   * The action's accessible name, when the visible label is not the whole of it. Defaults to
   * `label`: an action a sighted reader understands from its one-line word may still have to say
   * whom it acts on to a screen reader (frame 16's “Contact” against “Contact Matti Laine”).
   */
  accessibilityLabel?: string;
  /**
   * Extra style for the action's own box, merged after the variant's colours. The design draws
   * actions side by side in equal halves (frames 16 and 18 both set two 165 px actions in the
   * 342 px column), which is a `flex: 1` on the action itself — the one thing about an action a
   * caller has to be able to say.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary interactive element, at the design's action metrics: 54 px tall, 10 px
 * radius, centred content (foundations: “54 px actions”; frame 01's action node).
 *
 * The 54 px is a **floor**, not a fixed box: at the largest system text size a label as
 * long as frame 05's (“Continue to location settings”) wraps inside the action, and an
 * action that kept the design's height would cut it off — the defect screen 05's
 * measurement caught (ADR-019). The label may shrink to the action's width so it can
 * wrap; the action grows around it.
 *
 * Layout comes from Tailwind tokens; colours come from the theme so dark mode keeps
 * working, because a `className` cannot vary with the system colour scheme. The
 * press feedback is held in state rather than a `style` function so the resolved
 * style stays inspectable — a style function is opaque to tests, which is how the
 * action's colour went unverified before.
 *
 * Accessibility contract: exposes `button` role, an accessible label and a disabled
 * state, including while `busy` — a screen reader must never offer an action that is
 * currently unavailable — **and exposes them only while it has a handler**. With no
 * `onPress` the action is the design's *drawing* of one: no role, no name, no state and no
 * place in the tab order, which is how `TextAction` behaves and what every row and card in
 * the app does with the handler its caller left out. An action that cannot act claims no
 * role (AGENTS.md §11.2), and a caller that passes no handler is a screen drawing the
 * frame's action where the app has nothing to open.
 */
export function AppButton({
  label,
  accessibilityLabel,
  variant = 'primary',
  busy = false,
  disabled = false,
  onPress,
  onPressIn,
  onPressOut,
  icon,
  style,
  ...rest
}: AppButtonProps) {
  const { colors } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  /**
   * Whether there is anything behind the press. A button that is `disabled` is still an action —
   * it is waiting on a state, and a screen reader has to hear that it exists and is unavailable —
   * while one with no handler at all is a drawing.
   */
  const canAct = onPress !== undefined;
  const isDisabled = disabled || busy;
  const isPrimary = variant === 'primary';
  const foreground = isPrimary ? colors.onAccent : colors.text;

  return (
    <Pressable
      {...rest}
      accessibilityRole={canAct ? 'button' : undefined}
      // The accessible name is the visible label unless the caller names the action more fully. The
      // design's half-width actions hold a short word (frame 16's “Contact”), while what the action
      // does is only clear with the seller's name in it — a name a one-line 104 px label cannot
      // carry. The extra words belong in the name, not in a label that would wrap (ADR-019).
      accessibilityLabel={canAct ? (accessibilityLabel ?? label) : undefined}
      accessibilityState={canAct ? { disabled: isDisabled, busy } : undefined}
      /**
       * The busy state is stated **twice**, like the checked state `AppCheckbox`, `ChoiceChips` and
       * the yield rating state: `accessibilityState` is what iOS and Android read, and `aria-*` is
       * what the web target reads, because `react-native-web` folds neither `accessibilityState` nor
       * a `disabled` prop into an `aria-busy` of its own. Without this line an action that is
       * working declares nothing at all there: measured on the built export **while the write was in
       * flight**, the save action carried no busy state — only a spinner a screen reader cannot hear
       * (and that `disabled` alone does not explain: “unavailable” and “working on it” are two
       * different things to hear). The one reading that could see it is the in-flight one
       * (`e2e/accessibility.spec.ts`), which is why the defect survived every settled walk.
       */
      aria-busy={canAct ? busy : undefined}
      disabled={isDisabled}
      onPress={onPress}
      // A drawing is not a tab stop: `react-native-web` gives every `Pressable`
      // `tabIndex = disabled ? -1 : 0`, so an action with no handler would take focus and do
      // nothing on arrival — the defect the accessibility-tree walk found on frame 15's own count
      // line (`e2e/accessibility.spec.ts`). Left alone while there is a handler, so a `disabled`
      // action still gets the target's own tab-order answer.
      tabIndex={canAct ? undefined : -1}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      className="min-h-action flex-row items-center justify-center gap-sm rounded-control px-md"
      style={[
        {
          backgroundColor: isPrimary ? colors.accent : colors.surface,
          borderColor: colors.border,
          borderWidth: isPrimary ? 0 : StyleSheet.hairlineWidth,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {busy ? (
        // The spinner is the design's decoration, not content: what the action is doing is carried by
        // the busy state it declares above, and the drawing has no words to be named with. Left in
        // the tree it is a drawing a browser announces as “image” and nothing else — the defect known
        // issue 35 recorded for the map, found here by the one reading that reaches this frame
        // (`aria-hidden` is the same answer screen 13's code cells take).
        <ActivityIndicator aria-hidden color={foreground} />
      ) : (
        <>
          {icon}
          <AppText
            style={{ color: foreground, flexShrink: 1, fontWeight: '600', textAlign: 'center' }}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}
