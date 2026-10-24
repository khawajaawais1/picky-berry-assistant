import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, FormField, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { appEnvironment, type AppEnvironment } from '@/config/env';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

export type OnboardingForgotPasswordScreenProps = {
  onBack?: () => void;
  /**
   * Asks the sign-in service for the account's reset link. Resolves `true` when the provider
   * accepted the address, and `false` when it did not — which is what the screen reports in its
   * failure line.
   *
   * The screen never sends an email, sees a reset token or collects a new password: all three
   * belong to the provider (ADR-054, ADR-062). The port behind this call (`src/services/session/`)
   * is where a real adapter will make the request.
   */
  onRequestReset?: (email: string) => Promise<boolean>;
  /** The way back to the sign-in screen, in both states. */
  onSignIn?: () => void;
  /**
   * The environment this build was made for, which decides whether the request can be made at
   * all. Read from `src/config/env.ts` — the one module allowed to read `EXPO_PUBLIC_*` — and
   * passable so a test can state which build it is testing.
   */
  environment?: AppEnvironment;
};

/**
 * The password-reset journey — **the design never drew it** (ADR-034 §1.5, answered 2026-10-24).
 *
 * The screen keeps the app-drawn sign-in screen's framing, because the frame it stands beside has
 * none of its own: the 76 px key tile, the onboarding header, the design's 54 px field and action,
 * and a text action back to sign-in. Frame-less, its copy is this repository's and its Finnish is
 * app-written, like the sign-in screen's.
 *
 * **What the journey does, and what it deliberately does not.** It asks for the email the account
 * uses and hands it to the sign-in provider, which owns the reset link, the reset token and the
 * page where a new password is set (ADR-054, ADR-062). The app draws no new-password field and
 * handles no token: a client that did would be holding the one credential ADR-054 says it never
 * stores, and it would have to invent a screen the design file does not contain. After the
 * provider's page, the way on is the sign-in screen this one came from.
 *
 * **No delivery is claimed.** No sign-in service is connected yet, so the stand-in behind the port
 * accepts the address and sends nothing. The confirmation therefore says what it knows — that the
 * request was accepted, and that *if* an account uses the address, the provider's reset link is
 * the next step — and a non-production build carries the test-build note saying no email is sent.
 * That is ADR-048's rule applied to the reset journey rather than a second wording for it.
 *
 * **The failure line is the screen's.** The design has no reset frame and no error state, so a
 * provider refusal or a request that could not finish leaves one `danger` sentence under the
 * action. It does not distinguish an unknown address from a failed send, because telling them
 * apart would turn the screen into an account-existence oracle.
 *
 * A **production** build draws the action disabled: no sign-in service exists to answer a reset
 * request there, just as no service answers sign-in or account creation (ADR-054 §8). The screen
 * itself is still readable, and the field still typeable.
 */
export function OnboardingForgotPasswordScreen({
  onBack,
  onRequestReset,
  onSignIn,
  environment,
}: OnboardingForgotPasswordScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [requested, setRequested] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  const buildEnvironment = environment ?? appEnvironment();
  // Nothing can carry a reset request in a shipped build, so its action cannot act
  // (AGENTS.md §11.2).
  const canRequest = buildEnvironment !== 'production' && onRequestReset !== undefined;
  const complete = email.trim() !== '';
  const shownEmail = email.trim();

  const submit = async () => {
    if (!canRequest || submitting || !complete) {
      return;
    }

    setSubmitting(true);
    setRequestFailed(false);

    try {
      const accepted = await onRequestReset(shownEmail);

      setRequestFailed(!accepted);
      setRequested(accepted);
    } catch {
      // A request that rejects did not reach the provider, and that is never a success: the
      // screen says so rather than moving to a confirmation it cannot stand behind.
      setRequestFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow={t('onboarding.forgotPassword.eyebrow')}
      onBack={onBack}
      title={t('onboarding.forgotPassword.title')}
    >
      <View className="w-full gap-section">
        {
          // The sign-in screen's own 76 px key tile, so the two doors read as one surface
          // (ADR-034's framing; the design's symbol metric, node 5:22840).
        }
        <View
          className="items-center justify-center rounded-lg"
          style={{
            backgroundColor: colors.accentMuted,
            height: layout.symbolTile,
            width: layout.symbolTile,
          }}
          testID="forgot-password-symbol"
        >
          <Feather color={colors.accent} name="key" size={36} />
        </View>

        {requested ? (
          <>
            <AppText variant="title">{t('onboarding.forgotPassword.requested.heading')}</AppText>

            <AppText tone="muted" variant="bodySmall">
              {interpolate(t('onboarding.forgotPassword.requested.body'), { email: shownEmail })}
            </AppText>

            {buildEnvironment !== 'production' ? (
              <Callout
                icon={<Feather color={colors.warning} name="info" size={20} />}
                testID="forgot-password-test-note"
                title={t('onboarding.forgotPassword.requested.test.title')}
                tone="warning"
              >
                {t('onboarding.forgotPassword.requested.test.body')}
              </Callout>
            ) : null}

            <TextAction
              label={t('onboarding.forgotPassword.requested.another')}
              onPress={() => {
                setRequested(false);
                setRequestFailed(false);
              }}
              testID="forgot-password-another"
            />

            {onSignIn ? (
              <TextAction
                align="center"
                label={t('onboarding.signIn.title')}
                onPress={onSignIn}
                testID="forgot-password-sign-in"
              />
            ) : null}
          </>
        ) : (
          <>
            <AppText variant="title">{t('onboarding.forgotPassword.heading')}</AppText>

            <AppText tone="muted" variant="bodySmall">
              {t('onboarding.forgotPassword.supporting')}
            </AppText>

            <FormField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              label={t('onboarding.signIn.email')}
              onChangeText={setEmail}
              testID="forgot-password-email"
              value={email}
            />

            <AppButton
              busy={submitting}
              disabled={!complete || !canRequest}
              label={t('onboarding.forgotPassword.action')}
              onPress={() => void submit()}
              testID="forgot-password-action"
            />

            {requestFailed ? (
              <AppText testID="forgot-password-failed" tone="danger" variant="bodySmall">
                {t('onboarding.forgotPassword.failed')}
              </AppText>
            ) : null}

            {onSignIn ? (
              <TextAction
                align="center"
                label={t('onboarding.signIn.title')}
                onPress={onSignIn}
                testID="forgot-password-sign-in"
              />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
