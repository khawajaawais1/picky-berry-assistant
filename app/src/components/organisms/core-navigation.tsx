import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation, type TranslationKey } from '@/services/i18n';

import { AppText } from '../atoms';

/** The app's four destinations, in the order the design draws them. */
export const CORE_NAV_KEYS = ['discover', 'visits', 'alerts', 'profile'] as const;

export type CoreNavKey = (typeof CORE_NAV_KEYS)[number];

/**
 * How narrow a destination may be: the smallest thing a finger can aim at, and nothing more.
 *
 * It is deliberately **not** a share of the bar. A `25%` floor is what this was, and it read as
 * the frame's own arithmetic (four 89.5 px items inside the 358 px content box) — but four of them
 * are added up against the bar's width by the layout engine, and `react-native-web` and Yoga do not
 * resolve a percentage against the same box: on the installed Android build the fourth destination
 * fell onto a second row at the design's text size, on a phone whose font size is at its default.
 * The quarters come from `flexGrow` instead — every destination grows into the space it is given —
 * so the floor only has to be the minimum, and a label that needs more than a quarter at a large
 * system text size still takes it (see the component's own notes).
 */
const ITEM_MIN_WIDTH = layout.minTouchTarget;

/**
 * Each destination as the frame draws it: the glyph named in the design's own layers, and the
 * catalogue key for its label.
 *
 * The glyphs are the nearest ones from `@expo/vector-icons` rather than the design's own, the
 * same deviation the rest of the app records: the file draws Lucide's `map`, `bar-chart-3`,
 * `bell` and `user-round`, and Feather has no third bar chart, so the second stands in.
 */
const NAV_ITEMS: readonly {
  key: CoreNavKey;
  labelKey: TranslationKey;
  icon: ComponentProps<typeof Feather>['name'];
}[] = [
  { key: 'discover', labelKey: 'navigation.discover', icon: 'map' },
  { key: 'visits', labelKey: 'navigation.visits', icon: 'bar-chart-2' },
  { key: 'alerts', labelKey: 'navigation.alerts', icon: 'bell' },
  { key: 'profile', labelKey: 'navigation.profile', icon: 'user' },
];

export type CoreNavigationProps = ViewProps & {
  /**
   * The destination the screen showing the bar belongs to. Exactly one item is current, so no
   * screen can present two of them as where the user is.
   */
  activeKey: CoreNavKey;
  /**
   * The destination the user chose. Required, not optional: the bar is drawn on the screens the
   * design gives it to, and every one of those destinations exists as a route, so an item with
   * nothing to do would be a tab that cannot act (AGENTS.md §11.2). The caller owns the routes —
   * a shared component must not know them.
   */
  onSelect: (key: CoreNavKey) => void;
};

/**
 * The design's “Core navigation” (frames 06–14, node `5:23012`): the 78 px bar above the device's
 * home area that every core picker and account screen sits inside, with the four destinations the
 * frame names and the current one marked by a 60x32 tinted pill behind its glyph and a semibold
 * accent label.
 *
 * It sits in `organisms/` because that is what it is in Atomic Design's own terms: a group of
 * atoms and molecules (a glyph, a label and a tinted pill, repeated four times) that forms one
 * section of the interface. It is not a `molecule/` (which groups atoms into one reusable unit)
 * and not a `template/` (which lays out a page): it is a piece the shell composes. It knows the
 * design's labels and glyphs, and knows no routes — the caller decides where a destination
 * leads.
 *
 * Both heights are floors, not fixed boxes: at the largest system text size a label as long as
 * Finnish “Hälytykset” needs more than the frame's 51 px item, and a bar that kept the design's
 * height would cut it off (ADR-019).
 *
 * How the four destinations divide the bar is load-bearing, and it took two defects to get right.
 * At the design's text size they are equal quarters, but they get there by **growing** into the
 * space the bar gives them (`flexGrow: 1`), not by a floor: a `25 %` minimum was summed by the
 * layout engine against the bar's width, and on the installed Android build — whose engine resolves
 * that percentage against a slightly larger box than the browser does — the four floors added up to
 * more than the bar and the fourth destination wrapped onto a second row at the design's own text
 * size. At the largest system text size a destination's label is wider than a quarter (English
 * “Discover”, Finnish “Hälytykset”) and a word cannot break, so the item takes its content's width
 * (`flexBasis: 'auto'`) and the bar `flex-wrap`s, letting destinations that no longer fit share two
 * rows instead of hiding one or cutting its label off. At 200 % no copy is lost, which is the
 * bar's own accessibility requirement (ADR-019, ADR-022).
 *
 * The bar owns the bottom edge of the screen it sits on: the frame puts its own 8 px inset above
 * the device's home area, so the bar's surface grows down into that area rather than leaving a
 * strip of the page colour under it. The screens above it therefore hand the bottom edge over
 * (`Screen`'s `edges`), which is also what stops the two from adding the same inset twice.
 */
export function CoreNavigation({ activeKey, onSelect, style, ...rest }: CoreNavigationProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View
      {...rest}
      accessibilityLabel={t('navigation.label')}
      accessibilityRole="tablist"
      className="w-full flex-row flex-wrap items-center px-md pt-cardGap"
      style={[
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          // The frame's hairline along the top of the bar (1 px, node 5:23012).
          borderTopWidth: 1,
          minHeight: layout.navHeight,
          // The frame's own 8 px inset, plus whatever the device reserves below it.
          paddingBottom: spacing.sm + insets.bottom,
        },
        style,
      ]}
      testID="core-navigation"
    >
      {NAV_ITEMS.map((item) => {
        const current = item.key === activeKey;
        const label = t(item.labelKey);

        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            // Stated twice on purpose, like the consent checkbox's checked state: `accessibilityState`
            // is what iOS and Android read, and `aria-selected` is what the web target reads —
            // measured in the built export, `react-native-web` writes no `aria-selected` from the
            // state, which left the current destination in the glyph's and the label's colour alone.
            aria-selected={current}
            className="items-center justify-center gap-xs"
            key={item.key}
            onPress={() => onSelect(item.key)}
            style={{
              flexBasis: 'auto',
              flexGrow: 1,
              flexShrink: 1,
              minHeight: layout.navItemHeight,
              minWidth: ITEM_MIN_WIDTH,
            }}
            testID={`core-navigation-item-${item.key}`}
          >
            <View
              className="items-center justify-center rounded-pill"
              style={{
                backgroundColor: current ? colors.accentMuted : 'transparent',
                height: layout.navIndicatorHeight,
                width: layout.navIndicatorWidth,
              }}
              testID={`core-navigation-indicator-${item.key}`}
            >
              <Feather
                color={current ? colors.accent : colors.textMuted}
                name={item.icon}
                size={layout.navIcon}
              />
            </View>
            <AppText
              style={{
                color: current ? colors.accent : colors.textMuted,
                fontWeight: current ? '600' : '400',
              }}
              variant="navLabel"
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
