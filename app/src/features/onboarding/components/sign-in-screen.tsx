import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { FormField, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

export type OnboardingSignInScreenProps = {
  onBack?: () => void;
  /**
   * Hands the identifier up so the code screen can name the destination it is asking about. The
   * screen neither sends a code nor asks the account service anything itself: whether an account
   * exists, and what the code is, are the service's answers, and the route above wires this to the
   * session seam. Nothing in the app sends a code yet, which is why the action says what the press
   * does rather than naming a delivery (ADR-048).
   */
  onSendCode?: (identifier: string) => void;
  /** The way to screen 03, for someone who has no account yet. */
  onCreateAccount?: () => void;
};

/**
 * The sign-in screen — **the design never drew it** (PROJECT.md known issue 23).
 *
 * Frames 01 and 03 both draw an “Already have an account? Sign in” link and neither had a
 * destination, because no frame signs anyone in. The design owner chose the reading this screen
 * is built from — **one identifier field, then the code screen the sign-up already walks**
 * (ADR-034, answered 2026-10-11): one identifier, no password to store, reset or leak, and no
 * second code screen to design, since frame 04 exists, is built and is measured. What it
 * deliberately does not draw: a password, a recovery action, a “wrong credentials” line and a
 * biometric prompt, each of which would be a state no frame draws and no answer has settled.
 *
 * It sits **outside the app shell**, as frames 01–05 do, and it is reached from the two frames'
 * own links. What happens after the code is accepted is the route's decision, not this screen's:
 * a returning user lands in the app rather than on screen 05, because they are not signing up.
 *
 * The screen is app-drawn, so its copy is this repository's — written in the app's voice, in both
 * shipped languages, and reviewed here rather than in a frame.
 */
export function OnboardingSignInScreen({
  onBack,
  onSendCode,
  onCreateAccount,
}: OnboardingSignInScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');

  // An identifier the code screen can name is one that is there: whitespace alone is not one, and
  // the action claims no role until there is something to carry onward (AGENTS.md §11.2).
  const canSend = identifier.trim() !== '';

  return (
    <Screen
      eyebrow={t('onboarding.signIn.eyebrow')}
      onBack={onBack}
      title={t('onboarding.signIn.title')}
    >
      <View className="w-full gap-section">
        {
          // The same 76 px tile the code screen carries, with the key the reading was chosen
          // for: a door, not a form (ADR-034's reading A).
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
          label={t('onboarding.signIn.identifier')}
          onChangeText={setIdentifier}
          testID="sign-in-identifier"
          value={identifier}
        />

        <AppButton
          disabled={!canSend}
          icon={<Feather color={colors.onAccent} name="send" size={20} />}
          label={t('onboarding.signIn.action')}
          onPress={() => onSendCode?.(identifier.trim())}
          testID="sign-in-action"
        />

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
