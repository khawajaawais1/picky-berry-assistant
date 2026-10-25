import { Feather } from '@expo/vector-icons';
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

import { heldRecords, type HeldRecord } from '../domain/held-records';

export type TermsPrivacyScreenProps = {
  onBack?: () => void;
  /**
   * Opens the screen the copy is taken on (`src/app/(app)/your-data.tsx`) — the export path
   * PROJECT.md's open question 23 names as owed. The destination's own title is the control's
   * label, the same convention the settings rows follow: one screen does not get two names. Without
   * a destination the rights card stays the reading it was, and the copy line still says where a
   * copy is taken.
   */
  onOpenYourData?: () => void;
};

/**
 * What each record is called, what it is, and how it goes away — three catalogue keys per record,
 * named as literals rather than built from the record's own name so the catalogue's scan can see
 * them (a key assembled at runtime is a key nothing can check for dead copy).
 */
const RECORD_COPY: Record<
  HeldRecord,
  { label: TranslationKey; value: TranslationKey; hint: TranslationKey }
> = {
  account: {
    label: 'privacy.termsPrivacy.record.account.label',
    value: 'privacy.termsPrivacy.record.account.value',
    hint: 'privacy.termsPrivacy.record.account.hint',
  },
  consent: {
    label: 'privacy.termsPrivacy.record.consent.label',
    value: 'privacy.termsPrivacy.record.consent.value',
    hint: 'privacy.termsPrivacy.record.consent.hint',
  },
  plan: {
    label: 'privacy.termsPrivacy.record.plan.label',
    value: 'privacy.termsPrivacy.record.plan.value',
    hint: 'privacy.termsPrivacy.record.plan.hint',
  },
  queue: {
    label: 'privacy.termsPrivacy.record.queue.label',
    value: 'privacy.termsPrivacy.record.queue.value',
    hint: 'privacy.termsPrivacy.record.queue.hint',
  },
};

/**
 * The screen frame 14's “Terms & privacy” row opens (node 5:23688) — **the design never drew it**
 * (ADR-039).
 *
 * It is a notice, so it does the one thing a notice can honestly do today: it names **what this
 * phone holds** and answers, for each record, the four questions AGENTS.md §11 asks of a stored
 * field — who may read it (this phone, and nothing else: the app sends nothing), how the user gets a
 * copy (not built yet, and said so), how it is corrected (each record names its own path), and how
 * it is deleted (signing out, and the record's own control where it has one).
 *
 * What it deliberately does **not** do: it does not invent terms or a privacy notice. There is no
 * service to accept terms for, and the lawful basis for each field is the owner's to state
 * (PROJECT.md open questions 15–16) — so the screen says the notice is still being written and
 * states what the app can be true about instead. Nor does it offer a control that changes a record:
 * every record is changed where it lives, so such an action here would claim a role it does not have
 * (AGENTS.md §11.2). The one control it carries is the way to the copy (ADR-040), which changes
 * nothing — it hands a copy over.
 *
 * The list itself is `heldRecords` (its own test holds the rule): a record the app could not read is
 * not named, and when any read fails the screen says the list is incomplete rather than presenting a
 * subset as the whole of what the phone holds. While a read is still in flight it claims nothing at
 * all — not the records, and not their absence.
 */
export function TermsPrivacyScreen({ onBack, onOpenYourData }: TermsPrivacyScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { consent, error: consentError, loading: consentLoading } = usePrivacyConsent();
  const { error: queueError, loading: queueLoading, reports } = useReportQueue();
  const { error: zonesError, loading: zonesLoading, zones } = useSavedZones();
  const { error: sessionError, loading: sessionLoading, session } = useSession();
  const records = heldRecords({
    consentDecided: consent === null ? false : true,
    planCount: zones.length,
    queueCount: reports.length,
    signedIn: session !== null,
  });
  // A read that failed leaves the list short, and a short list presented as the whole of what this
  // phone holds is the one thing this screen may not do. The account is the record whose read can
  // fail without any of the three device stores being involved, so it is named with them.
  const readFailed = consentError || queueError || zonesError || sessionError;
  // A read still in flight is neither “held” nor “nothing held”: “Nothing of yours is on this phone
  // yet.” drawn over an unanswered store would be a claim about a device nobody has read.
  const loading = consentLoading || queueLoading || sessionLoading || zonesLoading;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.termsPrivacy.eyebrow')}
      onBack={onBack}
      title={t('privacy.termsPrivacy.title')}
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          {t('privacy.termsPrivacy.intro')}
        </AppText>

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="terms-privacy-held-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.termsPrivacy.held.title')}
          </AppText>

          {records.length === 0 && !readFailed && !loading ? (
            <AppText testID="terms-privacy-empty" tone="muted" variant="bodySmall">
              {t('privacy.termsPrivacy.held.empty')}
            </AppText>
          ) : null}

          {records.map((record) => (
            <InfoRow
              hint={t(RECORD_COPY[record].hint)}
              key={record}
              label={t(RECORD_COPY[record].label)}
              value={t(RECORD_COPY[record].value)}
            />
          ))}
        </Card>

        {readFailed ? (
          <StatusMessage testID="terms-privacy-read-failed" tone="danger" variant="caption">
            {t('privacy.termsPrivacy.held.readFailed')}
          </StatusMessage>
        ) : null}

        {/* The drawer of rights, each row the thing and where it is. */}
        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="terms-privacy-rights-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.termsPrivacy.rights.title')}
          </AppText>
          <InfoRow
            label={t('privacy.termsPrivacy.rights.see.label')}
            value={t('privacy.termsPrivacy.rights.see.value')}
          />
          <InfoRow
            label={t('privacy.termsPrivacy.rights.copy.label')}
            value={t('privacy.termsPrivacy.rights.copy.value')}
          />
          <InfoRow
            label={t('privacy.termsPrivacy.rights.correct.label')}
            value={t('privacy.termsPrivacy.rights.correct.value')}
          />
          <InfoRow
            label={t('privacy.termsPrivacy.rights.delete.label')}
            value={t('privacy.termsPrivacy.rights.delete.value')}
          />
          {/*
            The one control on this screen, and the only one it may carry: it changes no record — it
            leads to the copy (ADR-040), which is what the row above it names. Its label is the
            destination's own title, as a settings row's is.
          */}
          {onOpenYourData ? (
            <TextAction
              label={t('privacy.export.title')}
              onPress={onOpenYourData}
              testID="terms-privacy-your-data"
            />
          ) : null}
        </Card>

        {/* What the app sends — the answer to “who may read it”, and the frame's own lock glyph. */}
        <Callout
          icon={<Feather color={colors.success} name="lock" size={20} />}
          title={t('privacy.termsPrivacy.leaves.title')}
        >
          {t('privacy.termsPrivacy.leaves.body')}
        </Callout>

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="terms-privacy-notice-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.termsPrivacy.notice.title')}
          </AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('privacy.termsPrivacy.notice.body')}
          </AppText>
        </Card>
      </View>
    </Screen>
  );
}
