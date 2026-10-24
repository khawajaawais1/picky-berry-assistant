import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppCheckbox, AppText } from '@/components/atoms';
import { Callout, FormField, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { appEnvironment, type AppEnvironment } from '@/config/env';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import {
  EMPTY_CREATE_ACCOUNT_FORM,
  isSubmittable,
  type CreateAccountForm,
} from '../domain/create-account-form';
import { EXAMPLE_EMAIL, EXAMPLE_NAME } from '../domain/example-values';

export type OnboardingCreateAccountScreenProps = {
  onBack?: () => void;
  onSignIn?: () => void;
  onReadTerms?: () => void;
  /**
   * Creates the account and acquires the session it is signed in with. Resolves `true` when the
   * credential was accepted and the route has moved on, and `false` when it was refused — which
   * is what the screen reports in its failure line.
   *
   * The screen does not ask the session seam itself: whether a credential may become an account
   * is the account service's question, and the answer comes from behind its port
   * (`src/services/session/`). The route above wires this to that port.
   */
  onSubmit?: (values: CreateAccountForm) => Promise<boolean>;
  /**
   * The environment this build was made for, which decides whether the form can be submitted at
   * all. Read from `src/config/env.ts` — the one module allowed to read `EXPO_PUBLIC_*` — and
   * passable so a test can state which build it is testing.
   */
  environment?: AppEnvironment;
};

/**
 * Screen 03 · Onboarding · Create account (Figma node 5:22788).
 *
 * Composition, copy and metrics come from that frame: the back control and screen title, the
 * heading, three labelled fields, the password rule, the consent row with its terms link, the
 * 54 px action, the sign-in action and the privacy note. Every block in the frame's content
 * column sits 18 px apart.
 *
 * **The frame's email/phone chips are not drawn since 2026-10-24.** The account's credential is
 * email + password and phone sign-in is deferred (ADR-054 §5), so the form collects an address
 * and nothing else — the frame's own email state, without a choice that would lead to a flow the
 * app does not have (ADR-059 records the departure). The password field is the frame's own; what
 * used to follow it, screen 04's code, is retired: this press creates the account and signs in.
 *
 * **The frame has no error state.** The action is drawn disabled while the form is incomplete or
 * the submission is in flight, and a credential the service refused (or a session the app could
 * not keep) leaves a failure line under it rather than a silent press (AGENTS.md §2.3). Which
 * error treatment the design owner wants is still open (PROJECT.md open question 11).
 *
 * A **production** build draws the action disabled: today no account service exists, so nothing
 * there could answer the credential (ADR-054 §8). The form is still readable and typed into; the
 * action says it cannot act.
 *
 * Two other deliberate departures from the frame, both recorded in PROJECT.md: the consent
 * control starts unchecked because a pre-ticked box is not a valid affirmative action, and the
 * frame's example values are rendered as placeholders rather than as a filled form, because
 * pre-filling an account form with someone else's details is wrong.
 *
 * The frame also draws an OS status bar and a home indicator; those belong to the device, so they
 * are deliberately not part of the screen.
 */
export function OnboardingCreateAccountScreen({
  onBack,
  onSignIn,
  onReadTerms,
  onSubmit,
  environment,
}: OnboardingCreateAccountScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateAccountForm>(EMPTY_CREATE_ACCOUNT_FORM);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionFailed, setSubmissionFailed] = useState(false);

  const consent = t('onboarding.createAccount.consent');
  const buildEnvironment = environment ?? appEnvironment();
  // Nothing can create an account in a shipped build, so its action cannot act (AGENTS.md §11.2).
  const canCreate = buildEnvironment !== 'production' && onSubmit !== undefined;

  const submit = async () => {
    if (!canCreate || submitting) {
      return;
    }

    setSubmitting(true);
    setSubmissionFailed(false);

    try {
      setSubmissionFailed(!(await onSubmit(form)));
    } catch {
      // The seam rejects only when the session could not be kept, and that is never a success:
      // the screen says the account was not created rather than moving on without a session.
      setSubmissionFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      eyebrow={t('onboarding.createAccount.eyebrow')}
      onBack={onBack}
      title={t('onboarding.createAccount.title')}
    >
      <View className="w-full gap-section">
        <AppText variant="title">{t('onboarding.createAccount.heading')}</AppText>

        <AppText tone="muted" variant="bodySmall">
          {t('onboarding.createAccount.supporting')}
        </AppText>

        <FormField
          autoCapitalize="words"
          label={t('onboarding.createAccount.field.name')}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          placeholder={EXAMPLE_NAME}
          testID="field-name"
          value={form.name}
        />

        <FormField
          accessory={<Feather color={colors.textMuted} name="mail" size={20} />}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          label={t('onboarding.createAccount.field.email')}
          onChangeText={(email) => setForm((current) => ({ ...current, email }))}
          placeholder={EXAMPLE_EMAIL}
          testID="field-email"
          value={form.email}
        />

        {/* The password rule sits 18 px under its field, outside the field's own 7 px
            label gap — the frame sets both blocks on the content column's rhythm. */}
        <View className="w-full gap-section">
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
            label={t('onboarding.createAccount.field.password')}
            onChangeText={(password) => setForm((current) => ({ ...current, password }))}
            secureTextEntry={!passwordVisible}
            testID="field-password"
            value={form.password}
          />
          <AppText tone="muted" variant="metadata">
            {t('onboarding.createAccount.passwordHint')}
          </AppText>
        </View>

        <View className="w-full flex-row gap-gap">
          <AppCheckbox
            accessibilityLabel={consent}
            checked={form.consent}
            onChange={(agreed) => setForm((current) => ({ ...current, consent: agreed }))}
          />
          <View className="flex-1 gap-tight">
            <AppText variant="bodySmall">{consent}</AppText>
            <TextAction
              label={t('onboarding.createAccount.readTerms')}
              onPress={onReadTerms}
              variant="caption"
            />
          </View>
        </View>

        <AppButton
          busy={submitting}
          disabled={!isSubmittable(form) || !canCreate}
          label={t('onboarding.createAccount.action')}
          onPress={() => void submit()}
          testID="create-account-action"
        />

        {submissionFailed ? (
          <AppText testID="create-account-failed" tone="danger" variant="bodySmall">
            {t('onboarding.createAccount.failed')}
          </AppText>
        ) : null}

        <TextAction
          align="center"
          label={t('onboarding.createAccount.signIn')}
          onPress={onSignIn}
          variant="bodySmall"
        />

        <Callout
          icon={<Feather color={colors.success} name="lock" size={20} />}
          testID="create-account-privacy-note"
          title={t('onboarding.createAccount.privacy.title')}
        >
          {t('onboarding.createAccount.privacy.body')}
        </Callout>
      </View>
    </Screen>
  );
}
