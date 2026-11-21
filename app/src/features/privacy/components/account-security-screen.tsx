import { Feather } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import {
  Callout,
  Card,
  FormField,
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

import { profileInitials } from '../domain/profile';
import { useAccountProfile, type ProfileApi } from '../hooks/use-account-profile';
import { useVerificationLine } from '../hooks/use-verification-line';
import type { DeleteAccountOutcome } from '@/services/delete-account';

import { NICKNAME_MAX_LENGTH, type AccountApi } from '../services/account-api';

export type AccountSecurityScreenProps = {
  /**
   * The account service (ADR-065). With it, the account row's verification line is what
   * `GET /me` says rather than a claim drawn from the identifier.
   */
  accountApi?: Pick<AccountApi, 'profile'> &
    Partial<Pick<AccountApi, 'updateProfile' | 'updatePrivacy'>>;
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
  /**
   * Deletes the account at the service with its password (`DELETE /me`, ADR-065). The route
   * composes it with the device clean-up sign-out does, and leaves the screen once it answers
   * `ok`. Without it, deletion is not offered.
   */
  onDeleteAccount?: (password: string) => Promise<DeleteAccountOutcome>;
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
export function AccountSecurityScreen({
  accountApi,
  onBack,
  onSignIn,
  onSignOut,
  onDeleteAccount,
}: AccountSecurityScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { error: sessionError, loading, session } = useSession();

  // No session to carry on with, and none expected: the screen says so and — when it has somewhere
  // to go — offers the way in, exactly as the ended state does.
  const noSession = !loading && session === null && !sessionError;

  const verified = useVerificationLine(session, accountApi);
  // A returning account carries no name: it is the account service's answer, and no service exists
  // yet (ADR-038). The row then names the account by its identifier — the only thing the app knows
  // about it — and the line under it carries the verification claim alone, rather than printing the
  // same identifier twice. This is frame 14's row drawn the same way.
  const profileApi =
    accountApi?.updateProfile && accountApi.updatePrivacy ? (accountApi as ProfileApi) : undefined;
  const { profile, save } = useAccountProfile(profileApi, session?.accountId ?? null);
  // A saved name is the account's own (ADR-067): the row draws it at once, before the next sign-in
  // or refresh hands the session the same name.
  const displayName = profile?.nickname ?? session?.displayName ?? null;
  const accountName = session === null ? '' : (displayName ?? session.accountId);
  const accountLine = session
    ? displayName === null
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

        {!loading && session && profile ? (
          <NicknameCard
            initial={profile.nickname ?? ''}
            onSave={(nickname) => save({ nickname })}
          />
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

        {!loading && session && onDeleteAccount ? (
          <DeleteAccount onDeleteAccount={onDeleteAccount} />
        ) : null}

        {onSignOut ? (
          <SignOutAction onSignOut={onSignOut} testID="account-security-sign-out" />
        ) : null}
      </View>
    </Screen>
  );
}

const DELETE_REFUSAL_KEY = {
  refused: 'privacy.accountSecurity.delete.refused',
  unavailable: 'privacy.accountSecurity.delete.unavailable',
  'device-not-cleared': 'privacy.accountSecurity.delete.deviceNotCleared',
} as const;

/**
 * Deleting the account at the service (ADR-065). The password is the confirmation: the action
 * stays disabled until one is typed, and the server checks it. Every refusal says that nothing
 * was deleted, because that is the fact the user needs after a press that could not be undone.
 */
function DeleteAccount({
  onDeleteAccount,
}: {
  onDeleteAccount: (password: string) => Promise<DeleteAccountOutcome>;
}) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<'refused' | 'unavailable' | 'device-not-cleared' | null>(
    null,
  );

  const submit = async () => {
    if (busy || password === '') return;
    setBusy(true);
    setRefusal(null);

    try {
      const result = await onDeleteAccount(password);
      if (!result.ok) setRefusal(result.reason);
    } catch {
      setRefusal('unavailable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="account-delete-card">
      <AppText style={{ fontWeight: '600' }} variant="cardTitle">
        {t('privacy.accountSecurity.delete.title')}
      </AppText>
      <AppText tone="muted" variant="bodySmall">
        {t('privacy.accountSecurity.delete.body')}
      </AppText>
      <FormField
        autoCapitalize="none"
        autoComplete="current-password"
        label={t('privacy.accountSecurity.delete.password')}
        onChangeText={setPassword}
        secureTextEntry
        testID="account-delete-password"
        value={password}
      />
      <AppButton
        busy={busy}
        disabled={password === ''}
        label={t('privacy.accountSecurity.delete.action')}
        onPress={() => void submit()}
        testID="account-delete-action"
        variant="secondary"
      />
      {refusal ? (
        <StatusMessage testID="account-delete-refused" tone="danger" variant="bodySmall">
          {t(DELETE_REFUSAL_KEY[refusal])}
        </StatusMessage>
      ) : null}
    </Card>
  );
}

/**
 * The account's name, editable (ADR-067). No frame draws this: frame 14 draws the name in the
 * account row and stops, so the field is app-drawn from the form molecules screen 03 uses. The
 * contract's bounds (1–30 characters) are checked before anything is sent, and the result is said
 * either way — a save that did not happen is not left silent (AGENTS.md §2.3).
 */
function NicknameCard({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (nickname: string) => Promise<{ ok: boolean }>;
}) {
  const { t } = useTranslation();
  const [nickname, setNickname] = useState(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'invalid' | 'failed'>('idle');

  const submit = async () => {
    const trimmed = nickname.trim();
    if (trimmed === '' || trimmed.length > NICKNAME_MAX_LENGTH) {
      setState('invalid');
      return;
    }
    setState('saving');
    const outcome = await onSave(trimmed);
    setState(outcome.ok ? 'saved' : 'failed');
  };

  return (
    <Card style={{ gap: spacing.cardGap, padding: spacing.section }} testID="account-nickname-card">
      <FormField
        autoCapitalize="words"
        autoComplete="name"
        label={t('privacy.nickname.label')}
        maxLength={NICKNAME_MAX_LENGTH}
        onChangeText={(next) => {
          setNickname(next);
          if (state !== 'saving') setState('idle');
        }}
        testID="account-nickname"
        value={nickname}
      />
      <AppButton
        busy={state === 'saving'}
        label={t('privacy.nickname.save')}
        onPress={() => void submit()}
        testID="account-nickname-save"
        variant="secondary"
      />
      {state === 'saved' ? (
        <StatusMessage testID="account-nickname-saved" variant="caption">
          {t('privacy.nickname.saved')}
        </StatusMessage>
      ) : null}
      {state === 'invalid' || state === 'failed' ? (
        <StatusMessage testID="account-nickname-error" tone="danger" variant="caption">
          {t(state === 'invalid' ? 'privacy.nickname.invalid' : 'privacy.nickname.saveFailed')}
        </StatusMessage>
      ) : null}
    </Card>
  );
}
