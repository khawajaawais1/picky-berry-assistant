import { Feather } from '@/components/atoms/app-icon';
import { useNetworkState } from 'expo-network';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Callout, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useReportQueue } from '@/hooks/use-report-queue';
import { formatShortDate, interpolate, useTranslation, type TranslationKey } from '@/services/i18n';
import { YIELD_RATING_MAX } from '@/services/report-queue';

import { connectionState } from '../domain/connection';
import { DEMO_DOWNLOADS, DEMO_REGION_SIZE_MB, demoStorageShare } from '../domain/downloads';
import { queuedReportRows, waitingLabelKey, type QueuedReportRow } from '../domain/queued-reports';

export type OfflineSyncScreenProps = {
  onBack?: () => void;
};

/**
 * The app's words for the species a stored report can name.
 *
 * Screen 10's chips own the same vocabulary (`features/discover/components/report-copy.ts`), and
 * this screen cannot import it: a feature's internals are its own (AGENTS.md §3). The two entries
 * are the whole of it, and a species the app has no word for is printed as the identifier it is
 * rather than as another berry's name.
 */
const SPECIES_LABEL_KEY: Record<string, TranslationKey> = {
  bilberry: 'report.species.bilberry',
  lingonberry: 'report.species.lingonberry',
};

/**
 * Screen 13 · Account and offline · Downloads (Figma node `5:23530`).
 *
 * The design's sync centre — “Ready beyond the signal” — and the part of it the app can be true
 * about: **what is still waiting on this phone**. Each row is a report screen 10 saved, with its
 * own visit, its own rating and the harvest the picker typed; the heading is the frame's own
 * sentence with the count as its value.
 *
 * This is what makes the queue a record rather than a promise, and it is the answer AGENTS.md §11
 * asks of every stored field — how the user gets a copy of what the app keeps about them
 * (ADR-014). Nothing here is sent anywhere, and the screen says so where the frame says it will
 * retry.
 *
 * The rest of the frame — its **downloaded region, the tiles and forecast saved with it, the
 * storage meter, its two actions and its last-sync line** — is drawn as **the design's own sample,
 * labelled as such** (ADR-042). Until that pass the app had left all of it out, on the reasoning
 * that a figure nothing measures must not be printed and a control that cannot act must not claim a
 * role; what changed is the treatment rather than the honesty: the figures are the frame's, the
 * screen says so above them in its own words, its eyebrow carries the season-demo disclosure, and
 * neither action claims a role — they are the frame's drawing, with the frame's words, and nothing
 * behind them (there is still no tile cache, no forecast download and no storage measurement:
 * ADR-031 and known issue 30 record what has to be true first).
 *
 * The frame's **status message** used to be on that list too, because the app had no way to see
 * the connection it claims (“You're offline”). The device's own network report makes it
 * observable, so the frame's sentence is now drawn exactly when it is true
 * (`domain/connection.ts` decides that) and never when the platform has not answered.
 *
 * Its **core navigation** is the app shell, like every other account-and-offline screen's.
 */
/**
 * One of the frame's own rows inside the region card: the design's label over its detail, and the
 * frame's value at the end. **It claims no role and opens nothing** — the design draws a chevron
 * there, and the app drops it, exactly as the settings screen's Language row does: a row that will
 * never open anything may not draw the sign that says it will (AGENTS.md §11.2).
 */
function DownloadRow({ detail, title, value }: { detail: string; title: string; value: string }) {
  return (
    <View className="w-full flex-row items-center gap-gap py-setting">
      <View className="flex-1 gap-tight">
        <AppText variant="cardTitle">{title}</AppText>
        <AppText tone="muted" variant="caption">
          {detail}
        </AppText>
      </View>
      <AppText tone="accent" variant="rowValue">
        {value}
      </AppText>
    </View>
  );
}

/**
 * One of the frame's two actions, drawn and inert.
 *
 * It is a `View`, not an `AppButton`, because `AppButton` always claims the button role (it is the
 * app's real action) — and an action that cannot act must not claim one (AGENTS.md §11.2). What the
 * user gets instead is the frame's own drawing with the frame's own words, under a sentence saying
 * the block is the design's sample.
 */
