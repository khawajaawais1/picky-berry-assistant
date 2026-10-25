import { Feather } from '@expo/vector-icons';
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
import { useNow } from '@/hooks/use-now';
import { useSession } from '@/hooks/use-session';
import { interpolate, useTranslation } from '@/services/i18n';
import { isExpired, remainingMilliseconds } from '@/services/session';
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
 * **The session's own hour is the one thing on this screen that changes while it is open**, and this
 * is where it is said out loud (ADR-041). A session good for an hour is a session that can run out
 * mid-read, so the screen shows the time left — read from the session's own expiry through
 * `remainingMilliseconds`, once a second — and when the hour is up it stops drawing the account it
 * no longer holds, says the session has ended, and offers the way back in. Without that, the app's
 * only answer to an expired session was the *next* screen's silence: `current()` drops a session
 * that is past its time and reports nobody, so the user would meet a signed-out app with no account
 * of how they got there (PROJECT.md, known issue 25).
 *
 * What it deliberately does not do: it does not extend, refresh or re-issue anything. No provider is
 * wired behind the port yet (ADR-054 decides which), so a session that has ended is one the user
 * signs into again.
 */
export function AccountSecurityScreen({ onBack, onSignIn, onSignOut }: AccountSecurityScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { error: sessionError, loading, session } = useSession();
  const now = useNow();

  // The session's own rule, asked about the moment this render is for: `isExpired` counts the
  // instant of expiry as expired, and `remainingMilliseconds` is floored at zero, so neither has to
  // be interpreted here.
  const ended = session !== null && isExpired(session, now);
  const minutesLeft =
    session === null ? 0 : Math.floor(remainingMilliseconds(session, now) / 60_000);
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

        {!loading && session && !ended ? (
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

        {
          // The account the app was holding is gone, and this is the moment the user meets that:
          // the hour is up, stated as itself rather than drawn as an empty account row.
          !loading && session && ended ? (
            <Callout
              icon={<Feather color={colors.warning} name="clock" size={20} />}
              testID="account-security-ended"
              title={t('privacy.accountSecurity.ended.title')}
              tone="warning"
            >
              {t('privacy.accountSecurity.ended.body')}
            </Callout>
          ) : null
        }

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
          {/* The hour is the stand-in's `SESSION_LIFETIME_MS`, which is the provider's own token
              length rather than a preference (ADR-054, ADR-028); the screen's test asserts the two
              stay in step. */}
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
          {
            // Only while there is a live session: the reading is about the one being held, and a
            // session that has run out has nothing left to count down. Floored at whole minutes,
            // so the reading never claims more time than there is.
            !loading && session && !ended ? (
              <InfoRow
                hint={t('privacy.accountSecurity.session.remaining.hint')}
                label={t('privacy.accountSecurity.session.remaining.label')}
                value={
                  minutesLeft > 0
                    ? interpolate(t('privacy.accountSecurity.session.remaining.value'), {
                        minutes: String(minutesLeft),
                      })
                    : t('privacy.accountSecurity.session.remaining.underMinute')
                }
              />
            ) : null
          }
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
          The way back in, offered exactly when there is no session to carry on with: the hour ran
          out while this screen was open, or the app is holding none at all. Its label is the
          sign-in screen's own title, as every destination's is.
        */}
        {!loading && (ended || noSession) && onSignIn ? (
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
