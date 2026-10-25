import { Feather } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import { DEMO_ACTIVE_VISIT, formatElapsed } from '../domain/active-visit';
import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { useElapsedMs } from '../hooks/use-elapsed-ms';
import { DesignZoneMap } from './design-zone-map';

export type ActiveVisitScreenProps = {
  onBack?: () => void;
  /**
   * Closes the visit and opens the quick report (screen 10). Supplied by the route; without it
   * the action is not drawn, because a primary action that does nothing is what this repository
   * does not ship.
   */
  onEnd?: () => void;
};

/**
 * Screen 09 · Core picker · Active visit (Figma node `5:23185`).
 *
 * The visit while it is running: the frame's arrival note, the same map frame 06 draws — at
 * 210 px, its third height — a card carrying the elapsed time, the frame's own promise that the
 * track is private, and its two actions.
 *
 * The timer is the one thing here that is genuinely alive: it starts at the frame's own reading
 * (42 minutes 17 seconds, node `5:23226`) and counts up for real, and “Pause visit” holds it —
 * resuming restarts the clock from the reading it held, so a pause is not counted as time in the
 * zone. Everything else is the design's sample, because nothing tracks anything yet: the zone is
 * `DEMO_ZONES`' own, the arrival time is the timer's start read back as a wall clock, and the
 * tracking the note describes is the frame's claim about a feature that does not exist
 * (PROJECT.md records it as a demo, like the season demo on frame 06). Its note says the timing
 * runs **while the app is open**: the frame's own line promised the background, which this app
 * does not do (ADR-045) and which is the owner's decision rather than a string's (ADR-047).
 */
export function ActiveVisitScreen({ onBack, onEnd }: ActiveVisitScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

  // The demo visit began the frame's 42:17 ago, and runs from there.
  const [startedAtMs, setStartedAtMs] = useState(() => Date.now() - DEMO_ACTIVE_VISIT.elapsedMs);
  const [heldMs, setHeldMs] = useState<number | null>(null);
  const liveMs = useElapsedMs(startedAtMs, heldMs === null);
  const paused = heldMs !== null;
  const elapsedMs = heldMs ?? liveMs;

  function togglePause() {
    if (heldMs === null) {
      setHeldMs(liveMs);

      return;
    }

    // Resuming is a new start instant that many milliseconds ago: the pause itself is not
    // counted as time in the zone.
    setStartedAtMs(Date.now() - heldMs);
    setHeldMs(null);
  }

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.visit.eyebrow')}
      onBack={onBack}
      title={interpolate(t('discover.visit.title'), { zone: zone?.number ?? '' })}
    >
      <View className="w-full gap-section">
        <Callout
          icon={<Feather color={colors.success} name="check-circle" size={20} />}
          testID="visit-arrival-note"
          title={t('discover.visit.arrived.title')}
        >
          {interpolate(t('discover.visit.arrived.body'), { time: DEMO_ACTIVE_VISIT.arrival })}
        </Callout>

        <DesignZoneMap height={layout.visitMapHeight} />

        <Card style={styles.card} testID="visit-timer-card">
          <AppText style={styles.centred} tone="success" variant="statusLabel">
            {t('discover.visit.status')}
          </AppText>
          <VisitReading elapsedMs={elapsedMs} />
          <AppText style={styles.centred} tone="muted" variant="caption">
            {t('discover.visit.timerHint')}
          </AppText>
        </Card>

        <View className="w-full flex-row items-center gap-gap">
          <Feather color={colors.success} name="lock" size={22} />
          <View className="flex-1">
            <AppText tone="muted" variant="caption">
              {t('discover.visit.privacy')}
            </AppText>
          </View>
        </View>

        <View className="w-full flex-row gap-gap">
          <View className="flex-1">
            <AppButton
              icon={<Feather color={colors.accent} name={paused ? 'play' : 'pause'} size={20} />}
              label={t(paused ? 'discover.visit.resume' : 'discover.visit.pause')}
              onPress={togglePause}
              testID="visit-pause"
              variant="secondary"
            />
          </View>
          {onEnd ? (
            <View className="flex-1">
              <AppButton
                icon={<Feather color={colors.onAccent} name="square" size={20} />}
                label={t('discover.visit.end')}
                onPress={onEnd}
                testID="visit-end"
              />
            </View>
          ) : null}
        </View>

        <AppText tone="muted" variant="bodySmall">
          {t('discover.visit.supporting')}
        </AppText>
      </View>
    </Screen>
  );
}

/**
 * The elapsed reading, painted as three parts — the hours, then a colon with the minutes, then
 * a colon with the seconds — in a row that may wrap.
 *
 * It is one reading, and assistive technology is told exactly that (`accessibilityRole="text"`
 * with the whole reading as its name). It is three text nodes for the largest system text size:
 * the frame's 52 px numeral is 222 px wide, and 200 % of it is 440 px — wider than the 302 px the
 * card can hold on one line. Painted in parts, the reading reflows onto two lines at that size
 * (00:42 on the first, :17 on the second) instead of being clipped or capped below the size the
 * user asked for, which is what ADR-019 asks of any control whose content has to grow.
 */
function VisitReading({ elapsedMs }: { elapsedMs: number }) {
  const [hours, minutes, seconds] = formatElapsed(elapsedMs).split(':');

  return (
    <View
      accessibilityLabel={formatElapsed(elapsedMs)}
      accessibilityRole="text"
      className="w-full flex-row flex-wrap items-center justify-center"
      testID="visit-timer"
    >
      <AppText variant="timer">{hours}</AppText>
      <AppText variant="timer">:{minutes}</AppText>
      <AppText variant="timer">:{seconds}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  // The card's lines are centred by their own `textAlign` rather than by the card's
  // `alignItems`: a centred column gives each line its content's width, so a long label — “ACTIVE
  // · LINGONBERRY” at twice the system text size — would widen its box past the card instead of
  // wrapping inside it, which is exactly what the layout harness caught.
  centred: {
    textAlign: 'center',
  },
  card: {
    // The design's 6 px step — the same token a settings row is padded with: the card draws its
    // three lines 6 px apart, and a card 150 px tall is exactly what that adds up to (node
    // `5:23224`: 20 + 17 + 6 + 63 + 6 + 18 + 20).
    gap: spacing.setting,
    padding: spacing.cardInset,
  },
});
