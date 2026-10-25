import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatShortDate, interpolate, useTranslation, type TranslationKey } from '@/services/i18n';

import {
  DEMO_ALERT,
  DEMO_ALERT_PREFERENCES,
  confidenceLabelKey,
  formatRadius,
} from '../domain/alert';
import { formatDistance } from '../domain/route';
import { SCORE_MAX } from '../domain/zone-details';
import { SPECIES_LABEL_KEY } from './species-copy';

export type AlertsScreenProps = {
  onBack?: () => void;
};

/**
 * The frame's three reasons, and the glyph and the two lines each of them gets (nodes 5:23465,
 * 5:23470 and 5:23475). They are copy, so they live beside the screen rather than in the domain.
 */
const ALERT_REASONS: readonly {
  /** The frame draws `sun`, `cloud-rain` and `calendar-check`; Feather has no calendar-check, so
   *  the third reason uses the nearest glyph it does have, as screen 14's lock does. */
  icon: 'sun' | 'cloud-rain' | 'calendar';
  titleKey: TranslationKey;
  detailKey: TranslationKey;
}[] = [
  {
    detailKey: 'discover.alert.reason.warm.detail',
    icon: 'sun',
    titleKey: 'discover.alert.reason.warm.title',
  },
  {
    detailKey: 'discover.alert.reason.rain.detail',
    icon: 'cloud-rain',
    titleKey: 'discover.alert.reason.rain.title',
  },
  {
    detailKey: 'discover.alert.reason.picked.detail',
    icon: 'calendar',
    titleKey: 'discover.alert.reason.picked.title',
  },
];

/**
 * Screen 12 · Core picker · Alerts and forecast (Figma node `5:23439`).
 *
 * The design's heads-up: what is ripe and how far away, what the app's own reading of it is worth,
 * and the three reasons it is saying so — followed by the frame's own note about what a forecast
 * is made of.
 *
 * The alert is the **design's sample**, like the zone screens' forecast and frame 08's offline
 * note: no weather source, season model or report stream exists behind it (PROJECT.md records it,
 * and the frame's own note is the disclaimer the design draws for exactly that reason).
 *
 * The frame's **alert preferences** card is drawn as the design's own sample (ADR-043): no alert is
 * delivered and no permission is asked for, so its switch is a figure rather than a control, its
 * four rows claim no role and draw no chevron — a row that will never open anything may not draw
 * the sign that says it will (AGENTS.md §11.2) — and a line on the card says the settings are the
 * design's, not this phone's.
 *
 * One part of the frame stays deliberately absent, recorded in PROJECT.md: its **“View Zone 18”**
 * action — the app's demo map has no Zone 18, so the action would open nothing.
 *
 * Its **core navigation** is absent as it is on every other core picker screen.
 */
