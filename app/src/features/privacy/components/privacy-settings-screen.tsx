import { Feather } from '@/components/atoms/app-icon';
import { Platform, Pressable, Switch, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Callout, Card, Chip, SignOutAction, StatusMessage } from '@/components/molecules';
import { appEnvironment } from '@/config/env';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePrivacyConsent } from '@/hooks/use-privacy-consent';
import { useReportQueue } from '@/hooks/use-report-queue';
import { useSavedZones } from '@/hooks/use-saved-zones';
import { useSession } from '@/hooks/use-session';
import { interpolate, useTranslation } from '@/services/i18n';
import { identifierKind } from '@/utils/identifier';

import { profileInitials } from '../domain/profile';

export type PrivacySettingsScreenProps = {
  onBack?: () => void;
  /**
   * Opens the list of the zones the picker saved (`src/app/saved-spots.tsx`) — the frame's
   * “Saved spots” row. The list is the screen the design never drew (ADR-030); without a
   * destination the row is drawn as the reading it is, so it claims no role it cannot act on
   * (AGENTS.md §11.2).
   */
  onOpenSavedSpots?: () => void;
  /**
   * Opens frame 13's sync centre (`src/app/downloads.tsx`) — the frame's “Offline maps & sync”
   * row, whose value is the queue's own count. Without it the row is drawn as the reading it is.
   */
  onOpenSync?: () => void;
  /**
   * Opens the account surface (`src/app/(app)/account-security.tsx`) — the frame's “Account &
   * security” row (node 5:23677). The screen behind the row is app-drawn (ADR-039); without a
   * destination the row is drawn as the reading it is, so it claims no role it cannot act on
   * (AGENTS.md §11.2).
   */
  onOpenAccountSecurity?: () => void;
  /**
   * Opens the notice (`src/app/(app)/terms-privacy.tsx`) — the frame's “Terms & privacy” row
   * (node 5:23688), which is app-drawn too (ADR-039). Without a destination the row is drawn as
   * the reading it is.
   */
  onOpenTermsPrivacy?: () => void;
  /**
   * Leaves: deletes what this device holds of the picker's and drops the session
   * (`src/services/sign-out.ts`). The promise is the point — the screen shows a failure instead
   * of claiming the account is gone, and the caller decides where the user goes afterwards.
   */
  onSignOut?: () => Promise<void>;
};

/**
 * Screen 14 · Account and offline · Profile and privacy (Figma node 5:23613): the profile the
 * fourth destination opens, holding the picker's settings (2026-10-22 — the destination is the
 * profile and the settings are inside it, which is the split the frame itself draws: the account
 * block above, the settings rows below).
 *
 * What it draws today, in the frame's own order: the **account row** (the design's avatar,
 * name and verified-identifier line, filled from the session the app is holding rather than
 * from the frame's example — ADR-029), the **“Use Picky as” card** (the app's one real role
 * beside the design's own note that buying is a planned extra), the **settings card** with the
 * frame's **“Saved spots” row** in it (whose subtitle counts the picker's own plan, which the
 * row also opens — ADR-030), the **status message**, and then the frame's group of rows —
 * **“Visit tracking while the app is open”** — the frame's “Background visit tracking” row,
 * renamed to what the app does (ADR-047) — the **“Offline maps & sync” row**, the **“Account & security”
 * row**, the **“Language”** row (the language the app is actually in, read from the device) and the
 * **“Terms & privacy”** row — closed by **“Sign out”**. The
 * group is drawn where the frame draws it, outside a card at the content column's own width:
 * its labels keep the design's 244 px (node 5:23671), which the Finnish wording needs.
 *
 * This screen is where screen 05's sentence is kept — “I consent to visit tracking while the app
 * is open. I can turn it off in Privacy settings.” The row writes the same stored record that screen 05's
 * consent row writes, so turning it off here is the withdrawal, not a second opinion about it
 * (ADR-020). Withdrawal is available to everyone: the switch is not gated on the account the
 * rest of this frame draws.
 *
 * Deliberate limits, all recorded in PROJECT.md and `docs/design-source.md`:
 *
 * - The frame's **“Default spot visibility”** block is not drawn. Its Private/Shared/Public chips
 *   do not set a preference, they describe how *other people* see a spot — invites, a community
 *   map, a sharing model the app does not have. Drawing them would promise all three.
 * - Its **“Account & security”** and **“Terms & privacy”** rows are drawn where the frame draws
 *   them, each opening the screen behind it — neither of which the design drew, so both are
 *   app-drawn (ADR-039). Until a route supplies a destination, each row is a reading.
 * - The **Language** row keeps the frame's label and value and drops its chevron: the app follows
 *   the device's language by design and has no picker to open (ADR-017), so the row is a reading.
 * - The **account row** is drawn only once the session read has answered and there is one; a cold
 *   start holds no session (it is a process-length memory), and the screen draws no empty account.
 * - The frame draws its `Switch` at 46x28. This is the platform's own switch, a few pixels larger
 *   on iOS: the app does not resize a native control, because scaling it would take away the
 *   platform feel the frame is imitating (and its own text metrics with it). Its colours do come
 *   from the tokens.
 * - The frame has no back control — in the design this screen is a tab. The route adds one only
 *   when the screen was pushed onto a stack, so a deep link has no control that cannot act.
 */
