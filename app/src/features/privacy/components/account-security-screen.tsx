import { Feather } from '@/components/atoms/app-icon';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import {
  Callout,
  Card,
  InfoRow,
  SignOutAction,
  StatusMessage,
  TextAction,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useSession } from '@/hooks/use-session';
import { interpolate, useTranslation } from '@/services/i18n';
import { identifierKind } from '@/utils/identifier';

import { profileInitials } from '../domain/profile';

export type AccountSecurityScreenProps = {
  onBack?: () => void;
  /**
   * Opens the sign-in screen — the way back in when the session the app was holding has run out
   * (ADR-041). Without it, and in a state where there is no session to carry on with, the screen
   * draws no such action: a control that cannot act claims no role (AGENTS.md §11.2).
   */
  onSignIn?: () => void;
  /**
   * Leaves: deletes what this device holds of the picker's and drops the session
   * (`src/services/sign-out.ts`). The promise is the point — the screen shows a failure instead of
   * claiming the account is gone, and the caller decides where the user goes afterwards.
   */
  onSignOut?: () => Promise<void>;
};

/**
 * The screen frame 14's “Account & security” row opens (node 5:23677) — **the design never drew it**
 * (ADR-039).
 *
 * It is an account surface for a flow whose password the app never stores: the credential is
 * email + password at the provider (ADR-054), so there is no password here to change, reset or
 * leak, and the screen says that rather than leaving a reader to wonder where the missing
 * controls went. What it *can* state, it
 * states: whose account the app is holding (the session, ADR-029/ADR-038 — the name when a sign-up
 * collected one, otherwise the identifier alone), where that session lives, how long it is good for,
 * what ends it, and what the app cannot do yet because no account service exists.
 *
 * The row above it is frame 14's own drawing — the monogram, the account's name or identifier and
 * what was verified — and this screen draws the same row from the same session so the two surfaces
 * agree about who is signed in. It is a reading here as it is there: there is no profile screen to
 * open (AGENTS.md §11.2).
 *
 * **Sign out** is offered here as well as on the settings screen, and it is the same service behind
 * both: the records it deletes are named in the confirmation before the deletion runs, so nobody
 * meets a loss they did not expect. Without a handler the control is not drawn at all — a reading,
 * not a promise.
 *
 * **The session is renewed, not counted down** (ADR-065, superseding ADR-041's countdown). The
 * access token is short-lived and the session port rotates it with the account service, so a
 * clock on this screen would count down to nothing. A session ends when the user signs out or the
 * service refuses to renew it. Either way `current()` answers nobody, and the screen says so and
 * offers the way back in.
 */
export function AccountSecurityScreen({ onBack, onSignIn, onSignOut }: AccountSecurityScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { error: sessionError, loading, session } = useSession();

  // No session to carry on with, and none expected: the screen says so and — when it has somewhere
  // to go — offers the way in, exactly as the ended state does.
  const noSession = !loading && session === null && !sessionError;

  const verified = session
    ? t(
        identifierKind(session.accountId) === 'email'
          ? 'privacy.account.verifiedEmail'
          : 'privacy.account.verifiedPhone',
      )
    : '';
  // A returning account carries no name: it is the account service's answer, and no service exists
  // yet (ADR-038). The row then names the account by its identifier — the only thing the app knows
  // about it — and the line under it carries the verification claim alone, rather than printing the
  // same identifier twice. This is frame 14's row drawn the same way.
  const accountName = session === null ? '' : (session.displayName ?? session.accountId);
  const accountLine = session
    ? session.displayName === null
      ? verified
      : interpolate(t('privacy.account.line'), { identifier: session.accountId, verified })
    : '';

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.accountSecurity.eyebrow')}
      onBack={onBack}
      title={t('privacy.accountSecurity.title')}
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          {t('privacy.accountSecurity.intro')}
        </AppText>

        {!loading && session ? (
          <View className="w-full flex-row items-center gap-gap" testID="account-security-row">
            <View
              className="items-center justify-center rounded-pill"
              style={{
                backgroundColor: colors.accentMuted,
                height: layout.avatarSize,
                width: layout.avatarSize,
              }}
              testID="account-security-avatar"
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

        {noSession ? (
          <AppText testID="account-security-none" tone="muted" variant="bodySmall">
            {t('privacy.accountSecurity.none')}
          </AppText>
        ) : null}

        {sessionError ? (
          <StatusMessage testID="account-security-error" tone="danger" variant="caption">
            {t('privacy.account.readFailed')}
          </StatusMessage>
        ) : null}

        <Callout
          icon={<Feather color={colors.accent} name="key" size={20} />}
          title={t('privacy.accountSecurity.reach.title')}
          tone="accent"
        >
          {t('privacy.accountSecurity.reach.body')}
        </Callout>

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="account-security-session-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.accountSecurity.session.title')}
          </AppText>
          <InfoRow
            hint={t('privacy.accountSecurity.session.where.hint')}
            label={t('privacy.accountSecurity.session.where.label')}
            value={t('privacy.accountSecurity.session.where.value')}
          />
          <InfoRow
            hint={t('privacy.accountSecurity.session.lifetime.hint')}
            label={t('privacy.accountSecurity.session.lifetime.label')}
            value={t('privacy.accountSecurity.session.lifetime.value')}
          />
          <InfoRow
            hint={t('privacy.accountSecurity.session.ends.hint')}
            label={t('privacy.accountSecurity.session.ends.label')}
            value={t('privacy.accountSecurity.session.ends.value')}
          />
        </Card>

        <Card
          style={{ gap: spacing.cardGap, padding: spacing.section }}
          testID="account-security-absent-card"
        >
          <AppText style={{ fontWeight: '600' }} variant="cardTitle">
            {t('privacy.accountSecurity.absent.title')}
          </AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('privacy.accountSecurity.absent.service')}
          </AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('privacy.accountSecurity.absent.devices')}
          </AppText>
        </Card>

        {/*
          The way back in, offered exactly when there is no session to carry on with. Its label is the
          sign-in screen's own title, as every destination's is.
        */}
        {!loading && noSession && onSignIn ? (
          <TextAction
            align="center"
            label={t('onboarding.signIn.title')}
            onPress={onSignIn}
            testID="account-security-sign-in"
          />
        ) : null}

        <AppText tone="muted" variant="bodySmall">
          {t('privacy.accountSecurity.signOut.note')}
        </AppText>

        {onSignOut ? (
          <SignOutAction onSignOut={onSignOut} testID="account-security-sign-out" />
        ) : null}
      </View>
    </Screen>
  );
}