function DownloadAction({ label, tone }: { label: string; tone: 'primary' | 'secondary' }) {
  const { colors } = useAppTheme();
  const primary = tone === 'primary';

  return (
    <View
      className="min-h-action w-full flex-row items-center justify-center gap-sm rounded-control px-md"
      style={{
        backgroundColor: primary ? colors.accent : colors.surface,
        borderColor: colors.border,
        borderWidth: primary ? 0 : 1,
      }}
      testID={`offline-action-${tone}`}
    >
      {primary ? <Feather color={colors.onAccent} name="refresh-cw" size={20} /> : null}
      <AppText
        style={{ color: primary ? colors.onAccent : colors.accent, fontWeight: '600' }}
        variant="body"
      >
        {label}
      </AppText>
    </View>
  );
}

export function OfflineSyncScreen({ onBack }: OfflineSyncScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const { error, loading, reports } = useReportQueue();
  const network = useNetworkState();

  const rows = queuedReportRows(reports, locale);
  const connection = connectionState(network);

  return (
    <Screen
      edges={['top']}
      eyebrow={t('offline.eyebrow')}
      onBack={onBack}
      title={t('offline.title')}
    >
      <View className="w-full gap-section">
        {/*
          The frame's own status message (node 5:23544), and the only part of it the app may
          state: it is drawn when the device reports that there is no reachable connection, and
          left out while the platform has not answered or has said the connection is up.
        */}
        {connection === 'offline' ? (
          <Callout
            icon={<Feather color={colors.warning} name="cloud-off" size={20} />}
            testID="offline-status"
            title={t('offline.status.title')}
            tone="warning"
          >
            {t('offline.status.body')}
          </Callout>
        ) : null}

        {/*
          The frame's downloaded region and everything that hangs off it — drawn as the design's
          own sample, and said so before any of it is drawn. The sentence is the app's: the frame
          has no reason to disclose its own composition, and a picker reading “Downloaded” over a
          phone that has downloaded nothing is exactly what a disclosure is for.
        */}
        <AppText tone="muted" variant="metadata" testID="offline-sample-note">
          {t('offline.sample.note')}
        </AppText>

        <View
          className="w-full gap-cardGap rounded-lg px-section py-section"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
          testID="offline-region"
        >
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="map" size={22} />
            <View className="flex-1 gap-tight">
              <AppText variant="sectionHeading">{t('offline.region.title')}</AppText>
              <AppText tone="muted" variant="caption">
                {interpolate(t('offline.region.detail'), {
                  area: String(DEMO_DOWNLOADS.areaKm2),
                  size: String(DEMO_REGION_SIZE_MB),
                })}
              </AppText>
            </View>
            <Feather color={colors.success} name="check-circle" size={22} />
          </View>

          {/* The frame's 1 px divider inside the card (node 5:23556). */}
          <View style={{ backgroundColor: colors.border, height: 1 }} />

          <DownloadRow
            detail={t('offline.tiles.detail')}
            title={interpolate(t('offline.tiles.title'), {
              count: String(DEMO_DOWNLOADS.zoneCount),
            })}
            value={t('offline.cached')}
          />
          <DownloadRow
            detail={interpolate(t('offline.forecast.detail'), {
              date: formatShortDate(DEMO_DOWNLOADS.forecastSavedOn, locale),
              time: DEMO_DOWNLOADS.forecastSavedAtTime,
            })}
            title={t('offline.forecast.title')}
            value={t('offline.cached')}
          />

          <AppText tone="muted" variant="metadata">
            {t('offline.refresh.note')}
          </AppText>
        </View>

        {/*
          The frame's storage block (node 5:23572): the label, what is used of what there is, and
          the meter. Its fill is computed from those two figures rather than drawn to a width, so
          the bar cannot disagree with the line above it.
        */}
        <View className="w-full gap-sm" testID="offline-storage">
          <View className="w-full flex-row items-center justify-between">
            <AppText style={{ fontWeight: '600' }} variant="bodySmall">
              {t('offline.storage.label')}
            </AppText>
            <AppText tone="muted" variant="bodySmall">
              {interpolate(t('offline.storage.value'), {
                total: String(DEMO_DOWNLOADS.storage.totalMb),
                used: String(DEMO_DOWNLOADS.storage.usedMb),
              })}
            </AppText>
          </View>
          <View
            style={{
              backgroundColor: colors.border,
              borderRadius: radii.pill,
              height: spacing.sm,
            }}
          >
            <View
              style={{
                backgroundColor: colors.accent,
                borderRadius: radii.pill,
                height: spacing.sm,
                width: `${demoStorageShare() * 100}%`,
              }}
              testID="offline-storage-meter-fill"
            />
          </View>
        </View>

        {/*
          The frame's two actions (nodes 5:23587 and 5:23590), drawn as the readings they are: the
          drawing is the frame's, and neither claims a role — there is no transport to retry over
          and no region store to manage, so a pressable action here would promise both.
        */}
        <DownloadAction label={t('offline.retry')} tone="primary" />
        <DownloadAction label={t('offline.manage')} tone="secondary" />

        <AppText tone="muted" variant="bodySmall">
          {interpolate(t('offline.lastSync'), {
            date: formatShortDate(DEMO_DOWNLOADS.lastSyncOn, locale),
            time: DEMO_DOWNLOADS.lastSyncAtTime,
          })}
        </AppText>

        <View
          className="w-full gap-cardGap rounded-lg px-section py-section"
          style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
          testID="offline-queued"
        >
          {!loading && !error && rows.length === 0 ? (
            <AppText tone="muted" variant="bodySmall">
              {t('offline.empty')}
            </AppText>
          ) : null}

          {rows.length > 0 ? (
            <>
              <View className="w-full flex-row items-center gap-gap">
                <Feather color={colors.warning} name="cloud-off" size={22} />
                <AppText className="flex-1" variant="rowTitle">
                  {interpolate(t(waitingLabelKey(rows.length)), { count: String(rows.length) })}
                </AppText>
              </View>

              {rows.map((row, index) => (
                <QueuedReport
                  index={index}
                  key={`${row.zoneNumber}-${row.date}-${index}`}
                  row={row}
                />
              ))}

              <AppText tone="muted" variant="metadata">
                {t('offline.note')}
              </AppText>
            </>
          ) : null}

          {error ? (
            <StatusMessage testID="offline-read-failed" tone="danger" variant="bodySmall">
              {t('common.readFailed')}
            </StatusMessage>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

/**
 * One waiting report, as the frame's card prints it: which zone and species it is about, the
 * visit's own line (its day, its length, how plentiful the berries were, what was brought home)
 * and the design's chip saying that the visit and its report travel together.
 *
 * The harvest is left out of the line when the picker recorded none, rather than printed as a
 * zero: the row shows what they said, not what they might have meant.
 */
function QueuedReport({ row, index }: { row: QueuedReportRow; index: number }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const species = SPECIES_LABEL_KEY[row.speciesId];
  const values = {
    date: row.date,
    max: String(YIELD_RATING_MAX),
    minutes: String(row.minutes),
    yield: String(row.yieldRating),
  };

  return (
    <View className="w-full gap-xs" testID={`offline-report-${index}`}>
      <AppText variant="cardTitle">
        {interpolate(t('offline.row.title'), {
          species: species ? t(species) : row.speciesId,
          zone: row.zoneNumber,
        })}
      </AppText>
      <AppText tone="muted" variant="caption">
        {row.amountText === ''
          ? interpolate(t('offline.row.metaNoAmount'), values)
          : interpolate(t('offline.row.meta'), { ...values, amount: row.amountText })}
      </AppText>
      {/*
        `min-h-chip`, not `h-chip`: the design's chip is 36 px tall and its own label fits one
        line in it. At the largest system text size the Finnish label wraps to two, and a fixed
        height would clip it — the frame's 36 px is the floor, not the ceiling (ADR-019).
      */}
      <View
        className="min-h-chip flex-row items-center self-start rounded-pill px-gap"
        style={{
          backgroundColor: colors.warningMuted,
          borderColor: colors.warningMuted,
          borderWidth: 1,
        }}
      >
        <AppText style={{ color: colors.warning, fontWeight: '600' }} variant="label">
          {t('offline.row.chip')}
        </AppText>
      </View>
    </View>
  );
}