export function PrivacySettingsScreen({
  onBack,
  onOpenAccountSecurity,
  onOpenSavedSpots,
  onOpenSync,
  onOpenTermsPrivacy,
  onSignOut,
}: PrivacySettingsScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { consent, error, loading, record } = usePrivacyConsent();
  const { error: queueError, loading: queueLoading, reports } = useReportQueue();
  const { error: zonesError, loading: zonesLoading, zones } = useSavedZones();
  const { error: sessionError, loading: sessionLoading, session } = useSession();
  // Native development/preview builds start with sample plan and queue records; say so here,
  // where the picker's own record is counted (frontend review, 2026-10-25).
  const previewSamples = Platform.OS !== 'web' && appEnvironment() !== 'production';

  const consentLabel = t('privacy.visitTracking');
  const syncLabel = t('privacy.sync.title');
  // The frame prints the row's own value (“1 queued”): how many reports are still on this phone,
  // which is the same queue screen 13 lists. An unanswered or failed read is not a zero, so the row
  // prints nothing until the queue has actually answered (frontend review, 2026-10-25).
  const syncValue =
    queueLoading || queueError
      ? undefined
      : interpolate(t('privacy.sync.value'), { count: String(reports.length) });
  // The frame prints the plan's own count on its saved-spots row, and its subtitle says the same
  // count in words (“4 spots · private by default”). While the record is being read, or when it
  // could not be read at all, the screen prints neither: an unknown count is not zero, and a
  // sentence that counts something is a claim about the count. The sentence is the language's own
  // two keys, singular and plural, as frame 13's waiting label is.
  const savedSpotsCount = zonesLoading || zonesError ? undefined : String(zones.length);
  const savedSpotsSubtitle =
    savedSpotsCount === undefined
      ? undefined
      : interpolate(
          t(
            zones.length === 1
              ? 'privacy.savedSpots.subtitle.one'
              : 'privacy.savedSpots.subtitle.many',
          ),
          { count: savedSpotsCount },
        );
  const verified = session
    ? t(
        identifierKind(session.accountId) === 'email'
          ? 'privacy.account.verifiedEmail'
          : 'privacy.account.verifiedPhone',
      )
    : '';
  // A returning account carries no name: it is the account service's answer, and no service
  // exists yet (ADR-038). The row then names the account by its identifier — the only thing the
  // app knows about it — and the line under it carries the verification claim alone, rather than
  // printing the same identifier twice.
  const accountName = session === null ? '' : (session.displayName ?? session.accountId);
  const accountLine = session
    ? session.displayName === null
      ? verified
      : interpolate(t('privacy.account.line'), {
          identifier: session.accountId,
          verified,
        })
    : '';

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.eyebrow')}
      onBack={onBack}
      title={t('privacy.title')}
    >
      <View className="w-full gap-section">
        {/* The frame's account row (nodes 5:23626–5:23631), filled from the session. */}
        {!sessionLoading && session ? (
          <View className="w-full flex-row items-center gap-gap" testID="privacy-account-row">
            <View
              className="items-center justify-center rounded-pill"
              style={{
                backgroundColor: colors.accentMuted,
                height: layout.avatarSize,
                width: layout.avatarSize,
              }}
              testID="privacy-account-avatar"
            >
              <AppText style={{ color: colors.accent }} variant="profileInitials">
                {profileInitials(accountName)}
              </AppText>
            </View>
            <View className="flex-1 gap-xs">
              <AppText variant="profileName">{accountName}</AppText>
              <AppText tone="muted" variant="caption">
                {accountLine}
              </AppText>
            </View>
          </View>
        ) : null}

        {previewSamples ? (
          <AppText testID="preview-sample-data" tone="muted" variant="bodySmall">
            {t('privacy.previewSample')}
          </AppText>
        ) : null}

        {/* The frame's “Use Picky as” card, and the design's own note under it. */}
        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="privacy-use-as-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.useAs.title')}
          </AppText>
          <View className="w-full flex-row flex-wrap gap-gap">
            <Chip label={t('privacy.useAs.picker')} tone="accent" testID="privacy-use-as-picker" />
            <Chip label={t('privacy.useAs.buyer')} testID="privacy-use-as-buyer" />
          </View>
          <AppText tone="muted" variant="metadata">
            {t('privacy.useAs.note')}
          </AppText>
        </Card>

        {/*
          The frame's own settings card (node 5:23640) and the first row in it: “Saved spots”
          with the design's subtitle under the label, the plan's count at the end and the
          frame's chevron. The card's other row is “Default spot visibility”, which the app
          does not draw (see above), so neither the divider between them nor that block is
          drawn here.
        */}
        <Card style={{ padding: spacing.section }} testID="privacy-settings-card">
          <SettingRow
            description={savedSpotsSubtitle}
            label={t('privacy.savedSpots.title')}
            onPress={onOpenSavedSpots}
            testID="privacy-saved-spots-row"
            value={savedSpotsCount}
          />
        </Card>

        <Callout
          icon={<Feather color={colors.success} name="lock" size={20} />}
          title={t('privacy.trailsNote.title')}
        >
          {t('privacy.trailsNote.body')}
        </Callout>

        {/*
          The frame's own group of rows (node 5:23663): **not** inside a card, which is why
          each label keeps the full content column — the frame gives the “Offline maps & sync”
          label 244 px of it (node 5:23671), and the Finnish wording needs every one of them
          (measured: at the card's inset it wrapped where the design draws one line). The rows
          sit the design's own 5 px apart and carry no dividers: the frame draws its only
          divider inside the card above. All five of the group's rows are drawn: the switch, the
          sync centre, “Account & security”, the language, and “Terms & privacy” — the last two
          screens app-drawn (ADR-039) and each row a reading until its route supplies one.
        */}
        <View className="w-full gap-chartStack">
          <View
            className="w-full flex-row items-center gap-gap py-setting"
            testID="privacy-visit-tracking-row"
          >
            <AppText className="flex-1" variant="cardTitle">
              {consentLabel}
            </AppText>
            <Switch
              accessibilityLabel={consentLabel}
              // Reading the record is not an answer yet, so the control that changes it waits
              // — as screen 05's action does — rather than showing “off” for a consent that
              // may already exist.
              disabled={loading}
              ios_backgroundColor={colors.border}
              onValueChange={(next) => void record(next)}
              testID="privacy-visit-tracking"
              thumbColor={colors.onAccent}
              trackColor={{ false: colors.border, true: colors.accent }}
              value={consent?.visitTracking ?? false}
            />
          </View>

          <SettingRow
            label={syncLabel}
            onPress={onOpenSync}
            testID="privacy-sync-row"
            value={syncValue}
          />

          {/*
            The frame's “Account & security” row (node 5:23677), in the frame's own place: after
            the sync row and before the language row. Its screen is app-drawn (ADR-039).
          */}
          <SettingRow
            label={t('privacy.accountSecurity.title')}
            onPress={onOpenAccountSecurity}
            testID="privacy-account-security-row"
          />

          {/*
            The frame's “Language” row, at the device's answer: no control, because the app
            follows the device's language and has no picker to open (ADR-017).
          */}
          <SettingRow
            chevron={false}
            label={t('privacy.language.title')}
            testID="privacy-language-row"
            value={t('privacy.language.value')}
          />

          {/*
            The frame's “Terms & privacy” row (node 5:23688), its last in the group — the notice
            behind it is app-drawn too (ADR-039).
          */}
          <SettingRow
            label={t('privacy.termsPrivacy.title')}
            onPress={onOpenTermsPrivacy}
            testID="privacy-terms-privacy-row"
          />
        </View>

        {error ? (
          <StatusMessage tone="danger" variant="caption">
            {t('privacy.saveFailed')}
          </StatusMessage>
        ) : null}
        {sessionError ? (
          <StatusMessage testID="privacy-account-error" tone="danger" variant="caption">
            {t('privacy.account.readFailed')}
          </StatusMessage>
        ) : null}

        {onSignOut ? <SignOutAction onSignOut={onSignOut} testID="privacy-sign-out" /> : null}
      </View>
    </Screen>
  );
}

