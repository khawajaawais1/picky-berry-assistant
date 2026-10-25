import { Feather } from '@/components/atoms/app-icon';
import { Image, Pressable, View } from 'react-native';

import { AppText } from '@/components/atoms';
import { layout, radii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import type { MarketListing } from '../domain/listing';
import { listingAvailability, listingPrice, sellerLine } from './listing-copy';
import { listingCardPhoto } from './listing-photo';

export type ListingCardProps = {
  listing: MarketListing;
  /**
   * Where the card leads — the listing's own screen — or nothing.
   *
   * The card is a control only when the caller supplies this, exactly as frame 06's zone card is:
   * the design draws a chevron on it, and a chevron on a card that does nothing promises a screen
   * the app does not have (AGENTS.md §11.2). The app has a screen for one of its two demo listings
   * (frames 16–18 tell that one's story), so `src/app/marketplace.tsx` supplies the way in for that
   * one alone.
   */
  onPress?: () => void;
};

/**
 * Frame 15's listing card (node `5:23808`): the berries' photograph, what the listing is called and
 * what it costs, how much is left and where it is, and who is selling it.
 *
 * The photograph is the design's own image fill (`listing-photo.ts`); a listing the app has no
 * photograph for draws none, and the rest of the card keeps its shape.
 *
 * The card is a pressable only with `onPress`: without a destination it is the design's drawing and
 * nothing more.
 */
export function ListingCard({ listing, onPress }: ListingCardProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();

  const photo = listingCardPhoto(listing.id);

  const card = (
    <View
      className="w-full rounded-lg px-gap"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        gap: spacing.cardGap,
        paddingVertical: spacing.gap,
      }}
      testID={`market-listing-${listing.id}`}
    >
      {photo ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={photo}
          style={{
            borderRadius: radii.lg,
            height: layout.listingPhotoHeight,
            width: '100%',
          }}
          testID={`market-listing-${listing.id}-photo`}
        />
      ) : null}

      <View className="w-full flex-row items-center gap-gap">
        <AppText style={{ flex: 1 }} variant="cardHeading">
          {listing.name}
        </AppText>
        <AppText style={{ fontWeight: '400' }} tone="accent" variant="price">
          {listingPrice(listing, locale, t)}
        </AppText>
      </View>

      <AppText tone="muted" variant="caption">
        {listingAvailability(listing, locale, t)}
      </AppText>

      <View className="w-full flex-row items-center gap-gap">
        {listing.seller.verified ? (
          <Feather
            color={colors.success}
            name="check-circle"
            // The frame's `badge-check` glyph, 18 px beside a 12 px line.
            size={18}
            testID={`market-listing-${listing.id}-verified`}
          />
        ) : null}
        <AppText style={{ flex: 1 }} variant="metadata">
          {sellerLine(listing.seller, t)}
        </AppText>
        {onPress ? (
          <Feather
            color={colors.accent}
            name="chevron-right"
            size={18}
            testID={`market-listing-${listing.id}-chevron`}
          />
        ) : null}
      </View>
    </View>
  );

  if (!onPress) return card;

  return (
    <Pressable
      accessibilityLabel={interpolate(t('market.card.open'), { name: listing.name })}
      accessibilityRole="button"
      // The design draws no separate hit area: the card is the control, and it is far taller than
      // the 44 px minimum (`layout.minTouchTarget`).
      onPress={onPress}
      style={{ minHeight: layout.minTouchTarget }}
      testID={`market-listing-${listing.id}-action`}
    >
      {card}
    </Pressable>
  );
}