export function AlertsScreen({ onBack }: AlertsScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.alert.eyebrow')}
      onBack={onBack}
      title={t('discover.alert.title')}
    >
      <View className="w-full gap-section">
        <View
          className="w-full gap-cardGap rounded-lg px-section py-section"
          style={{ backgroundColor: colors.accentMuted }}
          testID="alert-card"
        >
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="bell" size={22} />
            <AppText
              className="flex-1"
              style={{ fontWeight: '600' }}
              tone="accent"
              variant="metadata"
            >
              {interpolate(t('discover.alert.stamp'), {
                date: formatShortDate(DEMO_ALERT.at, locale),
                time: DEMO_ALERT.atTime,
              })}
            </AppText>
          </View>

          <AppText variant="heroTitle">
            {interpolate(t('discover.alert.headline'), {
              distance: formatDistance(DEMO_ALERT.distanceMeters, locale),
            })}
          </AppText>

          {/* The chips wrap for the same reason screen 11's period chips do: the design sets them
              in one row and its own labels fit in one, and a large system text size does not. */}
          <View className="w-full flex-row flex-wrap gap-sm">
            <AlertChip
              label={interpolate(t('discover.alert.score'), {
                max: String(SCORE_MAX),
                score: String(DEMO_ALERT.score),
              })}
              testID="alert-score"
              tone="accent"
            />
            <AlertChip
              label={t(confidenceLabelKey(DEMO_ALERT.confidence))}
              testID="alert-confidence"
              tone="success"
            />
          </View>

          <AppText tone="muted" variant="caption">
            {interpolate(t('discover.alert.context'), {
              minutes: String(DEMO_ALERT.latestReportMinutesAgo),
              place: DEMO_ALERT.place,
              zone: DEMO_ALERT.zoneNumber,
            })}
          </AppText>
        </View>

        <View className="w-full gap-section">
          <AppText variant="sectionHeading">{t('discover.alert.why')}</AppText>

          {ALERT_REASONS.map((reason) => (
            <View className="w-full flex-row items-center gap-gap" key={reason.titleKey}>
              <Feather color={colors.success} name={reason.icon} size={22} />
              <View className="flex-1 gap-tight">
                <AppText variant="cardTitle">{t(reason.titleKey)}</AppText>
                <AppText tone="muted" variant="caption">
                  {t(reason.detailKey)}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/*
          The frame's preferences card (nodes 5:23480–5:23504), in the frame's own place: after its
          three reasons and before its closing note.
        */}
        <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="alert-preferences">
          <AppText style={{ fontWeight: '600' }} variant="cardLead">
            {t('discover.alert.preferences.title')}
          </AppText>

          <View className="w-full flex-row items-center gap-gap py-setting">
            <AppText className="flex-1" variant="cardTitle">
              {t('discover.alert.preferences.push')}
            </AppText>
            <SwitchFigure on={DEMO_ALERT_PREFERENCES.pushAlerts} />
          </View>

          {/* The frame draws one divider, under its first setting (node 5:23487). */}
          <View
            className="w-full"
            style={{ backgroundColor: colors.border, height: 1 }}
            testID="alert-preferences-divider"
          />

          <PreferenceRow
            label={t('discover.alert.preferences.radius')}
            value={formatRadius(DEMO_ALERT_PREFERENCES.radiusKm, locale)}
          />
          <PreferenceRow
            label={t('discover.alert.preferences.quiet')}
            value={interpolate(t('discover.alert.preferences.quietValue'), {
              from: DEMO_ALERT_PREFERENCES.quietFrom,
              to: DEMO_ALERT_PREFERENCES.quietTo,
            })}
          />
          <PreferenceRow
            label={t('discover.alert.preferences.species')}
            value={interpolate(t('discover.alert.preferences.speciesValue'), {
              count: String(DEMO_ALERT_PREFERENCES.extraSpecies),
              species: t(SPECIES_LABEL_KEY[DEMO_ALERT_PREFERENCES.speciesId]),
            })}
          />

          <AppText testID="alert-preferences-sample" tone="muted" variant="metadata">
            {t('discover.alert.preferences.sample')}
          </AppText>
        </Card>

        <AppText tone="muted" variant="metadata">
          {t('discover.alert.note')}
        </AppText>
      </View>
    </Screen>
  );
}

/**
 * The switch the frame draws on the first setting, as a **figure**: `on` paints the frame's own
 * state (accent track, thumb at the end), and nothing here can be pressed, because nothing
 * delivers an alert and no permission is asked for. A plain view claims no role, so assistive
 * technology is not offered a control that would turn on nothing (AGENTS.md §11.2).
 */
function SwitchFigure({ on }: { on: boolean }) {
  const { colors } = useAppTheme();

  return (
    <View
      className="flex-row items-center rounded-pill"
      style={{
        backgroundColor: on ? colors.accent : colors.border,
        height: layout.switchHeight,
        // The frame's 3 px inset, derived rather than written down: the thumb is centred in the
        // track by construction, so the padding cannot disagree with the two heights.
        padding: (layout.switchHeight - layout.switchThumb) / 2,
        width: layout.switchWidth,
        justifyContent: on ? 'flex-end' : 'flex-start',
      }}
      testID="alert-preferences-push-figure"
    >
      <View
        style={{
          backgroundColor: colors.onAccent,
          borderRadius: layout.switchThumb / 2,
          height: layout.switchThumb,
          width: layout.switchThumb,
        }}
      />
    </View>
  );
}

/**
 * One of the card's three read-only settings: the frame's label, the frame's accent value at the
 * end, and no more. **It claims no role and draws no chevron** — the design draws an arrow on each
 * of these rows, and the app drops it, for the reason frame 13's rows drop theirs (ADR-042): a row
 * that will never open anything may not draw the sign that says it will (AGENTS.md §11.2).
 */
function PreferenceRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-full flex-row items-center gap-gap py-setting">
      <AppText className="flex-1" variant="cardTitle">
        {label}
      </AppText>
      <AppText tone="accent" variant="rowValue">
        {value}
      </AppText>
    </View>
  );
}

/**
 * One of the alert's two chips. The design paints the score filled with the accent colour and the
 * confidence tinted with the success one; whatever the tint, the chip carries its own word, so
 * colour is never the only thing that says what it means.
 */
function AlertChip({
  label,
  testID,
  tone,
}: {
  label: string;
  testID: string;
  tone: 'accent' | 'success';
}) {
  const { colors } = useAppTheme();
  const tint = tone === 'accent' ? colors.accent : colors.successMuted;

  return (
    <View
      className="min-h-chip flex-row items-center rounded-pill px-gap"
      style={{ backgroundColor: tint, borderColor: tint, borderWidth: 1 }}
      testID={testID}
    >
      <AppText
        style={{ color: tone === 'accent' ? colors.onAccent : colors.success, fontWeight: '600' }}
        variant="label"
      >
        {label}
      </AppText>
    </View>
  );
}