/**
 * One of the frame's `Setting` rows: its label where the frame draws one — with the design's own
 * subtitle under it when the row has one — the reading the row is about (or the count) at the
 * end, and the frame's chevron.
 *
 * The value is optional because a reading the app does not have is not a zero: an unknown count
 * is printed as nothing at all. The subtitle is optional for the same reason: the frame's
 * saved-spots subtitle counts what it describes (“4 spots · private by default”)
 *
 * A row is a control only when the caller supplies somewhere to go; without it the same drawing is
 * a reading, and the row's own name says where it leads when it does lead somewhere — a settings
 * row that opens a screen reads as a button to a screen reader, not as a setting whose value was
 * read out. `chevron` is the same honesty for a row that will never open anything: the language
 * row keeps the frame's label and value and drops the arrow, because the app has no picker to
 * open (ADR-017).
 */
function SettingRow({
  chevron = true,
  description,
  label,
  onPress,
  testID,
  value,
}: {
  chevron?: boolean;
  description?: string;
  label: string;
  onPress?: () => void;
  testID: string;
  value?: string;
}) {
  const { colors } = useAppTheme();
  // A row's value is part of what the row says: “Offline maps & sync” without “1 queued” is a
  // setting announced with its point removed (frontend review, 2026-10-25).
  const accessibleName = value === undefined ? label : `${label}, ${value}`;

  const content = (
    <>
      {/* The frame's content group (node 5:23642): the label over its subtitle, 3 px apart. */}
      <View className="flex-1 gap-tight">
        <AppText variant="cardTitle">{label}</AppText>
        {description === undefined ? null : (
          <AppText tone="muted" variant="caption">
            {description}
          </AppText>
        )}
      </View>
      {value === undefined ? null : (
        <AppText tone="accent" variant="rowValue">
          {value}
        </AppText>
      )}
      {chevron ? <Feather color={colors.textMuted} name="chevron-right" size={18} /> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        className="w-full flex-row items-center gap-gap py-setting"
        style={{ minHeight: layout.minTouchTarget }}
        testID={testID}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibleName}
      accessibilityRole="button"
      className="w-full flex-row items-center gap-gap py-setting"
      onPress={onPress}
      style={{ minHeight: layout.minTouchTarget }}
      testID={testID}
    >
      {content}
    </Pressable>
  );
}
