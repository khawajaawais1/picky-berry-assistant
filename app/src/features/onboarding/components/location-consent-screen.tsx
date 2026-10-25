import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Image, View } from 'react-native';

import zoneMapPreview from '@/assets/images/zone-map-preview.png';
import { AppButton, AppCheckbox, AppText } from '@/components/atoms';
import { TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePrivacyConsent } from '@/hooks/use-privacy-consent';
import { useTranslation } from '@/services/i18n';

import { canContinue } from '../domain/location-consent';

export type OnboardingLocationConsentScreenProps = {
  onBack?: () => void;
  /**
   * Where the press leads: the app's own map, which this screen draws above it. The frame's own
   * label named a settings step the app never takes (“Continue to location settings”), so the
   * action says what the press does instead ([ADR-050](../../../../docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md)).
   */
  onContinue?: () => void;
  /** The frame's “Not now · browse without tracking”. */
  onSkip?: () => void;
};

/**
 * Screen 05 · Onboarding · Location consent (Figma node 5:22885).
 *
 * Composition, copy and metrics come from that frame: the back control and screen title,
 * the zone-map preview, the heading, the supporting line, the benefits card with its two
 * rows, the consent row, the reassurance line, the 54 px action and the way past the
 * screen without tracking.
 *
 * The frame's map was exported from that node (342x192, @2x, into `assets/images/`) and is
 * presented as the design's illustration: it holds the design's demo zones, not this
 * user's, and nothing on it is an affordance — the two benefit rows below state the same
 * thing in words, which is also what a screen reader gets (see PROJECT.md for the labels
 * baked into it).
 *
 * What the row consents to is **recorded** rather than held in this screen's state: the
 * privacy screen switches the same record off again, which is what the frame's own
 * sentence promises (“I can turn it off in Privacy settings”). Where that record lives and
 * why is ADR-020's subject.
 *
 * Three deliberate departures, all recorded in PROJECT.md: the consent row ships **unchecked**
 * although the frame draws it ticked, because consent must be an affirmative action; the action
 * does **not** ask the operating system for anything — it reports the user's decision instead,
 * since the lawful basis for location is the owner's call (open question 15) — and its label says
 * where the press leads (“Continue to the map”) rather than the frame's settings step, which names
 * a screen that does not exist and a step the app never takes
 * ([ADR-050](../../../../docs/adr/ADR-050-screen-05s-continue-action-says-what-the-press-does.md),
 * closing known issue 33); and the row and the benefit above it say the app times visits **while
 * it is open**, where the frame promises the screen-locked background. The app reads no position
 * in the background (ADR-045), so the frame's heavier promise is withdrawn from the copy and put
 * to the owner as a decision
 * ([ADR-047](../../../../docs/adr/ADR-047-the-consent-says-what-the-app-does.md)).
 *
 * The frame also draws an OS status bar and a home indicator; those belong to the device.
 */
export function OnboardingLocationConsentScreen({
  onBack,
  onContinue,
  onSkip,
}: OnboardingLocationConsentScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { consent, loading, record } = usePrivacyConsent();
  const consentCopy = t('onboarding.location.consent');
  // While the record has not been read the screen knows of no consent, which is why the
  // action waits: a returning user sees their own answer appear a moment later, and a new
  // one is never assumed to have given it.
  const visitTracking = consent?.visitTracking ?? false;

  return (
    <Screen
      eyebrow={t('onboarding.location.eyebrow')}
      onBack={onBack}
      title={t('onboarding.location.title')}
    >
      <View className="w-full gap-section">
        <ZoneMapPreview />

        <AppText variant="title">{t('onboarding.location.heading')}</AppText>

        <AppText tone="muted" variant="bodySmall">
          {t('onboarding.location.supporting')}
        </AppText>

        <View
          className="w-full gap-cardGap rounded-lg px-section py-section"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
          }}
          testID="location-benefits"
        >
          <BenefitRow
            body={t('onboarding.location.benefit.nearby.body')}
            icon={<Feather color={colors.accent} name="map-pin" size={22} />}
            title={t('onboarding.location.benefit.nearby.title')}
          />
          <BenefitRow
            body={t('onboarding.location.benefit.timing.body')}
            icon={<MaterialCommunityIcons color={colors.accent} name="timer-outline" size={22} />}
            title={t('onboarding.location.benefit.timing.title')}
          />
        </View>

        <AppCheckbox
          accessibilityLabel={consentCopy}
          checked={visitTracking}
          label={consentCopy}
          onChange={(next) => void record(next)}
        />

        <AppText tone="success" variant="caption">
          {t('onboarding.location.reassurance')}
        </AppText>

        <AppButton
          disabled={loading || !canContinue({ visitTracking })}
          label={t('onboarding.location.action')}
          onPress={() => onContinue?.()}
          testID="location-consent-action"
        />

        <TextAction
          align="center"
          label={t('onboarding.location.skip')}
          onPress={onSkip}
          testID="location-consent-skip"
        />
      </View>
    </Screen>
  );
}

/**
 * The frame's zone-map preview: 342x192 at the card radius. The ratio is a property of the
 * frame, not a token, and it lives on a wrapper that owns the box — an `Image` sized by its
 * own asset lays out at the file's intrinsic 684 px and stretches the column (the same
 * treatment screen 01's hero photograph gets).
 */
function ZoneMapPreview() {
  return (
    <View
      className="w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: 342 / 192 }}
      testID="location-zone-map"
    >
      <Image
        accessible={false}
        resizeMode="cover"
        source={zoneMapPreview}
        style={{ height: '100%', width: '100%' }}
        testID="location-zone-map-image"
      />
    </View>
  );
}

/**
 * One row of the frame's benefits card: a 22 px accent glyph, 12 px away from the row's
 * title and body, which sit 8 px apart.
 *
 * Local to this screen on purpose — the repository extracts a shared component on its
 * third real use, and this is one row used twice in one card (see AGENTS.md §2.5).
 */
function BenefitRow({ body, icon, title }: { body: string; icon: ReactNode; title: string }) {
  return (
    <View className="w-full flex-row items-center gap-gap">
      {icon}
      <View className="flex-1 gap-sm">
        <AppText variant="cardTitle">{title}</AppText>
        <AppText tone="muted" variant="caption">
          {body}
        </AppText>
      </View>
    </View>
  );
}
