import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatShortDate, interpolate, useTranslation } from '@/services/i18n';
import { YIELD_RATING_MAX } from '@/services/report-queue';
import type { ReportsApi, ZoneReport } from '@/services/reports';

import type { Species } from '../domain/species';
import { formatDecimal } from '../domain/season-insights';
import { speciesLabelKey } from './species-copy';

export type ZoneReportsScreenProps = {
  /** The zone whose reports to list, as the zone screen handed it over. */
  zoneId?: string;
  /** The berry the zone screen was reading; the list shows that layer's reports. */
  species?: Species;
  reportsApi?: Pick<ReportsApi, 'forZone'>;
  onBack?: () => void;
};

/**
 * The screen frame 07's “See all” opens (ADR-044): the zone's recent reports from every picker,
 * read from `GET /zones/:id/reports`. Each row carries the berry, the day, the rating on the 1–5
 * scale, the harvest when one was weighed and whether the reporter is trusted — never who sent it.
 */
export function ZoneReportsScreen({ zoneId, species, reportsApi, onBack }: ZoneReportsScreenProps) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['zone-reports', zoneId, species],
    queryFn: () => reportsApi!.forZone(zoneId!, species),
    enabled: reportsApi !== undefined && zoneId !== undefined,
    retry: false,
  });
  const page = query.data;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.zoneReports.eyebrow')}
      onBack={onBack}
      title={
        page?.zoneName
          ? interpolate(t('discover.zoneReports.title'), { zone: page.zoneName })
          : t('discover.zoneReports.heading')
      }
    >
      <View className="w-full gap-section">
        {zoneId === undefined || reportsApi === undefined ? (
          <StatusMessage testID="zone-reports-unknown" tone="muted" variant="bodySmall">
            {t('discover.details.unknown')}
          </StatusMessage>
        ) : !page ? (
          <StatusMessage
            testID={query.isError ? 'zone-reports-read-failed' : 'zone-reports-loading'}
            tone={query.isError ? 'danger' : 'muted'}
            variant="bodySmall"
          >
            {t(query.isError ? 'common.readFailed' : 'common.loading')}
          </StatusMessage>
        ) : (
          <>
            <AppText testID="zone-reports-count" tone="muted" variant="metadata">
              {interpolate(
                t(
                  page.countThisWeek === 1
                    ? 'discover.zoneReports.week.one'
                    : 'discover.zoneReports.week.many',
                ),
                { count: String(page.countThisWeek) },
              )}
            </AppText>

            {page.reports.length === 0 ? (
              <AppText testID="zone-reports-empty" variant="bodySmall">
                {t('discover.zoneReports.empty')}
              </AppText>
            ) : (
              <View className="w-full gap-md">
                {page.reports.map((report, index) => (
                  <ReportRow index={index} key={report.id} report={report} />
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

function ReportRow({ report, index }: { report: ZoneReport; index: number }) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const species = speciesLabelKey(report.species);
  const values = {
    date: formatShortDate(report.recordedAt, locale),
    max: String(YIELD_RATING_MAX),
    yield: String(report.rating),
  };
  const meta =
    report.amountKg === null
      ? interpolate(t('discover.zoneReports.row.metaNoAmount'), values)
      : interpolate(t('discover.zoneReports.row.meta'), {
          ...values,
          amount: `${formatDecimal(report.amountKg, locale)} kg`,
        });
  const trusted = report.trust === 'trusted';

  return (
    <View className="w-full flex-row items-center gap-gap" testID={`zone-report-${index}`}>
      <Feather color={colors.accent} name="map-pin" size={22} />
      <View className="flex-1 gap-xs">
        <AppText variant="cardTitle">{species ? t(species) : report.species}</AppText>
        <AppText tone="muted" variant="metadata">
          {meta}
        </AppText>
      </View>
      <AppText
        style={{ fontWeight: '600' }}
        tone={trusted ? 'success' : 'muted'}
        variant="ratingLabel"
      >
        {t(
          trusted
            ? 'discover.details.reports.trust.trusted'
            : 'discover.details.reports.trust.unverified',
        )}
      </AppText>
    </View>
  );
}
