import { Feather } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { ChoiceChips, StatusMessage, type ChoiceChipOption } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportQueue } from '@/hooks/use-report-queue';
import { interpolate, useTranslation, type Translation } from '@/services/i18n';

import {
  DEMO_HARVEST_BY_VISIT,
  DEMO_SEASON_TOTALS,
  VISIT_HISTORY_PERIODS,
  barHeights,
  demoHistoryRows,
  formatDecimal,
  historyCountLabelKey,
  historyFor,
  historyPeriodLabelKey,
  historyRowMeta,
  outsideCountLabelKey,
  outsidePeriodCount,
  visitHistoryRows,
  type VisitHistoryEntry,
  type VisitHistoryPeriod,
} from '../domain/season-insights';
import { speciesLabelKey } from './species-copy';

export type SeasonInsightsScreenProps = {
  onBack?: () => void;
};

/**
 * Screen 11 · Core picker · Visits and analytics (Figma node `5:23343`).
 *
 * The picker's own season: the period chips the frame draws, the month's summary card, a small
 * chart of what each visit brought home, and the visits themselves.
 *
 * The screen tells two kinds of thing, and they are kept apart deliberately:
 *
 * - the **summary and the chart are the design's sample month** (`DEMO_SEASON_TOTALS`,
 *   `DEMO_HARVEST_BY_VISIT`). There is no analytics service, exactly as there is no zone source
 *   behind frames 06–10, and the eyebrow says so the way frame 06's own eyebrow does;
 * - the **history is the picker's own record**: it is the device's report queue read back
 *   (`src/services/report-queue.ts`), newest first, above the design's three sample visits.
 *   That is what makes screen 10's write visible instead of a promise, and it is the half of
 *   this frame the app can be strictly true about — every row it shows was saved on this phone.
 *
 * The frame's **period chips are a real choice** (ADR-043): they filter the history below them,
 * and the lines under its heading say which period is showing, how many visits it holds and how
 * many it leaves out — the app cannot total a picker's own season, but it can be exact about what
 * the list in front of them contains. One deliberate limit stays, recorded in PROJECT.md: the
 * frame's **core navigation** is absent like every other core picker screen's, because the tab
 * shell is an architecture decision of its own (PROJECT.md, open question 22).
 */
export function SeasonInsightsScreen({ onBack }: SeasonInsightsScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const { error, reports } = useReportQueue();
  /**
   * The screen opens on **“All visits”** rather than on the chip the frame draws selected, and the
   * reason is the flow that lands here: screen 10 saves a report and leads to this screen, so the
   * default has to be the period that holds the visit the picker just made. The design's own month
   * is one press away, and the summary above still describes it (ADR-043).
   */
  const [period, setPeriod] = useState<VisitHistoryPeriod>('all');

  const allRows: VisitHistoryEntry[] = [
    ...visitHistoryRows(reports, locale),
    ...demoHistoryRows(locale),
  ];
  const rows = historyFor(allRows, period);
  const outside = outsidePeriodCount(allRows, period);
  const periodName = t(historyPeriodLabelKey(period));
  const heights = barHeights(DEMO_HARVEST_BY_VISIT.map((visit) => visit.kilograms));

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.season.eyebrow')}
      onBack={onBack}
      title={t('discover.season.title')}
    >
      <View className="w-full gap-section">
        {/* The frame's own two chips, as one radio group: they are a real control here, so the group
            carries the role, its own name and the selection — and its metrics are the frame's own
            36 px pill at 12 px inset, which is why the shared component draws them. */}
        <ChoiceChips
          label={t('discover.season.period.label')}
          onChange={setPeriod}
          options={periodOptions(t)}
          value={period}
        />

        <View
          className="w-full gap-cardGap rounded-lg px-section py-section"
          style={{ backgroundColor: colors.accentMuted }}
          testID="season-summary"
        >
          <AppText style={{ fontWeight: '600' }} variant="bodySmall">
            {t('discover.season.summary')}
          </AppText>

          <View className="w-full flex-row gap-gap">
            <SeasonMetric
              label={t('discover.season.metric.harvested')}
              value={`${formatDecimal(DEMO_SEASON_TOTALS.harvestedKg, locale)} kg`}
            />
            <SeasonMetric
              label={t('discover.season.metric.rate')}
              value={formatDecimal(DEMO_SEASON_TOTALS.kgPerHour, locale)}
            />
          </View>

          <View
            className="w-full"
            style={{ backgroundColor: colors.border, height: 1 }}
            testID="season-divider"
          />

          <View className="w-full flex-row gap-gap">
            <SeasonMetric
              label={t('discover.season.metric.zones')}
              value={String(DEMO_SEASON_TOTALS.zonesVisited)}
            />
            <SeasonMetric
              label={t('discover.season.metric.stay')}
              value={`${formatDecimal(DEMO_SEASON_TOTALS.stayHours, locale)} h`}
            />
            <SeasonMetric
              label={t('discover.season.metric.median')}
              value={`${DEMO_SEASON_TOTALS.medianMinutes} min`}
            />
          </View>
        </View>

        <View
          className="w-full gap-sm rounded-lg px-section py-section"
          style={{ borderColor: colors.border, borderWidth: 1 }}
          testID="season-chart"
        >
          <View className="w-full flex-row items-center gap-gap">
            <AppText className="flex-1" style={{ fontWeight: '600' }} variant="body">
              {t('discover.season.chart.title')}
            </AppText>
            <AppText tone="muted" variant="metadata">
              {t('discover.season.chart.unit')}
            </AppText>
          </View>

          <View className="w-full flex-row items-end justify-center" style={{ gap: spacing.chart }}>
            {DEMO_HARVEST_BY_VISIT.map((visit, index) => (
              <HarvestBar
                date={visit.date}
                height={heights[index] ?? 0}
                key={visit.date}
                label={formatDecimal(visit.kilograms, locale)}
                testID={`season-bar-${index}`}
              />
            ))}
          </View>
        </View>

        <View className="w-full gap-xs">
          <AppText variant="sectionHeading">{t('discover.season.history.title')}</AppText>
          {/* What the chips are showing: the period and the visits in it, and — only under the
              month chip, since nothing is outside “All visits” — how many visits are not on the
              list, so no visit is hidden without a trace. */}
          <AppText testID="season-history-count" tone="muted" variant="metadata">
            {interpolate(t(historyCountLabelKey(rows.length)), {
              count: String(rows.length),
              period: periodName,
            })}
          </AppText>
          {outside > 0 ? (
            <AppText testID="season-history-outside" tone="muted" variant="metadata">
              {interpolate(t(outsideCountLabelKey(outside)), { count: String(outside) })}
            </AppText>
          ) : null}
        </View>

        <View className="w-full gap-md">
          {rows.map((row, index) => (
            <HistoryRow index={index} key={`${row.zoneNumber}-${row.date}-${index}`} row={row} />
          ))}
        </View>

        {error ? (
          <StatusMessage testID="season-read-failed" tone="danger" variant="bodySmall">
            {t('common.readFailed')}
          </StatusMessage>
        ) : null}

        <AppText tone="muted" variant="metadata">
          {t('discover.season.note')}
        </AppText>
      </View>
    </Screen>
  );
}

