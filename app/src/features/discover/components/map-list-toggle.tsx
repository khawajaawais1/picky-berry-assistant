import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

/** The two ways one set of zones can be read on frame 06. */
export type ZoneView = 'map' | 'list';

export type MapListToggleProps = {
  view: ZoneView;
  onChange: (view: ZoneView) => void;
  /**
   * Opens the offline centre — frame 13 — which the frame's download glyph leads to. Left out
   * when the route has nowhere to send it, and the glyph then claims no role.
   */
  onOpenDownloads?: () => void;
};

/** The frame's own glyphs (nodes `5:24134` and `5:24137`), behind the row's 10 px gap. */
const LIST_GLYPH = 18;
const DOWNLOAD_GLYPH = 20;
const ROW_HEIGHT = 20;
/** Grows both controls to the 44 px a finger needs without moving the frame's geometry. */
const HIT_SLOP = (layout.minTouchTarget - ROW_HEIGHT) / 2;

const styles = StyleSheet.create({
  /**
   * The row's words: semibold, in the accent colour, and **not shrinkable**. A flexible text
   * box on the web shrinks to fit its line and then clips its own copy instead of letting the
   * row wrap, which is the defect this row was measured with at the largest system text size.
   */
  label: { flexShrink: 0, fontWeight: '600' },
});

/**
 * Frame 06's “Map list toggle” row (node `5:23008`): the frame's list glyph, the words it
 * writes — the state the map is in and the action that changes it — and, at the right inset,
 * the download glyph that leads to the offline centre.
 *
 * The frame draws the row as one line of accent text, `Map selected  /  Show zone list`, and
 * that is what it is: a statement of the current view and the control that switches it. The
 * slash belongs to neither string, so it is drawn between them.
 *
 * The row is one control rather than two, with the accessible name the **action**'s words
 * (“Show zone list”), because that is what pressing it does — announcing “Map selected” as
 * the name of a button would read the state as the instruction. The download glyph beside it
 * is a control of its own, named for where it leads.
 */
export function MapListToggle({ view, onChange, onOpenDownloads }: MapListToggleProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const showingMap = view === 'map';
  const action = t(showingMap ? 'discover.view.showList' : 'discover.view.showMap');

  return (
    <View
      className="w-full flex-row flex-wrap items-center gap-gap"
      style={{ minHeight: ROW_HEIGHT }}
      testID="map-list-toggle"
    >
      <Pressable
        accessibilityLabel={action}
        accessibilityRole="button"
        className="flex-1 flex-row flex-wrap items-center gap-gap"
        hitSlop={HIT_SLOP}
        onPress={() => onChange(showingMap ? 'list' : 'map')}
        // The box takes the line (`flex-1`) and its **contents wrap** into it: on the web every
        // text is shrinkable by default, and a shrunk text box hides its own words — the
        // harness measured exactly that here, with “Kartta valittuna / Näytä alueluettelo” cut
        // off at the largest system text size in Finnish. `flexShrink: 0` on the pieces (below)
        // plus this wrap is what makes the row take a second line instead of clipping a label
        // (ADR-019).
        style={{ flexShrink: 1 }}
        testID="map-list-toggle-view"
      >
        <Feather color={colors.accent} name="list" size={LIST_GLYPH} />
        <AppText style={styles.label} tone="accent" variant="bodySmall">
          {t(showingMap ? 'discover.view.mapStatus' : 'discover.view.listStatus')}
        </AppText>
        <AppText style={styles.label} tone="accent" variant="bodySmall">
          {' / '}
        </AppText>
        <AppText style={styles.label} tone="accent" variant="bodySmall">
          {action}
        </AppText>
      </Pressable>

      {onOpenDownloads ? (
        <Pressable
          accessibilityLabel={t('discover.downloads')}
          accessibilityRole="button"
          hitSlop={HIT_SLOP}
          onPress={onOpenDownloads}
          testID="map-list-toggle-downloads"
        >
          <Feather color={colors.accent} name="download" size={DOWNLOAD_GLYPH} />
        </Pressable>
      ) : null}
    </View>
  );
}
