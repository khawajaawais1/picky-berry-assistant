import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppButton, AppCheckbox, AppText } from '@/components/atoms';
import {
  Callout,
  ChoiceChips,
  FormField,
  TextAction,
  type ChoiceChipOption,
} from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation, type Translation } from '@/services/i18n';

import {
  EMPTY_CREATE_ACCOUNT_FORM,
  applyIdentifierMode,
  isSubmittable,
  type CreateAccountForm,
  type IdentifierMode,
} from '../domain/create-account-form';
import { EXAMPLE_EMAIL, EXAMPLE_NAME } from '../domain/example-values';

export type OnboardingCreateAccountScreenProps = {
  onBack?: () => void;
  onSignIn?: () => void;
  onReadTerms?: () => void;
  onSubmit?: (values: CreateAccountForm) => void;
};

function modeOptions(t: Translation['t']): readonly ChoiceChipOption<IdentifierMode>[] {
  return [
    { label: t('onboarding.createAccount.mode.email'), value: 'email' },
    { label: t('onboarding.createAccount.mode.phone'), value: 'phone' },
  ];
}

/**
 * The identifier field's own specifics per mode. The frame only draws the email
 * state, so the phone state carries the chip's copy and no invented example.
 */
function identifierField(
  mode: IdentifierMode,
  t: Translation['t'],
): {
  autoCapitalize: 'none';
  keyboardType: 'email-address' | 'phone-pad';
  label: string;
  placeholder?: string;
} {
  return mode === 'email'
    ? {
        autoCapitalize: 'none',
        keyboardType: 'email-address',
        label: t('onboarding.createAccount.field.email'),
        placeholder: EXAMPLE_EMAIL,
      }
    : {
        autoCapitalize: 'none',
        keyboardType: 'phone-pad',
        label: t('onboarding.createAccount.field.phone'),
      };
}

/**
 * Screen 03 · Onboarding · Create account (Figma node 5:22788).
 *
 * Composition, copy and metrics come from that frame: the back control and screen
 * title, the heading, the identifier chips, three labelled fields, the password rule,
 * the consent row with its terms link, the 54 px action, the sign-in action and the
 * privacy note. Every block in the frame's content column sits 18 px apart.
 *
 * Two deliberate departures from the frame, both recorded in PROJECT.md: the consent
 * control starts unchecked because a pre-ticked box is not a valid affirmative action,
 * and the frame's example values are rendered as placeholders rather than as a filled
 * form, because pre-filling an account form with someone else's details is wrong.
 *
 * The frame also draws an OS status bar and a home indicator; those belong to the
 * device, so they are deliberately not part of the screen.
 */
export function OnboardingCreateAccountScreen({
  onBack,
  onSignIn,
  onReadTerms,
  onSubmit,
}: OnboardingCreateAccountScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [form, setForm] = useState<CreateAccountForm>(EMPTY_CREATE_ACCOUNT_FORM);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const identifier = identifierField(form.mode, t);
  const consent = t('onboarding.createAccount.consent');

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

        <ChoiceChips
          label={t('onboarding.createAccount.mode.label')}
          onChange={(mode) => setForm((current) => applyIdentifierMode(current, mode))}
          options={modeOptions(t)}
          value={form.mode}
        />

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
          autoCapitalize={identifier.autoCapitalize}
          keyboardType={identifier.keyboardType}
          label={identifier.label}
          onChangeText={(value) => setForm((current) => ({ ...current, identifier: value }))}
          placeholder={identifier.placeholder}
          testID="field-identifier"
          value={form.identifier}
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
          disabled={!isSubmittable(form)}
          label={t('onboarding.createAccount.action')}
          onPress={() => onSubmit?.(form)}
          testID="create-account-action"
        />

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
