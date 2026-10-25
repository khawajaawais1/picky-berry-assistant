import { Feather } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, ChoiceChips, FormField, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';
import type { VisitReport, YieldRating } from '@/services/report-queue';

import { CARD_ZONE_STATE, DEMO_ZONES } from '../domain/zone';
import {
  DEFAULT_YIELD_RATING,
  DEMO_VISIT_WINDOW,
  REPORT_SPECIES,
  REPORT_SPECIES_MORE,
  buildVisitReport,
  visitMinutes,
  type ReportSpecies,
} from '../domain/visit-report';
import { RATING_MEANING_KEY } from './report-copy';
import { SPECIES_LABEL_KEY } from './species-copy';
import { YieldRatingRow } from './yield-rating';

export type PostVisitFeedbackScreenProps = {
  onBack?: () => void;
  /**
   * Writes the report to the device's queue. Supplied by the route, which calls the queue
   * service; the screen never touches storage itself. Rejects when the write failed, and the
   * screen then says so instead of claiming the report was kept.
   */
  onSave?: (report: VisitReport) => Promise<void>;
  /** Leaves the report unsaved. Supplied by the route. */
  onSkip?: () => void;
};

/**
 * Screen 10 · Core picker · Post-visit feedback (Figma node `5:23259`).
 *
 * The design's “quick report”: what the visit was (its own exit summary), then the picker's
 * answers — which species the report is about, how plentiful the berries were, and what they
 * brought home — and the design's own note that the report waits on the phone rather than on
 * a connection.
 *
 * Three things are deliberately absent, all recorded in PROJECT.md: the frame's **“Add a berry
 * photo” row** (evidence media needs an image picker, camera and photo permissions and its own
 * security rules — the owner deferred it on 2026-10-09) and the **frame's own rating is the
 * default** — the picker can save without touching the row, so the design's answer, “Good”, is
 * where it starts.
 *
 * The frame's third species chip, **“More”**, is real: the design names three berries in its own
 * chips, and the app's vocabulary adds the pilot's fourth (crowberry), so pressing it reveals
 * the rest of the vocabulary the app can name (`REPORT_SPECIES_MORE`) rather than opening an
 * index it does not have. It is a disclosure, so it announces itself as one and stays on the row
 * as “Fewer” once the vocabulary is open — a chip that unmounted itself could never report
 * `expanded: true` and dropped web focus with it (frontend review, 2026-10-25). A chosen berry
 * outside the design's two stays on the collapsed row.
 *
 * Saving is real: `onSave` writes the report to the device's queue (`src/services/report-queue`)
 * and a failed write is reported on the screen. The report is the picker's own data and is
 * stored on this phone only; PROJECT.md records what that needs from the owner before release.
 */
