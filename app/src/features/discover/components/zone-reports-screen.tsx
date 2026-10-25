import { Feather } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportQueue } from '@/hooks/use-report-queue';
import { interpolate, useTranslation } from '@/services/i18n';
import { YIELD_RATING_MAX } from '@/services/report-queue';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import { DEMO_ZONE_DETAILS } from '../domain/zone-details';
import {
  zoneReportCountLabelKey,
  zoneReportRows,
  type ZoneReportRow,
} from '../domain/zone-reports';
import { speciesLabelKey } from './species-copy';

export type ZoneReportsScreenProps = {
  onBack?: () => void;
};

/**
 * The screen frame 07's “See all 11” (node `5:23076`) opens — **the design never drew it**.
 *
 * The link names the zone's reports for the week, and the design's eleven are its own sample
 * (the same week the yield card counts above it). There is no report stream: nothing returns
 * another picker's report, and a score is derived server-side from evidence this app never sees.
 * What the app can be true about is the half a phone holds — the reports the picker saved
 * themselves (`src/services/report-queue.ts`) — so this screen states both: the frame's own week
 * as the design's sample, and beneath it exactly what this device holds for the zone.
 *
 * That is the rule every app-drawn screen in this repository follows: a promise on a frame gets a
 * destination that states what the app can do, names what it cannot, and invents nothing to look
 * whole (ADR-030, ADR-039, ADR-040, and ADR-044 for this one). A report of another zone is not
 * listed under this zone's name, and a report the store could not be read from is a line saying
 * so rather than an empty list the picker did not write.
 *
 * The zone it is about is the design's own composition — the one frame 07 is about — so the
 * header carries the “SEASON DEMO” disclosure frame 06's map and frame 11's season screen carry.
 *
 * Its **core navigation** is the app shell, like every other core picker screen's (ADR-022).
 */
export function ZoneReportsScreen({ onBack }: ZoneReportsScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const { error, loading, reports } = useReportQueue();

  // The zone the frame's own card is about: the same lookup frame 07 does, so the two screens
  // cannot name different zones for one story.
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);
  const rows = zone ? zoneReportRows(reports, zone.number, locale) : [];

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.zoneReports.eyebrow')}
      onBack={onBack}
      title={interpolate(t('discover.zoneReports.title'), { zone: zone?.number ?? '' })}
    >
      <View className="w-full gap-section">
        {/* What the frame's own eleven are, and what is under it: the frame's count is read from
            the zone's figures rather than repeated here, so the card and this line cannot
            disagree about the design's own week. */}
        <AppText tone="muted" variant="bodySmall" testID="zone-reports-sample">
          {interpolate(t('discover.zoneReports.intro'), {
            count: String(DEMO_ZONE_DETAILS.reportsThisWeek),
          })}
        </AppText>

        {loading ? (
          <StatusMessage testID="zone-reports-loading" tone="muted" variant="bodySmall">
            {t('common.loading')}
          </StatusMessage>
        ) : error ? (
          <StatusMessage testID="zone-reports-read-failed" tone="danger" variant="bodySmall">
            {t('common.readFailed')}
          </StatusMessage>
        ) : (
          <>
            <AppText testID="zone-reports-count" tone="muted" variant="metadata">
              {interpolate(t(zoneReportCountLabelKey(rows.length)), {
                count: String(rows.length),
              })}
            </AppText>

            {rows.length === 0 ? (
              <AppText testID="zone-reports-empty" variant="bodySmall">
                {t('discover.zoneReports.empty')}
              </AppText>
            ) : (
              <View className="w-full gap-md">
                {rows.map((row, index) => (
                  <ReportRow
                    index={index}
                    key={`${row.recordedAt}-${row.speciesId}-${index}`}
                    row={row}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* The other half of the design's own list, named rather than faked: the zone's reports
            from other pickers need the report service, which does not exist. */}
        <AppText tone="muted" variant="metadata" testID="zone-reports-missing">
          {t('discover.zoneReports.missing')}
        </AppText>
      </View>
    </Screen>
  );
}

/**
 * One report as the frame's own rows print one: the species, the line of facts it carries — its
 * day, its length, the rating the picker gave on the design's 1–5 scale and the harvest they
 * typed — and the queue's own word for its state. Colour is never the only signal: “Queued” is
 * the state in words, as it is on the season screen's rows.
 */
function ReportRow({ row, index }: { row: ZoneReportRow; index: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const species = speciesLabelKey(row.speciesId);
  const meta =
    row.amountText === ''
      ? interpolate(t('discover.zoneReports.row.metaNoAmount'), {
          date: row.date,
          max: String(YIELD_RATING_MAX),
          minutes: String(row.minutes),
          yield: String(row.yieldRating),
        })
      : interpolate(t('discover.zoneReports.row.meta'), {
          amount: row.amountText,
          date: row.date,
          max: String(YIELD_RATING_MAX),
          minutes: String(row.minutes),
          yield: String(row.yieldRating),
        });

  return (
    <View className="w-full flex-row items-center gap-gap" testID={`zone-report-${index}`}>
      <Feather color={colors.accent} name="map-pin" size={22} />
      <View className="flex-1 gap-xs">
        <AppText variant="cardTitle">
          {/* A species the catalogue has no word for is printed as the identifier it is, never as
              another berry's name (the rule screen 11's rows follow). */}
          {species ? t(species) : row.speciesId}
        </AppText>
        <AppText tone="muted" variant="metadata">
          {meta}
        </AppText>
      </View>
      <AppText style={{ fontWeight: '600' }} tone="warning" variant="ratingLabel">
        {t('discover.season.row.queued')}
      </AppText>
    </View>
  );
}
