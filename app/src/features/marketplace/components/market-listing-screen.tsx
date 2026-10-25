import { Feather } from '@expo/vector-icons';
import { Image, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Card } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, radii, spacing } from '@/constants/theme';
import { speciesLabelKey } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import { DEMO_LISTING, DEMO_LISTING_DETAIL } from '../domain/listing';
import { listingPlace, listingUnitPrice, sellerReputation } from './listing-copy';
import { listingDetailPhoto } from './listing-photo';
import { MarketDisclosure } from './market-disclosure';

export type MarketListingScreenProps = {
  onBack?: () => void;
  /** Opens the thread with this listing's seller (frame 17), or nothing. */
  onContactSeller?: () => void;
  /** Opens the order frames 17 and 18 tell the story of, or nothing. */
  onOpenOrder?: () => void;
};

/**
 * Screen 16 · Planned marketplace · Listing detail (Figma node `5:23832`).
 *
 * One listing, as the design draws it: what it is, what it costs, when it was picked and where to
 * collect it, who is selling it, and the frame's own note about how the money is held.
 *
 * It draws the **one listing the app has a story for** (`DEMO_LISTING` and its
 * `DEMO_LISTING_DETAIL`) — the frame 15 card whose seller frames 17's thread is with and whose
 * order frame 18 prints — which is why it takes no listing prop: `features/discover`'s zone screen
 * resolves its own demo zone the same way, and a screen parameterised with a listing the app knows
 * nothing about would be a screen inventing one.
 *
 * Both of the frame's actions lead somewhere real: **“Contact Matti”** opens the thread frame 17
 * draws, and **“Order berries”** opens the order. A route that has no such destination passes
 * neither, and then neither is drawn — the rule frame 06's card follows (AGENTS.md §11.2).
 *
 * What the app is repeating rather than knowing is recorded in PROJECT.md: the listing, its price,
 * its availability and its seller are the frame's demo composition, and the escrow sentence is the
 * design's **plan** (“Planned provider escrow…”), drawn because the frame draws it.
 */
export function MarketListingScreen({
  onBack,
  onContactSeller,
  onOpenOrder,
}: MarketListingScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const listing = DEMO_LISTING;
  const detail = DEMO_LISTING_DETAIL;
  const photo = listingDetailPhoto(listing.id);
  const species = speciesLabelKey(listing.species);

  return (
    <Screen eyebrow={t('market.eyebrow.listing')} onBack={onBack} title={listing.name}>
      <View className="w-full gap-section">
        <MarketDisclosure>
          <AppText tone="muted" variant="metadata">
            {listingPlace(listing)}
          </AppText>
        </MarketDisclosure>

        {photo ? (
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="cover"
            source={photo}
            style={{
              borderRadius: radii.lg,
              height: layout.listingDetailPhotoHeight,
              width: '100%',
            }}
            testID="market-listing-photo"
          />
        ) : null}

        {/* The frame stacks these three lines 5 px apart (`spacing.chartStack`, which frame 11's
            chart named first) and sets the headline against its price on one 342 px row. */}
        <View className="w-full gap-chartStack">
          <View className="w-full flex-row items-center gap-gap">
            <AppText style={{ flex: 1 }} variant="listingHeading">
              {t('market.listing.headline')}
            </AppText>
            <AppText tone="accent" variant="priceLarge">
              {listingUnitPrice(listing, locale, t)}
            </AppText>
          </View>
          <AppText tone="muted" variant="bodySmall">
            {interpolate(t('market.listing.stock'), {
              // The berry's own word, from the app's one species vocabulary: the frame writes
              // “Wild bilberries” here and the app names the species it knows (docs/design-source.md).
              species: species ? t(species) : listing.species,
              available: String(listing.availableKg),
            })}
          </AppText>
          <AppText tone="muted" variant="bodySmall">
            {t('market.listing.blurb')}
          </AppText>
        </View>

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="calendar" size={22} />
            <AppText variant="bodySmall">
              {interpolate(t('market.listing.harvested'), {
                date: formatLongDate(detail.harvestedOn, locale),
              })}
            </AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="map-pin" size={22} />
            <AppText style={{ flex: 1 }} variant="bodySmall">
              {interpolate(t('market.listing.pickup'), {
                place: detail.pickup.place,
                window: detail.pickup.window,
              })}
            </AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.textMuted} name="truck" size={22} />
            <AppText style={{ flex: 1 }} tone="muted" variant="caption">
              {t('market.listing.delivery')}
            </AppText>
          </View>
        </Card>

        <View className="w-full flex-row items-center gap-gap">
          <Feather color={colors.accent} name="user" size={layout.sellerAvatar} />
          <View className="flex-1 gap-tight">
            <AppText variant="cardLead">{listing.seller.name}</AppText>
            <AppText tone="success" variant="caption">
              {sellerReputation(listing.seller, t)}
            </AppText>
          </View>
        </View>

        <View className="w-full flex-row items-center gap-gap">
          {onContactSeller ? (
            <AppButton
              // The design's own half-width action holds the word alone (“Contact”, 104 px inside
              // its 165 px box). The app's name for the seller is longer than the frame's, and the
              // full name is what a reader needs to know whom the action reaches — so it goes in
              // the accessible name, which has no 104 px to fit into (AGENTS.md §11.2).
              accessibilityLabel={interpolate(t('market.listing.contactA11y'), {
                name: listing.seller.name,
              })}
              icon={<Feather color={colors.accent} name="message-circle" size={20} />}
              label={t('market.listing.contact')}
              onPress={onContactSeller}
              style={{ flex: 1 }}
              testID="market-listing-contact"
              variant="secondary"
            />
          ) : null}
          {onOpenOrder ? (
            <AppButton
              icon={<Feather color={colors.onAccent} name="shopping-bag" size={20} />}
              label={t('market.listing.order')}
              onPress={onOpenOrder}
              style={{ flex: 1 }}
              testID="market-listing-order"
            />
          ) : null}
        </View>

        <AppText tone="muted" variant="metadata">
          {t('market.listing.escrow')}
        </AppText>
      </View>
    </Screen>
  );
}
