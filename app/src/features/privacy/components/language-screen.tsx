import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { ChoiceChips, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useSession } from '@/hooks/use-session';
import { setAppLocale, useTranslation, type Locale } from '@/services/i18n';

import { useAccountProfile, type ProfileApi } from '../hooks/use-account-profile';

export type LanguageScreenProps = {
  /** The account service: the language is the account's (`lang` on `PATCH /me`). */
  accountApi?: ProfileApi;
  onBack?: () => void;
};

/**
 * The screen behind frame 14's “Language” row (node `5:23663`). The frame draws the row and
 * nothing behind it, so this screen is app-drawn (ADR-067, amending ADR-017's “no in-app picker”).
 *
 * The choice belongs to the **account**: it is saved with `PATCH /me`, and the app speaks it as soon
 * as the service has kept it — not before, so the screen never claims a language the account does
 * not hold. Each language is named in its own words (“English”, “Suomi”), the way a picker is
 * readable by someone who does not read the language the app is in.
 *
 * Without an account there is nothing to save the choice to, so the screen offers none and says
 * the app follows the phone — which is what it does.
 */
export function LanguageScreen({ accountApi, onBack }: LanguageScreenProps) {
  const { locale, t } = useTranslation();
  const { loading: sessionLoading, session } = useSession();
  const { profile, save, status } = useAccountProfile(accountApi, session?.accountId ?? null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const choose = async (next: Locale) => {
    if (saving || next === locale) return;
    setSaving(true);
    setFailed(false);
    const outcome = await save({ lang: next });
    setSaving(false);
    if (outcome.ok) setAppLocale(next);
    else setFailed(true);
  };

  const signedOut = !sessionLoading && session === null;

  return (
    <Screen
      edges={['top']}
      eyebrow={t('privacy.languageScreen.eyebrow')}
      onBack={onBack}
      title={t('privacy.language.title')}
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          {t('privacy.languageScreen.intro')}
        </AppText>

        {signedOut || !accountApi ? (
          <AppText testID="language-signed-out" variant="bodySmall">
            {t('privacy.languageScreen.signedOut')}
          </AppText>
        ) : null}

        {status === 'loading' ? (
          <AppText testID="language-loading" tone="muted" variant="caption">
            {t('common.loading')}
          </AppText>
        ) : null}

        {status === 'error' ? (
          <StatusMessage testID="language-read-failed" tone="danger" variant="caption">
            {t('privacy.languageScreen.readFailed')}
          </StatusMessage>
        ) : null}

        {profile ? (
          <ChoiceChips<Locale>
            label={t('privacy.languageScreen.choices')}
            onChange={(next) => void choose(next)}
            options={[
              { label: t('privacy.languageScreen.english'), value: 'en' },
              { label: t('privacy.languageScreen.finnish'), value: 'fi' },
            ]}
            value={locale}
          />
        ) : null}

        {failed ? (
          <StatusMessage testID="language-save-failed" tone="danger" variant="caption">
            {t('privacy.languageScreen.saveFailed')}
          </StatusMessage>
        ) : null}
      </View>
    </Screen>
  );
}
