import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { FormField, StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { appEnvironment, type AppEnvironment } from '@/config/env';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

export type OnboardingSignInScreenProps = {
  onBack?: () => void;
  /**
   * Signs the returning user in through the session seam. Resolves `true` when the credential was
   * accepted and the route has moved on, and `false` when it was refused — which is what the
   * screen reports in its failure line.
   *
   * The screen neither talks to the provider nor asks the API anything itself: whether an account
   * exists, and whether a password is its own, are the account service's answers, and the route
   * above wires this to the session port (`src/services/session/`).
   */
  onSignIn?: (credential: { email: string; password: string }) => Promise<boolean>;
  /** The way to screen 03, for someone who has no account yet. */
  onCreateAccount?: () => void;
  /**
   * The way to the password-reset journey (ADR-062). It is drawn only when the route supplies it,
   * because a recovery label with nowhere to go would claim an action it cannot take.
   */
  onForgotPassword?: () => void;
  /**
   * The environment this build was made for, which decides whether the action can act at all.
   * Read from `src/config/env.ts` — the one module allowed to read `EXPO_PUBLIC_*` — and passable
   * so a test can state which build it is testing.
   */
  environment?: AppEnvironment;
};

/**
 * The sign-in screen — **the design never drew it** (PROJECT.md known issue 23).
 *
 * Frames 01 and 03 both draw an “Already have an account? Sign in” link and neither had a
 * destination, because no frame signs anyone in. The screen is app-drawn from the design owner's
 * answers (ADR-034) and was re-cut on 2026-10-24 from an identifier + stand-in code to the
 * credential the account actually has: **email + password** (ADR-054, recorded in ADR-059). It
 * keeps the 76 px key tile and the screen's framing, so it still reads as the app's own door
 * rather than as another frame.
 *
 * It draws the **recovery action** the journey now has (ADR-062): “Forgot password?” opens the
 * app-drawn reset request, where the provider owns the link and the app keeps no token. It draws
 * no “wrong credentials” distinction between an unknown address and a wrong password (the service
 * must not let the app tell them apart), and no biometric prompt. It does draw the one state a
 * press can produce that the design does not: a failure line, because a refused press must not be
 * silent (AGENTS.md §2.3).
 *
 * A **production** build draws the action disabled: no account service exists yet, so nothing
 * there could answer the credential (ADR-054 §8). The fields are still readable and typed into.
 *
 * The screen is app-drawn, so its copy is this repository's — written in the app's voice, in both
 * shipped languages, and reviewed here rather than in a frame.
 */
export function OnboardingSignInScreen({
  onBack,
  onSignIn,
  onCreateAccount,
  onForgotPassword,
  environment,
}: OnboardingSignInScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signInFailed, setSignInFailed] = useState(false);

  const buildEnvironment = environment ?? appEnvironment();
  // Nothing can check a password in a shipped build, so its action cannot act (AGENTS.md §11.2).
  const canSignIn = buildEnvironment !== 'production' && onSignIn !== undefined;
  const complete = email.trim() !== '' && password !== '';

  const submit = async () => {
    if (!canSignIn || submitting || !complete) {
      return;
    }

    setSubmitting(true);
    setSignInFailed(false);

    try {
      setSignInFailed(!(await onSignIn({ email: email.trim(), password })));
    } catch {
      // The seam rejects only when the session could not be kept, and that is never a success:
      // the screen says the sign-in did not get through rather than moving on without a session.
      setSignInFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow={t('onboarding.signIn.eyebrow')}
      onBack={onBack}
      title={t('onboarding.signIn.title')}
    >
      <View className="w-full gap-section">
        {
          // The same 76 px tile the code screen carried, with the key the screen was chosen for:
          // a door, not a form (ADR-034's reading A).
        }
        <View
          className="items-center justify-center rounded-lg"
          style={{
            backgroundColor: colors.accentMuted,
            height: layout.symbolTile,
            width: layout.symbolTile,
          }}
          testID="sign-in-symbol"
        >
          <Feather color={colors.accent} name="key" size={36} />
        </View>

        <AppText variant="title">{t('onboarding.signIn.heading')}</AppText>

        <AppText tone="muted" variant="bodySmall">
          {t('onboarding.signIn.supporting')}
        </AppText>

        <FormField
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label={t('onboarding.signIn.email')}
          onChangeText={setEmail}
          testID="sign-in-email"
          value={email}
        />

        <FormField
          accessory={
            <Pressable
              accessibilityLabel={t(
                passwordVisible ? 'common.hidePassword' : 'common.showPassword',
              )}
              accessibilityRole="button"
              onPress={() => setPasswordVisible((visible) => !visible)}
            >
              <Feather
                color={colors.textMuted}
                name={passwordVisible ? 'eye' : 'eye-off'}
                size={20}
              />
            </Pressable>
          }
          autoCapitalize="none"
          autoComplete="current-password"
          label={t('onboarding.signIn.password')}
          onChangeText={setPassword}
          secureTextEntry={!passwordVisible}
          testID="sign-in-password"
          value={password}
        />

        <TextAction
          label={t('onboarding.signIn.forgotPassword')}
          onPress={onForgotPassword}
          testID="sign-in-forgot-password"
        />

        <AppButton
          busy={submitting}
          disabled={!complete || !canSignIn}
          label={t('onboarding.signIn.action')}
          onPress={() => void submit()}
          testID="sign-in-action"
        />

        {signInFailed ? (
          <StatusMessage testID="sign-in-failed" tone="danger" variant="bodySmall">
            {t('onboarding.signIn.failed')}
          </StatusMessage>
        ) : null}

        <TextAction
          align="center"
          label={t('onboarding.signIn.createAccount')}
          onPress={onCreateAccount}
          testID="sign-in-create-account"
        />
      </View>
    </Screen>
  );
}
