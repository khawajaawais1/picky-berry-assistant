import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { ChoiceChips, StatusMessage, type ChoiceChipOption } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { VisitsApi } from '@/features/visits';
import { useReportQueue } from '@/hooks/use-report-queue';
import {
  formatLongDate,
  formatShortDate,
  interpolate,
  useTranslation,
  type Translation,
} from '@/services/i18n';
import type { ReportsApi, Season } from '@/services/reports';

import {
  VISIT_HISTORY_PERIODS,
  barHeights,
  formatDecimal,
  historyCountLabelKey,
  historyFor,
  historyPeriodLabelKey,
  historyRowMeta,
  outsideCountLabelKey,
  outsidePeriodCount,
  syncedHistoryRows,
  visitHistoryRows,
  type VisitHistoryEntry,
  type VisitHistoryPeriod,
} from '../domain/season-insights';
import { speciesLabelKey } from './species-copy';

export type SeasonInsightsScreenProps = {
  onBack?: () => void;
  /** The zone service's record of this account's visits (ADR-065). */
  visitsApi?: Pick<VisitsApi, 'list'>;
  /** The picker's reports and season figures; without it only this phone's queue is shown. */
  reportsApi?: Pick<ReportsApi, 'mine' | 'season'>;
};

/** The chart draws the season's latest harvests, this many at most. */
const CHART_BARS = 7;

/**
 * Screen 11 · Core picker · Visits and analytics (Figma node `5:23343`).
 *
 * The picker's own season, all of it read from the API: the summary card and the chart are
 * `GET /me/season`, and the history is the reports still queued on this phone followed by the
 * ones the API holds (`GET /me/reports`). The period chips filter that history to this month or
 * everything, and the lines under its heading say how many rows each period holds and leaves out.
 * The screen opens on “All visits”, because screen 10 saves a report and lands here.
 */
export function SeasonInsightsScreen({ onBack, visitsApi, reportsApi }: SeasonInsightsScreenProps) {
  const { locale, t } = useTranslation();
  const { error, reports } = useReportQueue();
  const [period, setPeriod] = useState<VisitHistoryPeriod>('all');
  const season = useQuery({
    queryKey: ['me', 'season'],
    queryFn: () => reportsApi!.season(),
    enabled: reportsApi !== undefined,
    retry: false,
  });
  const synced = useQuery({
    queryKey: ['me', 'reports'],
    queryFn: () => reportsApi!.mine(),
    enabled: reportsApi !== undefined,
    retry: false,
  });

  const queuedIds = new Set(
    reports.flatMap((report) => (report.clientId ? [report.clientId] : [])),
  );
  const allRows: VisitHistoryEntry[] = [
    ...visitHistoryRows(reports, locale),
    ...syncedHistoryRows(synced.data ?? [], queuedIds, locale),
  ];
  const rows = historyFor(allRows, period);
  const outside = outsidePeriodCount(allRows, period);
  const periodName = t(historyPeriodLabelKey(period));

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

        {season.data ? (
          <SeasonFigures season={season.data} />
        ) : reportsApi ? (
          <StatusMessage
            testID="season-summary-status"
            tone={season.isError ? 'danger' : 'muted'}
            variant="bodySmall"
          >
            {t(
              season.isError ? 'discover.season.figures.failed' : 'discover.season.figures.loading',
            )}
          </StatusMessage>
        ) : null}

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
            <HistoryRow index={index} key={`${row.recordedAt}-${row.status}-${index}`} row={row} />
          ))}
          {rows.length === 0 && !synced.isLoading ? (
            <AppText testID="season-history-empty" tone="muted" variant="bodySmall">
              {t('discover.season.history.empty')}
            </AppText>
          ) : null}
        </View>

        {error || synced.isError ? (
          <StatusMessage testID="season-read-failed" tone="danger" variant="bodySmall">
            {t('common.readFailed')}
          </StatusMessage>
        ) : null}

        {visitsApi ? <RecordedVisits api={visitsApi} /> : null}

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
function SeasonFigures({ season }: { season: Season }) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const bars = season.harvestByReport.slice(-CHART_BARS);
  const heights = barHeights(bars.map((bar) => bar.kilograms));

  return (
    <>
      <View
        className="w-full gap-cardGap rounded-lg px-section py-section"
        style={{ backgroundColor: colors.accentMuted }}
        testID="season-summary"
      >
        <AppText style={{ fontWeight: '600' }} variant="bodySmall">
          {interpolate(t('discover.season.summary'), { year: String(season.year) })}
        </AppText>

        <View className="w-full flex-row gap-gap">
          <SeasonMetric
            label={t('discover.season.metric.harvested')}
            value={`${formatDecimal(season.harvestedKg, locale)} kg`}
          />
          <SeasonMetric
            label={t('discover.season.metric.rate')}
            value={season.kgPerHour === null ? '–' : formatDecimal(season.kgPerHour, locale)}
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
            value={String(season.zonesVisited)}
          />
          <SeasonMetric
            label={t('discover.season.metric.stay')}
            value={`${formatDecimal(season.stayHours, locale)} h`}
          />
          <SeasonMetric
            label={t('discover.season.metric.median')}
            value={season.medianMinutes === null ? '–' : `${season.medianMinutes} min`}
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

        {bars.length === 0 ? (
          <AppText testID="season-chart-empty" tone="muted" variant="bodySmall">
            {t('discover.season.chart.empty')}
          </AppText>
        ) : (
          <View className="w-full flex-row items-end justify-center" style={{ gap: spacing.chart }}>
            {bars.map((bar, index) => (
              <HarvestBar
                date={formatShortDate(bar.recordedAt, locale)}
                height={heights[index] ?? 0}
                key={bar.reportId}
                label={formatDecimal(bar.kilograms, locale)}
                testID={`season-bar-${index}`}
              />
            ))}
          </View>
        )}
      </View>
    </>
  );
}

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
            zone: row.zoneName || t('discover.season.recorded.unknownZone'),
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

/**
 * The visits the zone service recorded for this account, newest first (ADR-065). Its own
 * component, so the query is asked only when the route supplies the API. A failed read is said,
 * never drawn as an empty record.
 */
function RecordedVisits({ api }: { api: Pick<VisitsApi, 'list'> }) {
  const { locale, t } = useTranslation();
  const query = useQuery({
    queryKey: ['visits', 'recorded'],
    queryFn: () => api.list(),
    retry: false,
  });

  return (
    <View className="w-full gap-xs" testID="season-recorded">
      <AppText variant="sectionHeading">{t('discover.season.recorded.title')}</AppText>
      {query.data ? (
        query.data.visits.length === 0 ? (
          <AppText tone="muted" variant="bodySmall">
            {t('discover.season.recorded.empty')}
          </AppText>
        ) : (
          query.data.visits.map((visit) => {
            const minutes = Math.floor(visit.durationSeconds / 60);
            return (
              <AppText key={visit.id} tone="muted" variant="bodySmall">
                {interpolate(
                  t(
                    minutes < 1
                      ? 'discover.season.recorded.rowShort'
                      : 'discover.season.recorded.row',
                  ),
                  {
                    date: formatLongDate(visit.startedAt, locale),
                    minutes: String(minutes),
                    zone: visit.zoneName ?? t('discover.season.recorded.unknownZone'),
                  },
                )}
              </AppText>
            );
          })
        )
      ) : (
        <StatusMessage tone={query.isError ? 'danger' : 'muted'} variant="bodySmall">
          {t(
            query.isError ? 'discover.season.recorded.failed' : 'discover.season.recorded.loading',
          )}
        </StatusMessage>
      )}
    </View>
  );
}