/**
 * The frame's two periods as the chips' options, in its own order (nodes 5:23349 and 5:23354):
 * the month its own sample visits are in, then everything the phone holds.
 */
function periodOptions(t: Translation['t']): readonly ChoiceChipOption<VisitHistoryPeriod>[] {
  return VISIT_HISTORY_PERIODS.map((period) => ({
    label: t(historyPeriodLabelKey(period)),
    value: period,
  }));
}

/** One of the summary card's five figures: the design's 27/37.8 value over its 12/16.8 label. */
function SeasonMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-xs">
      <AppText tone="accent" variant="stat">
        {value}
      </AppText>
      <AppText tone="muted" variant="metadata">
        {label}
      </AppText>
    </View>
  );
}

/**
 * One bar of the chart: its value over the bar, the bar, and the day under it. The height is the
 * data's (`barHeights`), the width is the frame's own 44 px, and the three parts sit 5 px apart.
 */
function HarvestBar({
  date,
  height,
  label,
  testID,
}: {
  date: string;
  height: number;
  label: string;
  testID: string;
}) {
  const { colors } = useAppTheme();

  return (
    <View className="items-center" style={{ gap: spacing.chartStack }}>
      <AppText style={{ color: colors.accent, fontWeight: '600' }} variant="metadata">
        {label}
      </AppText>
      <View
        style={{ backgroundColor: colors.accent, height, width: layout.harvestBarWidth }}
        testID={testID}
      />
      <AppText tone="muted" variant="ratingLabel">
        {date}
      </AppText>
    </View>
  );
}

/**
 * One visit as the frame draws it: a map pin, the zone and its species, the visit's own line
 * (its day, its length, what was brought home) and its sync status. The status is a word, never
 * colour alone — and on a row the picker saved, it is the queue's own truth about itself.
 */
function HistoryRow({ row, index }: { row: VisitHistoryEntry; index: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const species = speciesLabelKey(row.speciesId);
  const queued = row.status === 'queued';

  return (
    <View className="w-full flex-row items-center gap-gap" testID={`season-history-${index}`}>
      <Feather color={colors.accent} name="map-pin" size={22} />
      <View className="flex-1 gap-xs">
        <AppText variant="cardTitle">
          {interpolate(t('discover.season.row.title'), {
            species: species ? t(species) : row.speciesId,
            zone: row.zoneNumber,
          })}
        </AppText>
        <AppText tone="muted" variant="metadata">
          {historyRowMeta(row)}
        </AppText>
      </View>
      <AppText
        style={{ fontWeight: '600' }}
        tone={queued ? 'warning' : 'success'}
        variant="ratingLabel"
      >
        {queued ? t('discover.season.row.queued') : t('discover.season.row.synced')}
      </AppText>
    </View>
  );
}
