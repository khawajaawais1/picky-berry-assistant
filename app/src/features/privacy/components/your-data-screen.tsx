import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Callout, Card, InfoRow, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePrivacyConsent } from '@/hooks/use-privacy-consent';
import { useReportQueue } from '@/hooks/use-report-queue';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { useSession } from '@/hooks/use-session';
import { useTranslation, type TranslationKey } from '@/services/i18n';
import type { ShareOutcome } from '@/services/share-text';

import { buildExportDocument, type ExportRecords } from '../domain/export-document';
import type { HeldRecord } from '../domain/held-records';

export type YourDataScreenProps = {
  onBack?: () => void;
  /**
   * Hands the copy over — the route wires it straight to the platform's own share sheet
   * (`src/services/share-text.ts`), which takes the same two arguments. The screen does not call the
   * platform itself so that what is handed over can be asserted, and without a handler the screen
   * draws **no action and no sentence about a sheet**: a control that cannot act claims no role
   * (AGENTS.md §11.2).
   *
   * The title is the screen's own translated name rather than the route's business: it is UI copy,
   * and copy lives in the catalogue.
   */
  onShare?: (document: string, title: string) => Promise<ShareOutcome>;
};

/** What the platform did, plus the one thing the screen has to say of its own: that it refused. */
const OUTCOME_COPY: Record<ShareOutcome | 'failed', TranslationKey> = {
  dismissed: 'privacy.export.share.dismissed',
  failed: 'privacy.export.share.failed',
  shared: 'privacy.export.share.shared',
};

/**
 * “Your data” — the screen the export path is used from, reached from the notice
 * (`/terms-privacy`). **The design never drew it**; the copy it owes is the one PROJECT.md's open
 * question 23 names, and AGENTS.md §11 asks every stored field for: *how the user gets a copy*.
 *
 * It answers that for all four records at once and in three steps, in this order:
 *
 * 1. **what the copy contains**, record by record, with each record's own value — the same names the
 *    notice uses, because they are the same records;
 * 2. **what the file is**, including what it deliberately does *not* hold (no password, no key,
 *    because the app has neither);
 * 3. **what happens when it is handed over** — and the sentence naming the share sheet is drawn
 *    *before* the control, so nobody presses a button that opens a part of their phone's UI without
 *    having been told that is what it does.
 *
 * What it is not: a copy that goes anywhere by itself. The app sends nothing (SECURITY.md §17), and
 * the only thing that leaves the phone is what the user picks in the platform's own sheet. A
 * platform that would not open a sheet is reported rather than glossed as a success.
 *
 * The document is built **when the action is used**, not when the screen draws: a copy is of the
 * phone as it is when it is asked for, and its own `generatedAt` is that moment.
 *
 * Reading the records follows the notice's rule, which is the honest one: while a read is in flight
 * nothing is claimed, and when a read failed the screen says the copy may be missing something
 * rather than presenting a short list as the whole of what the phone holds.
 */
export function YourDataScreen({ onBack, onShare }: YourDataScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { consent, error: consentError, loading: consentLoading } = usePrivacyConsent();
  const { error: queueError, loading: queueLoading, reports } = useReportQueue();
  const { error: zonesError, loading: zonesLoading, zones } = useSavedZones();
  const { error: sessionError, loading: sessionLoading, session } = useSession();
  const [sharing, setSharing] = useState(false);
  const [outcome, setOutcome] = useState<ShareOutcome | 'failed' | null>(null);

  const loading = consentLoading || queueLoading || sessionLoading || zonesLoading;
  // The same rule the notice follows: an unanswered read is neither “held” nor “nothing held”.
  const readFailed = Boolean(consentError || queueError || sessionError || zonesError);

  // What the copy would carry, in the order the app collected the records — the same order
  // `heldRecords` answers in, named by the same record type, so the two screens cannot drift into
  // two vocabularies. Each row carries its record's own `testID`, which is what lets a browser run
  // assert one count without matching the other.
  const rows: { label: TranslationKey; record: HeldRecord; value: string }[] = [];

  if (session) {
    rows.push({
      label: 'privacy.termsPrivacy.record.account.label',
      record: 'account',
      value: session.accountId,
    });
  }

  if (consent) {
    rows.push({
      label: 'privacy.termsPrivacy.record.consent.label',
      record: 'consent',
      value: t(
        consent.visitTracking
          ? 'privacy.export.contents.consent.on'
          : 'privacy.export.contents.consent.off',
      ),
    });
  }

  if (zones.length > 0) {
    rows.push({
      label: 'privacy.termsPrivacy.record.plan.label',
      record: 'plan',
      // The count as a value rather than in a sentence: the list below is the app's own data, and
      // the sentence that speaks about a number belongs to the notice.
      value: String(zones.length),
    });
  }

  if (reports.length > 0) {
    rows.push({
      label: 'privacy.termsPrivacy.record.queue.label',
      record: 'queue',
      value: String(reports.length),
    });
  }

  const share = async () => {
    if (!onShare || sharing) return;

    setSharing(true);
    setOutcome(null);

    const records: ExportRecords = { consent, readFailed, reports, session, zones };

    try {
      setOutcome(
        await onShare(buildExportDocument(records, new Date()), t('privacy.export.title')),
      );
    } catch {
      // A platform that would not hand the copy over is stated, not passed off as a share: this is
      // the user's own record, and the one thing the screen may not do is claim it went somewhere.
      setOutcome('failed');
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.export.eyebrow')}
      onBack={onBack}
      title={t('privacy.export.title')}
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          {t('privacy.export.intro')}
        </AppText>

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="your-data-contents-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.export.contents.title')}
          </AppText>

          {!loading && rows.length === 0 && !readFailed ? (
            <AppText testID="your-data-empty" tone="muted" variant="bodySmall">
              {t('privacy.export.contents.empty')}
            </AppText>
          ) : null}

          {loading
            ? null
            : rows.map((row) => (
                <View key={row.record} testID={`your-data-record-${row.record}`}>
                  <InfoRow label={t(row.label)} value={row.value} />
                </View>
              ))}
        </Card>

        {readFailed ? (
          <StatusMessage testID="your-data-read-failed" tone="danger" variant="caption">
            {/* The notice's own sentence, reused: it is the same fact about the same device. */}
            {t('privacy.termsPrivacy.held.readFailed')}
          </StatusMessage>
        ) : null}

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="your-data-file-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.export.format.title')}
          </AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('privacy.export.format.body')}
          </AppText>
        </Card>

        {onShare ? (
          <>
            {/* Where the copy goes is stated before the control that opens the sheet. */}
            <Callout
              icon={<Feather color={colors.accent} name="share-2" size={20} />}
              title={t('privacy.export.share.noteTitle')}
              tone="accent"
            >
              {t('privacy.export.share.note')}
            </Callout>

            <TextAction
              align="center"
              label={t('privacy.export.share.label')}
              // No handler while it is working: an action that cannot act claims no role, and a
              // second press would hand the same copy over twice.
              onPress={sharing ? undefined : () => void share()}
              testID="your-data-share"
            />

            {outcome ? (
              <AppText
                testID="your-data-outcome"
                tone={outcome === 'failed' ? 'danger' : 'muted'}
                variant="caption"
              >
                {t(OUTCOME_COPY[outcome])}
              </AppText>
            ) : null}
          </>
        ) : null}
      </View>
    </Screen>
  );
}
