import { Feather } from '@/components/atoms/app-icon';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { FieldAction, FormField, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';
import type { PasswordResetResult } from '@/services/session';

import { PASSWORD_MAX_LENGTH, isPasswordValid } from '../domain/create-account-form';

export type OnboardingResetPasswordScreenProps = {
  /** The token from the emailed link's query string. Absent or blank means the link cannot work. */
  token?: string | null;
  onBack?: () => void;
  /**
   * Spends the token on the new password. Resolves `refused` when the link is invalid, expired or
   * already used, and `unavailable` when the account service could not be asked. The screen never
   * receives the service's reason beyond those two, and keeps neither the token nor the password.
   */
  onSubmit?: (password: string) => Promise<PasswordResetResult>;
  /** Opens the reset request again, for a link that cannot be used. */
  onRequestNewLink?: () => void;
  /** The way back to sign in, in every state. */
  onSignIn?: () => void;
};

type Failure = 'mismatch' | 'unavailable';

/**
 * The page an emailed reset link opens — **the design never drew it** (ADR-034 §1.5, ADR-062,
 * ADR-065).
 *
 * The reset request sends a one-hour, single-use link to `/reset-password?token=…`. This screen is
 * the other end of that link: it asks for the new password and its confirmation, spends the token
 * through the session port, and says which way the attempt went. The token lives in the route's
 * query and this component's props while the screen is open; it is never written to storage, a
 * log or the catalogue.
 *
 * The framing is the sign-in screen's, because the design has no frame beside which to draw it:
 * the 76 px key tile, the onboarding header and back control, the design's 54 px fields and
 * action, and a text action back to sign-in. Being frame-less, it is held to “nothing is lost at
 * 200 %” rather than to a frame's line counts.
 *
 * **Every state says what happened.** A missing, expired or spent link opens the invalid state
 * with a way to request another; a password the service accepts opens the success state with the
 * way to sign in; a service that cannot be reached leaves the form in place with one failure line,
 * because trying again is the useful next step. The form checks the design's own password rule and
 * the confirmation before it sends anything, so a password the API would refuse is not sent.
 */
export function OnboardingResetPasswordScreen({
  onBack,
  onRequestNewLink,
  onSubmit,
  onSignIn,
  token = null,
}: OnboardingResetPasswordScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<Failure | null>(null);
  const [linkSpent, setLinkSpent] = useState(false);
  const [completed, setCompleted] = useState(false);

  const hasToken = (token ?? '').trim() !== '';
  const invalid = !hasToken || linkSpent;
  const canSave =
    !invalid &&
    !submitting &&
    onSubmit !== undefined &&
    isPasswordValid(password) &&
    confirmation !== '';

  const changePassword = (value: string) => {
    setPassword(value);
    setFailed(null);
  };

  const changeConfirmation = (value: string) => {
    setConfirmation(value);
    setFailed(null);
  };

  const submit = async () => {
    if (!canSave || onSubmit === undefined) {
      return;
    }

    if (password !== confirmation) {
      setFailed('mismatch');
      return;
    }

    setSubmitting(true);
    setFailed(null);

    try {
      const result = await onSubmit(password);

      if (result.ok) {
        setPassword('');
        setConfirmation('');
        setCompleted(true);
        return;
      }

      if (result.reason === 'refused') {
        // A refused completion is a link that cannot be used again, not a retryable press.
        setPassword('');
        setConfirmation('');
        setLinkSpent(true);
        return;
      }

      setFailed('unavailable');
    } catch {
      // A rejected call never reached the service. The form stays so the picker can try again.
      setFailed('unavailable');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow={t('onboarding.resetPassword.eyebrow')}
      onBack={onBack}
      title={t('onboarding.resetPassword.title')}
    >
      <View className="w-full gap-section">
        <View
          className="items-center justify-center rounded-lg"
          style={{
            backgroundColor: colors.accentMuted,
            height: layout.symbolTile,
            width: layout.symbolTile,
          }}
          testID="reset-password-symbol"
        >
          <Feather color={colors.accent} name="key" size={36} />
        </View>

        {completed ? (
          <>
            <AppText variant="title">{t('onboarding.resetPassword.success.heading')}</AppText>
            <AppText tone="muted" variant="bodySmall">
              {t('onboarding.resetPassword.success.body')}
            </AppText>
            {onSignIn ? (
              <AppButton
                label={t('onboarding.signIn.action')}
                onPress={onSignIn}
                testID="reset-password-success-sign-in"
              />
            ) : null}
          </>
        ) : invalid ? (
          <>
            <AppText variant="title">{t('onboarding.resetPassword.invalid.heading')}</AppText>
            <AppText tone="muted" variant="bodySmall">
              {t('onboarding.resetPassword.invalid.body')}
            </AppText>
            {onRequestNewLink ? (
              <AppButton
                label={t('onboarding.resetPassword.invalid.action')}
                onPress={onRequestNewLink}
                testID="reset-password-request-another"
              />
            ) : null}
            {onSignIn ? (
              <TextAction
                align="center"
                label={t('onboarding.signIn.action')}
                onPress={onSignIn}
                testID="reset-password-sign-in"
              />
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="title">{t('onboarding.resetPassword.heading')}</AppText>
            <AppText tone="muted" variant="bodySmall">
              {t('onboarding.resetPassword.supporting')}
            </AppText>

            <View className="w-full gap-section">
              <FormField
                accessory={
                  <FieldAction
                    accessibilityLabel={t(
                      passwordVisible ? 'common.hidePassword' : 'common.showPassword',
                    )}
                    onPress={() => setPasswordVisible((visible) => !visible)}
                  >
                    <Feather
                      color={colors.textMuted}
                      name={passwordVisible ? 'eye' : 'eye-off'}
                      size={20}
                    />
                  </FieldAction>
                }
                autoCapitalize="none"
                autoComplete="new-password"
                editable={!submitting}
                label={t('onboarding.resetPassword.newPassword')}
                maxLength={PASSWORD_MAX_LENGTH}
                onChangeText={changePassword}
                secureTextEntry={!passwordVisible}
                testID="reset-password-password"
                value={password}
              />
              <AppText tone="muted" variant="metadata">
                {t('onboarding.createAccount.passwordHint')}
              </AppText>
            </View>

            <FormField
              accessory={
                <FieldAction
                  accessibilityLabel={t(
                    confirmationVisible ? 'common.hidePassword' : 'common.showPassword',
                  )}
                  onPress={() => setConfirmationVisible((visible) => !visible)}
                >
                  <Feather
                    color={colors.textMuted}
                    name={confirmationVisible ? 'eye' : 'eye-off'}
                    size={20}
                  />
                </FieldAction>
              }
              autoCapitalize="none"
              autoComplete="new-password"
              editable={!submitting}
              label={t('onboarding.resetPassword.confirmPassword')}
              maxLength={PASSWORD_MAX_LENGTH}
              onChangeText={changeConfirmation}
              secureTextEntry={!confirmationVisible}
              testID="reset-password-confirmation"
              value={confirmation}
            />

            <AppButton
              busy={submitting}
              disabled={!canSave}
              label={t('onboarding.resetPassword.action')}
              onPress={() => void submit()}
              testID="reset-password-action"
            />

            {failed ? (
              <StatusMessage testID="reset-password-failed" tone="danger" variant="bodySmall">
                {t(
                  failed === 'mismatch'
                    ? 'onboarding.resetPassword.mismatch'
                    : 'onboarding.resetPassword.unavailable',
                )}
              </StatusMessage>
            ) : null}

            {onSignIn ? (
              <TextAction
                align="center"
                label={t('onboarding.signIn.action')}
                onPress={onSignIn}
                testID="reset-password-sign-in"
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
