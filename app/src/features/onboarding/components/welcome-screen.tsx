import { Feather, MaterialCommunityIcons } from '@/components/atoms/app-icon';
import { Image, View } from 'react-native';

import heroImage from '@/assets/images/welcome-berries.jpg';
import { AppButton, AppText } from '@/components/atoms';
import { TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useTranslation } from '@/services/i18n';

import { BrandLockup } from './brand-lockup';
import { FeatureTags } from './feature-tags';

export type OnboardingWelcomeScreenProps = {
  /** Left unwired until screens 02+ exist; see the route that renders this screen. */
  onGetStarted?: () => void;
  onSignIn?: () => void;
};

/**
 * Screen 01 · Onboarding · Welcome (Figma node 5:22710).
 *
 * Composition, copy and metrics come from that frame: the header row, the brand
 * lockup, the seasonal photograph, the promise, the supporting line, the three
 * feature labels, the 54 px action, the sign-in action and the footer.
 *
 * The frame also draws an OS status bar and a home indicator; those belong to the
 * device, so they are deliberately not part of the screen.
 */
export function OnboardingWelcomeScreen({ onGetStarted, onSignIn }: OnboardingWelcomeScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  return (
    <Screen
      eyebrow={t('onboarding.welcome.eyebrow')}
      headerAccessory={<MaterialCommunityIcons color={colors.success} name="leaf" size={22} />}
      title={t('onboarding.welcome.title')}
    >
      <View className="w-full gap-section">
        <BrandLockup />

        {
          // The design's hero is 342x294. The ratio is a property of the frame, not a
          // token, and it lives on a wrapper that owns the box: an `Image` sized by its
          // own asset lays out at the file's intrinsic 684 px and stretches the column.
        }
        <View className="w-full overflow-hidden rounded-lg" style={{ aspectRatio: 342 / 294 }}>
          <Image
            accessible={false}
            resizeMode="cover"
            source={heroImage}
            style={{ height: '100%', width: '100%' }}
            testID="welcome-hero"
          />
        </View>

        <AppText variant="headline">{t('onboarding.welcome.headline')}</AppText>

        <AppText tone="muted" variant="bodySmall">
          {t('onboarding.welcome.supporting')}
        </AppText>

        <FeatureTags
          tags={[
            t('onboarding.welcome.tag.freshInsights'),
            t('onboarding.welcome.tag.offlineReady'),
            t('onboarding.welcome.tag.privateByNature'),
          ]}
        />

        <View className="gap-md pt-xs">
          <AppButton
            icon={<Feather color={colors.onAccent} name="arrow-right" size={20} />}
            label={t('onboarding.welcome.action')}
            onPress={onGetStarted}
          />
          <TextAction align="center" label={t('onboarding.welcome.signIn')} onPress={onSignIn} />
        </View>

        <AppText style={{ textAlign: 'center' }} tone="muted" variant="metadata">
          {t('onboarding.welcome.footer')}
        </AppText>
      </View>
    </Screen>
  );
}