export function PostVisitFeedbackScreen({ onBack, onSave, onSkip }: PostVisitFeedbackScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const zone = DEMO_ZONES.find((candidate) => candidate.state === CARD_ZONE_STATE);

  const [speciesId, setSpeciesId] = useState<ReportSpecies>('lingonberry');
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [yieldRating, setYieldRating] = useState<YieldRating>(DEFAULT_YIELD_RATING);
  const [amountText, setAmountText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const ratingMeanings = {
    1: t(RATING_MEANING_KEY[1]),
    2: t(RATING_MEANING_KEY[2]),
    3: t(RATING_MEANING_KEY[3]),
    4: t(RATING_MEANING_KEY[4]),
    5: t(RATING_MEANING_KEY[5]),
  } satisfies Record<YieldRating, string>;

  // The frame's row: its two chips, and the third one that opens and closes the rest of the
  // vocabulary. A chosen species outside the two stays on the row when it closes: a disclosure
  // may hide choices, never the answer it is carrying.
  const allSpecies: readonly ReportSpecies[] = [...REPORT_SPECIES, ...REPORT_SPECIES_MORE];
  const speciesOptions: readonly ReportSpecies[] = showAllSpecies
    ? allSpecies
    : allSpecies.filter((species, index) => index < REPORT_SPECIES.length || species === speciesId);

  async function save() {
    if (!onSave) {
      return;
    }

    setSaving(true);
    setFailed(false);

    try {
      await onSave(buildVisitReport({ amountText, speciesId, yieldRating }, new Date()));
    } catch {
      // The service rejected the write — a full disk, a refused key. The picker has to know
      // the report is not on the phone, so the failure is shown rather than swallowed.
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['top']} eyebrow={t('report.eyebrow')} onBack={onBack} title={t('report.title')}>
      <View className="w-full gap-section">
        <Callout
          icon={<Feather color={colors.success} name="check-circle" size={20} />}
          testID="report-exit-note"
          title={t('report.exit.title')}
        >
          {interpolate(t('report.exit.body'), {
            arrival: DEMO_VISIT_WINDOW.arrival,
            departure: DEMO_VISIT_WINDOW.departure,
            minutes: String(visitMinutes(DEMO_VISIT_WINDOW.arrival, DEMO_VISIT_WINDOW.departure)),
            zone: zone?.number ?? '',
          })}
        </Callout>

        <View className="w-full gap-sm">
          <AppText variant="title">{t('report.heading')}</AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('report.supporting')}
          </AppText>
        </View>

        {/*
          The frame draws its two species chips and “More” in one row 8 px apart. A row that
          wraps is what keeps that shape at the largest system text size, where the Finnish
          labels together are wider than the content column (ADR-019): the group wraps inside
          itself and the disclosure chip follows it onto the next line.
        */}
        <View className="w-full flex-row flex-wrap items-center gap-gap">
          <ChoiceChips
            label={t('report.species.label')}
            onChange={setSpeciesId}
            options={speciesOptions.map((species) => ({
              label: t(SPECIES_LABEL_KEY[species]),
              value: species,
            }))}
            value={speciesId}
          />

          <Pressable
            accessibilityLabel={t(
              showAllSpecies ? 'report.species.fewer.a11y' : 'report.species.more.a11y',
            )}
            accessibilityRole="button"
            // One control opens and closes the row, so the state it reports is the state it is
            // in. Stated twice on purpose, as the checkbox and the chips are: `accessibilityState`
            // for the platforms, `aria-expanded` for the web target.
            accessibilityState={{ expanded: showAllSpecies }}
            aria-expanded={showAllSpecies}
            className="h-chip flex-row items-center rounded-pill px-gap"
            onPress={() => setShowAllSpecies((open) => !open)}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
            }}
            testID="report-species-more"
          >
            <AppText style={{ color: colors.textMuted, fontWeight: '600' }} variant="label">
              {t(showAllSpecies ? 'report.species.fewer' : 'report.species.more')}
            </AppText>
          </Pressable>
        </View>

        <YieldRatingRow
          label={t('report.plentiful')}
          meanings={ratingMeanings}
          onChange={setYieldRating}
          value={yieldRating}
        />

        <FormField
          label={t('report.amount.label')}
          onChangeText={setAmountText}
          placeholder={t('report.amount.placeholder')}
          testID="report-amount"
          value={amountText}
        />

        <Callout
          icon={<Feather color={colors.warning} name="cloud-off" size={20} />}
          testID="report-offline-note"
          title={t('report.offline.title')}
          tone="warning"
        >
          {t('report.offline.body')}
        </Callout>

        {failed ? (
          <StatusMessage testID="report-save-failed" tone="danger" variant="bodySmall">
            {t('report.saveFailed')}
          </StatusMessage>
        ) : null}

        {onSave ? (
          <AppButton busy={saving} label={t('report.save')} onPress={save} testID="report-save" />
        ) : null}

        {onSkip ? (
          <TextAction
            align="center"
            label={t('report.skip')}
            onPress={onSkip}
            testID="report-skip"
          />
        ) : null}
      </View>
    </Screen>
  );
}
