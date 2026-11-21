import { Feather } from '@/components/atoms/app-icon';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import {
  formatClockTime,
  formatElapsed,
  type CandidateSnapshot,
  type VisitSnapshot,
} from '../domain/active-visit';
import { useElapsedMs } from '../hooks/use-elapsed-ms';

export type ActiveVisitScreenProps = {
  /** The visit the tracker is running, or null when there is none. */
  visit?: VisitSnapshot | null;
  /** An entry that has not yet earned the visit policy's dwell minimum. */
  candidate?: CandidateSnapshot | null;
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
 * The visit while it is running, drawn from the app's own tracker: the zone the picker is in, the
 * clock time the visit began, the live elapsed time, the frame's promise that the track is private,
 * and its “End visit” action. When the tracker has seen the picker enter a zone but the visit
 * policy's dwell has not elapsed, the screen draws that shorter, honest state instead; when it has
 * seen neither, it says so rather than drawing the design's sample.
 *
 * Two things the frame draws are deliberately absent: its **map** (the demo composition's geometry,
 * not the tracked zone) and its **“Pause visit”** action (the tracker has no pause semantics — a
 * visit is presence, and the frame's action would claim a control the domain cannot honour).
 */
export function ActiveVisitScreen({
  candidate = null,
  onBack,
  onEnd,
  visit = null,
}: ActiveVisitScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  if (visit === null && candidate === null) {
    return (
      <Screen
        edges={['top']}
        eyebrow={t('discover.visit.empty.eyebrow')}
        onBack={onBack}
        title={t('discover.visit.empty.title')}
      >
        <View className="w-full gap-section">
          <Callout
            icon={<Feather color={colors.textMuted} name="map-pin" size={20} />}
            testID="visit-empty"
            title={t('discover.visit.empty.callout')}
          >
            {t('discover.visit.empty.body')}
          </Callout>
          <AppText tone="muted" variant="bodySmall">
            {t('discover.visit.empty.hint')}
          </AppText>
        </View>
      </Screen>
    );
  }

  if (visit === null) {
    // The first branch has already handled “neither”, so this is unreachable; it is written out
    // because it is also what tells the compiler the candidate below is not null.
    if (candidate === null) return null;

    return (
      <Screen
        edges={['top']}
        eyebrow={t('discover.visit.candidate.eyebrow')}
        onBack={onBack}
        title={interpolate(t('discover.visit.candidate.title'), { zone: candidate.zoneName })}
      >
        <View className="w-full gap-section">
          <Callout
            icon={<Feather color={colors.success} name="map-pin" size={20} />}
            testID="visit-candidate-note"
            title={t('discover.visit.candidate.arrived.title')}
          >
            {interpolate(t('discover.visit.candidate.arrived.body'), {
              time: formatClockTime(candidate.enteredAt),
            })}
          </Callout>

          <CandidateTimer enteredAt={candidate.enteredAt} />

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.success} name="lock" size={22} />
            <View className="flex-1">
              <AppText tone="muted" variant="caption">
                {t('discover.visit.privacy')}
              </AppText>
            </View>
          </View>

          <AppText tone="muted" variant="bodySmall">
            {t('discover.visit.candidate.supporting')}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.visit.eyebrow')}
      onBack={onBack}
      title={interpolate(t('discover.visit.title'), { zone: visit.zoneName })}
    >
      <View className="w-full gap-section">
        <Callout
          icon={<Feather color={colors.success} name="check-circle" size={20} />}
          testID="visit-arrival-note"
          title={t('discover.visit.arrived.title')}
        >
          {interpolate(t('discover.visit.arrived.body'), {
            time: formatClockTime(visit.openedAt),
          })}
        </Callout>

        <Card style={styles.card} testID="visit-timer-card">
          <AppText style={styles.centred} tone="success" variant="statusLabel">
            {t('discover.visit.status')}
          </AppText>
          <VisitTimer openedAt={visit.openedAt} />
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

        {onEnd ? (
          <AppButton
            icon={<Feather color={colors.onAccent} name="square" size={20} />}
            label={t('discover.visit.end')}
            onPress={onEnd}
            testID="visit-end"
          />
        ) : null}

        <AppText tone="muted" variant="bodySmall">
          {t('discover.visit.supporting')}
        </AppText>
      </View>
    </Screen>
  );
}

function VisitTimer({ openedAt }: { openedAt: number }) {
  return <VisitReading elapsedMs={useElapsedMs(openedAt)} />;
}

function CandidateTimer({ enteredAt }: { enteredAt: number }) {
  const { t } = useTranslation();

  return (
    <Card style={styles.card} testID="visit-timer-card">
      <AppText style={styles.centred} tone="muted" variant="statusLabel">
        {t('discover.visit.candidate.status')}
      </AppText>
      <VisitReading elapsedMs={useElapsedMs(enteredAt)} />
      <AppText style={styles.centred} tone="muted" variant="caption">
        {t('discover.visit.candidate.timerHint')}
      </AppText>
    </Card>
  );
}

/**
 * The elapsed reading, painted as three parts — the hours, then a colon with the minutes, then
 * a colon with the seconds — in a row that may wrap.
 *
 * It is one reading, and assistive technology is told exactly that (the text role, with
 * the whole reading as its name). It is three text nodes for the largest system text size: the
 * frame's 52 px numeral is 222 px wide, and 200 % of it is 440 px — wider than the 302 px the card
 * can hold on one line. Painted in parts, the reading reflows onto two lines at that size (00:42 on
 * the first, :17 on the second) instead of being clipped or capped below the size the user asked
 * for, which is what ADR-019 asks of any control whose content has to grow.
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
  // The card's lines are centred by their own `textAlign` rather than by the card's `alignItems`:
  // a centred column gives each line its content's width, so a long label — “ARRIVING · VISIT NOT STARTED”
  // at twice the system text size — would widen its box past the card instead of wrapping inside
  // it, which is exactly what the layout harness caught.
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
