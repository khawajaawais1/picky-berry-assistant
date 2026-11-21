import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { ChoiceChips, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useSession } from '@/hooks/use-session';
import { useAccountProfile, type ProfileApi, type ProfilePatch } from '@/features/privacy';
import { useTranslation } from '@/services/i18n';

import { ALERT_RADII_KM, formatRadius } from '../domain/alert-radius';
import { isSpecies, type Species } from '../domain/species';
import { SpeciesChips } from './species-chips';

export type AlertPreferencesScreenProps = {
  /** The account service: the radius and species are the account's (`PATCH /me`). */
  accountApi?: ProfileApi;
  onBack?: () => void;
};

/**
 * The screen behind frame 12's “Search radius” and “Species” rows (ADR-067). The frame draws the
 * rows and nothing behind them, so this screen is app-drawn from the molecules the app already has:
 * the radius is one choice among the frame's own kind of chips, and the species are the zone map's
 * own species chips, so a berry is chosen the same way everywhere.
 *
 * Each change is saved at once and is what the alerts card reads next. A species code the account
 * holds that the app cannot name is kept as it is: this screen changes only what it draws.
 */
export function AlertPreferencesScreen({ accountApi, onBack }: AlertPreferencesScreenProps) {
  const { locale, t } = useTranslation();
  const { loading: sessionLoading, session } = useSession();
  const { profile, save, status } = useAccountProfile(accountApi, session?.accountId ?? null);
  const [failed, setFailed] = useState(false);

  const change = async (patch: ProfilePatch) => {
    setFailed(false);
    const outcome = await save(patch);
    if (!outcome.ok) setFailed(true);
  };

  const toggle = (species: Species) => {
    if (!profile) return;
    const held = profile.speciesInterest;
    void change({
      speciesInterest: held.includes(species)
        ? held.filter((code) => code !== species)
        : [...held, species],
    });
  };

  const signedOut = !accountApi || (!sessionLoading && session === null);

  return (
    <Screen
      edges={['top']}
      eyebrow={t('discover.alertPreferences.eyebrow')}
      onBack={onBack}
      title={t('discover.alertPreferences.title')}
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          {t('discover.alertPreferences.intro')}
        </AppText>

        {signedOut ? (
          <AppText variant="bodySmall">{t('discover.alertPreferences.signedOut')}</AppText>
        ) : null}

        {status === 'loading' ? (
          <AppText tone="muted" variant="caption">
            {t('common.loading')}
          </AppText>
        ) : null}

        {status === 'error' ? (
          <StatusMessage tone="danger" variant="caption">
            {t('discover.alert.preferences.readFailed')}
          </StatusMessage>
        ) : null}

        {profile ? (
          <>
            <View className="w-full gap-cardGap">
              <AppText variant="cardTitle">{t('discover.alert.preferences.radius')}</AppText>
              <ChoiceChips<string>
                label={t('discover.alert.preferences.radius')}
                onChange={(next) => void change({ alertRadiusKm: Number(next) })}
                // The account's own radius is offered even when it is not one of the screen's, so
                // the choice that is held is always the one drawn as chosen.
                options={[...new Set([...ALERT_RADII_KM, profile.alertRadiusKm])]
                  .sort((a, b) => a - b)
                  .map((km) => ({
                    label: formatRadius(km, locale),
                    value: String(km),
                  }))}
                value={String(profile.alertRadiusKm)}
              />
            </View>

            <View className="w-full gap-cardGap">
              <AppText variant="cardTitle">{t('discover.alert.preferences.species')}</AppText>
              <SpeciesChips
                onToggle={toggle}
                selected={profile.speciesInterest.filter(isSpecies)}
              />
            </View>
          </>
        ) : null}

        {failed ? (
          <StatusMessage testID="alert-preferences-save-failed" tone="danger" variant="caption">
            {t('discover.alertPreferences.saveFailed')}
          </StatusMessage>
        ) : null}
      </View>
    </Screen>
  );
}
