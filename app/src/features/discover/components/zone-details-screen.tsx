import { Feather, MaterialIcons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import zoneSeason from '@/assets/images/zone-season.png';
import { AppButton, AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { interpolate, useTranslation, type TranslationKey } from '@/services/i18n';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { DEMO_ROUTE, formatDistance } from '../domain/route';
import {
  DEMO_ZONE_DETAILS,
  REPORT_YIELD_MAX,
  SCORE_MAX,
  type Confidence,
  type ReportTrust,
  type Ripeness,
  type ZoneWeather,
} from '../domain/zone-details';
import { SPECIES_LABEL_KEY } from './species-copy';
import { ZONE_STATE_LABEL_KEY } from './zone-state-copy';

const CONFIDENCE_KEY: Record<Confidence, TranslationKey> = {
  high: 'discover.details.confidence.high',
  medium: 'discover.details.confidence.medium',
  low: 'discover.details.confidence.low',
};

const WIND_KEY: Record<ZoneWeather['wind'], TranslationKey> = {
  light: 'discover.details.wind.light',
  moderate: 'discover.details.wind.moderate',
  strong: 'discover.details.wind.strong',
};

const TRUST_KEY: Record<ReportTrust, TranslationKey> = {
  trusted: 'discover.details.reports.trust.trusted',
  unverified: 'discover.details.reports.trust.unverified',
};

const RIPENESS_KEY: Record<Ripeness, TranslationKey> = {
  ripe: 'discover.details.ripeness.ripe',
  ripening: 'discover.details.ripeness.ripening',
};

export type ZoneDetailsScreenProps = {
  onBack?: () => void;
  /**
   * Opens the route to this zone — frame 08 — or nothing.
   *
   * The frame draws the action (“Navigate · 1.4 km”) because in the design it is the way on;
   * it is a control only when the caller supplies the destination, so a screen opened without
   * one draws no button it cannot act on (AGENTS.md §11.2).
   */
  onNavigate?: () => void;
  /**
   * Opens the zone's own report list — the app-drawn screen behind the frame's “See all 11”
   * (ADR-044) — or nothing.
   *
   * The frame's link names the zone's reports for the week, and the design's eleven are its own
   * sample week; what the app can hold is the reports saved on this phone, so the destination
   * states that difference rather than standing the sample in for it. Without a destination the
   * row stays the design's own words and claims no role.
   */
  onSeeReports?: () => void;
};

/**
 * Screen 07 · Core picker · Zone details (Figma node `5:23032`).
 *
 * What a picker wants before walking out: the zone's yield score with the confidence behind
 * it, how many reports this week produced it, whether it is ripe, today's conditions and the
 * freshest report from the field. It is the screen frame 06's zone card opens.
 *
 * Everything on it is the design's sample, and the design says so itself in the one line
 * that could be read as a promise: “A forecast of conditions, not a guaranteed harvest.” The
 * figures — the score, the week's report count, the temperature, the report and its age —
 * live in `DEMO_ZONE_DETAILS`, tied by test to the same demo zone frame 06 draws, because
 * there is no zone service, no weather source and no report stream yet (PROJECT.md).
 *
 * The frame's **“Save zone”** bookmark (node `5:23081`) is real: it writes the zone to the
 * picker's own plan on this device and takes it back out again, which is where its saved state
 * comes from (`services/saved-zones.ts`, ADR-024). The frame's **species chips** are drawn as
 * the zone's own data (see below).
 *
 * What the frame draws and this screen deliberately does not:
 *
 * - the species row's third chip, **“More”** — on this screen the row is data (what grows here),
 *   and an index of species has nothing to narrow here (the species the app can name is offered
 *   where a species is chosen: frame 10);
 * - with no destination supplied, the **“Navigate · 1.4 km”** action — it is drawn when the
 *   route gives the screen frame 08 to open, and its distance is read from that screen's own
 *   demo route so the two cannot disagree;
 * - **“See all 11”**, which names the zone's reports for the week. The design's eleven are its
 *   own sample week and there is no report stream, so the list behind the link is app-drawn and
 *   holds the reports this phone saved — it is a control when the route supplies that list and
 *   the design's own words otherwise (ADR-044);
 * - the **core navigation**, as on frame 06.
 *
 * One departure in type, recorded in PROJECT.md: the frame sets “Fresh from pickers” one
 * pixel smaller than “Today's outlook”; the app keeps one section-heading slot for both.
 */
export function ZoneDetailsScreen({ onBack, onNavigate, onSeeReports }: ZoneDetailsScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);
  const details = DEMO_ZONE_DETAILS;
  const { error: saveError, isSaved, loading: savingLoading, toggle } = useSavedZones();
  const saved = zone ? isSaved(zone.id) : false;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.details.eyebrow')}
      onBack={onBack}
      // The frame's title names the same demo place the map draws, so both values are read
      // from the catalogue (and from the same demo zone) rather than repeated here.
      title={interpolate(t('discover.details.title'), {
        place: t('discover.map.place'),
        zone: zone?.number ?? '',
      })}
    >
      <View className="w-full gap-section">
        <Image
          accessibilityLabel={t('discover.details.hero')}
          accessible
          source={zoneSeason}
          style={styles.hero}
          testID="zone-details-hero"
        />

        {/* The frame's own row of species chips (node `5:23047`): the berries this zone is
            reported for, the first one in the accent fill the frame gives its first chip. They
            are **data, not controls** — the row says what grows here, and there is nothing on a
            single zone's screen for a species to filter (the map's filter is screen 06's). The
            frame's third chip (“More”) opens a species index the app does not have, so it is
            not drawn (AGENTS.md §11.2; PROJECT.md records it). */}
        <View className="w-full flex-row flex-wrap gap-gap" testID="zone-species-chips">
          {zone?.species.map((species, position) => {
            const main = position === 0;

            return (
              <View
                className="h-chip flex-row items-center rounded-pill px-gap"
                key={species}
                style={{
                  backgroundColor: main ? colors.accent : colors.surface,
                  borderColor: main ? colors.accent : colors.border,
                  borderWidth: 1,
                }}
                testID={`zone-species-chip-${species}`}
              >
                <AppText
                  style={{
                    color: main ? colors.onAccent : colors.textMuted,
                    fontWeight: '600',
                  }}
                  variant="label"
                >
                  {t(SPECIES_LABEL_KEY[species])}
                </AppText>
              </View>
            );
          })}
        </View>

        <Card style={styles.yieldCard} testID="zone-yield-card">
          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ color: colors.accent }} testID="zone-yield-score" variant="metric">
              {details.score}
            </AppText>
            <View className="flex-1 gap-xs">
              <AppText style={styles.strong} variant="bodySmall">
                {interpolate(t('discover.details.scoreLabel'), { max: String(SCORE_MAX) })}
              </AppText>
              <AppText tone="success" variant="label">
                {t(CONFIDENCE_KEY[details.confidence])}
              </AppText>
              <AppText tone="muted" variant="metadata">
                {interpolate(t('discover.details.reportsThisWeek'), {
                  count: String(details.reportsThisWeek),
                })}
              </AppText>
            </View>
          </View>

          <View className="w-full flex-row flex-wrap gap-sm">
            {[ZONE_STATE_LABEL_KEY[details.state], RIPENESS_KEY[details.ripeness]].map((key) => (
              <View
                className="h-chip flex-row items-center rounded-pill px-gap"
                key={key}
                style={{ backgroundColor: colors.successMuted }}
              >
                <AppText tone="success" variant="label">
                  {t(key)}
                </AppText>
              </View>
            ))}
          </View>

          <AppText tone="muted" variant="metadata">
            {t('discover.details.forecastDisclaimer')}
          </AppText>
        </Card>

        <View className="w-full gap-sm">
          <AppText variant="sectionHeading">{t('discover.details.outlook.title')}</AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('discover.details.outlook.body')}
          </AppText>
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.warning} name="sun" size={20} />
            <AppText style={styles.flexible} tone="muted" variant="caption">
              {interpolate(t('discover.details.weather'), {
                temperature: String(details.weather.temperature),
                time: details.weather.forecastHour,
                wind: t(WIND_KEY[details.weather.wind]),
              })}
            </AppText>
          </View>
        </View>

        {/* The frame stacks these four rows 6 px apart (`spacing.setting`), where the outlook
            above uses 8: measured on nodes 5:23073–5:23079. */}
        <View className="w-full gap-setting">
          {/*
            The heading and the frame's link wrap rather than squeezing side by side. At the largest
            system text size the Finnish pair (“Tuoreet havainnot” + “Näytä kaikki 11”) is wider than
            the content column in Android's typeface, and a row that keeps them on one line clips one
            of them — the defect the layout harness reported on a Linux runner, whose fallback font
            was wide enough to show it (found 2026-10-21). The design's own size still draws one line.
          */}
          <View className="w-full flex-row flex-wrap items-center gap-gap">
            <AppText style={styles.flexible} variant="sectionHeading">
              {t('discover.details.reports.title')}
            </AppText>
            {/*
              The design's own words, which are a control only when the route gives them the list
              to open (ADR-044). The visible label stays the frame's; the accessible name says
              where the press leads, because the frame's count and the phone's own list are not
              the same thing (the rule frame 16's contact action follows).
            */}
            {onSeeReports ? (
              <Pressable
                accessibilityLabel={interpolate(t('discover.details.reports.seeAll.a11y'), {
                  count: String(details.reportsThisWeek),
                })}
                accessibilityRole="button"
                onPress={onSeeReports}
                testID="zone-details-see-all"
              >
                <AppText tone="accent" variant="label">
                  {interpolate(t('discover.details.reports.seeAll'), {
                    count: String(details.reportsThisWeek),
                  })}
                </AppText>
              </Pressable>
            ) : (
              <AppText tone="accent" variant="label">
                {interpolate(t('discover.details.reports.seeAll'), {
                  count: String(details.reportsThisWeek),
                })}
              </AppText>
            )}
          </View>
          <AppText variant="bodySmall">{t('discover.details.reports.quote')}</AppText>
          <AppText tone="muted" variant="metadata">
            {interpolate(t('discover.details.reports.meta'), {
              max: String(REPORT_YIELD_MAX),
              minutes: String(details.latestReport.minutesAgo),
              trust: t(TRUST_KEY[details.latestReport.trust]),
              yield: String(details.latestReport.yield),
            })}
          </AppText>
          <AppText tone="muted" variant="metadata">
            {t('discover.details.reports.scoring')}
          </AppText>
        </View>

        {/*
          The frame's own row (node 5:23080): its 54 px bookmark tile, 10 px from the action
          beside it. The tile is drawn whenever the screen knows which zone it is about — it
          acts on the picker's own plan, not on the route — and the action only when the caller
          supplied a destination.
        */}
        {zone ? (
          <View className="w-full flex-row items-center gap-gap">
            <Pressable
              // The frame names the control “Save zone”; a control that is already acting on a
              // saved zone says what its next press does instead (AGENTS.md §11.2).
              accessibilityLabel={t(
                saved ? 'discover.details.save.saved' : 'discover.details.save',
              )}
              accessibilityRole="button"
              // The bookmark is not a state the app has read yet while the record is loading,
              // and a control that cannot act may not claim one.
              accessibilityState={{ disabled: savingLoading, selected: saved }}
              disabled={savingLoading}
              onPress={() => {
                void toggle(zone.id);
              }}
              style={{
                alignItems: 'center',
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.control,
                borderWidth: 1,
                height: layout.actionHeight,
                justifyContent: 'center',
                width: layout.actionHeight,
              }}
              testID="zone-details-save"
            >
              {/*
                The glyph carries the state as a shape, not as a colour alone: outline for a
                zone that is not in the plan, filled for one that is. Feather has only the
                outline, so the frame's own bookmark is drawn from Material Icons, which has
                both.
              */}
              <MaterialIcons
                color={colors.accent}
                name={saved ? 'bookmark' : 'bookmark-border'}
                size={22}
              />
            </Pressable>

            {onNavigate ? (
              <View className="flex-1">
                <AppButton
                  icon={<Feather color={colors.onAccent} name="navigation" size={20} />}
                  label={interpolate(t('discover.details.navigate'), {
                    distance: formatDistance(DEMO_ROUTE.distanceMeters, locale),
                  })}
                  onPress={onNavigate}
                  testID="zone-details-navigate"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {saveError ? (
          <AppText testID="zone-details-save-failed" tone="danger" variant="bodySmall">
            {t('discover.details.saveFailed')}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flexible: { flexShrink: 1 },
  hero: { borderRadius: radii.lg, height: layout.zonePhotoHeight, width: '100%' },
  strong: { fontWeight: '600' },
  yieldCard: { gap: spacing.cardGap, padding: spacing.section },
});
