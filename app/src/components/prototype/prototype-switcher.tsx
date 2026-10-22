import { Feather } from '@expo/vector-icons';
import { router, usePathname, type Href } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * PROTOTYPE — throwaway scaffolding, not product code.
 *
 * The floating bar that switches a prototype's variants. It writes the variant into the route as
 * `?variant=`, so a variant is shareable and survives a reload, and it can be dropped on any
 * route a prototype renders on. It exists because a UI prototype is judged by flipping between
 * readings of the same screen, not by reading one.
 *
 * A variant may name a **different route** than the one on screen (`PrototypeVariant.path`), for
 * the prototypes whose readings disagree about *where* the thing lives rather than only how it
 * looks: the community map's three readings each sit on the screen that reading would give it, so
 * the arrows navigate between them instead of swapping a parameter.
 *
 * Delete this file with whatever prototype used it; it is deliberately outside the design
 * system's atoms/molecules (it is not part of the design, and forcing it into a layer would make
 * the next reader think it is).
 */
export type PrototypeVariant = {
  key: string;
  /** The reading this variant takes, in two or three words, for the bar's label. */
  name: string;
  /**
   * The route this reading is drawn on — for a prototype whose variants disagree about **where**
   * the thing lives, which is a design question in its own right (the community map's). Omitted
   * means “the route you are on”, which is every prototype whose variants are readings of one
   * screen: the arrows then only move the `?variant=` parameter.
   */
  path?: string;
};

export type PrototypeSwitcherProps = {
  variants: readonly PrototypeVariant[];
  /** The variant on screen. */
  current: string;
  /** What the last pressed action would do, so a reviewer can see the intent, not just the look. */
  note?: string;
  /**
   * How far above the screen's own foot the bar floats. A prototype drawn on a screen the app shell
   * already gives a bar to (`layout.navHeight` — `/discover`, `/zone-details` and `/saved-spots`
   * are all inside it) has to clear it, or the switcher ends up behind chrome the prototype does
   * not own and nobody can flip the readings.
   */
  lift?: number;
};

export function PrototypeSwitcher({ variants, current, note, lift = 0 }: PrototypeSwitcherProps) {
  const { colors } = useAppTheme();
  const pathname = usePathname();
  const index = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );
  const shown = variants[index]!;

  const move = useCallback(
    (next: PrototypeVariant) => {
      if (next.path && next.path !== pathname) {
        // A reading that lives on another route is a navigation, not a parameter change: the
        // two are different questions (which screen, and which reading of it) and a prototype is
        // allowed to make them the same answer. The href is built here and asserted because
        // typed routes cannot know a prototype's routes — the caller's variant table names them.
        router.replace(`${next.path}?variant=${next.key}` as Href);
        return;
      }

      router.setParams({ variant: next.key });
    },
    [pathname],
  );

  const go = (step: number) => {
    move(variants[(index + step + variants.length) % variants.length]!);
  };

  useEffect(() => {
    // Arrow keys are a browser affordance: the designer reviews this on the web export, where a
    // keyboard is what is in front of them. A device has none to lean on.
    if (typeof document === 'undefined') return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target !== null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (typing) return;

      const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
      if (step === 0) return;

      move(variants[(index + step + variants.length) % variants.length]!);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [index, move, variants]);

  return (
    // The bar is anchored to the foot of the screen **inline** rather than through utility
    // classes: the class-based offsets were not applied on the web export (the bar rendered at
    // the top of the route), and this is scaffolding, not a component worth debugging.
    <View
      className="items-center gap-sm px-lg"
      pointerEvents="box-none"
      style={{ bottom: spacing.md + lift, left: 0, position: 'absolute', right: 0 }}
    >
      {note ? (
        <View
          className="rounded-pill px-gap py-xs"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
        >
          <AppText style={{ textAlign: 'center' }} tone="muted" variant="caption">
            {note}
          </AppText>
        </View>
      ) : null}

      <View
        className="flex-row items-center gap-gap rounded-pill py-xs pl-sm pr-sm"
        style={{ backgroundColor: colors.text, elevation: 8 }}
      >
        <Pressable
          accessibilityLabel="Previous variant"
          accessibilityRole="button"
          className="h-touch w-xl items-center justify-center"
          onPress={() => go(-1)}
        >
          <Feather color={colors.background} name="chevron-left" size={22} />
        </Pressable>
        <AppText style={{ color: colors.background, fontWeight: '600' }} variant="bodySmall">
          {`PROTOTYPE · ${shown.key} · ${shown.name}`}
        </AppText>
        <Pressable
          accessibilityLabel="Next variant"
          accessibilityRole="button"
          className="h-touch w-xl items-center justify-center"
          onPress={() => go(1)}
        >
          <Feather color={colors.background} name="chevron-right" size={22} />
        </Pressable>
      </View>
    </View>
  );
}
