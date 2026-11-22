import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { Image, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Card, StatusMessage } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { layout, radii, spacing } from '@/constants/theme';
import { speciesLabelKey } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatLongDate, interpolate, useTranslation } from '@/services/i18n';

import type { MarketApi } from '../services/market-api';
import { listingPlace, listingUnitPrice, sellerReputation } from './listing-copy';
import { listingDetailPhoto } from './listing-photo';

export type MarketListingScreenProps = {
  listingId?: string;
  marketApi: Pick<MarketApi, 'listing'>;
  onBack?: () => void;
  /** Opens the thread with this listing's seller. */
  onContactSeller?: (listingId: string) => void;
  /** Opens the order form for this listing. */
  onOpenOrder?: (listingId: string) => void;
};

/**
 * Screen 16 · Marketplace · Listing detail (Figma node `5:23832`): one listing from
 * `GET /market/listings/:id` — what it is, its price, stock, harvest day, pickup and seller — with
 * the ways on to the seller's thread and to ordering. A sold-out listing offers no order.
 */
export function MarketListingScreen({
  listingId,
  marketApi,
  onBack,
  onContactSeller,
  onOpenOrder,
}: MarketListingScreenProps) {
  const { colors } = useAppTheme();
  const { locale, t } = useTranslation();
  const query = useQuery({
    queryKey: ['market', 'listing', listingId],
    queryFn: () => marketApi.listing(listingId!),
    enabled: listingId !== undefined,
    retry: false,
  });
  const listing = query.data;

  if (!listing) {
    return (
      <Screen eyebrow={t('market.eyebrow.listing')} onBack={onBack}>
        <StatusMessage
          testID="market-listing-status"
          tone={query.isError ? 'danger' : 'muted'}
          variant="bodySmall"
        >
          {t(
            listingId === undefined
              ? 'market.listing.unknown'
              : query.isError
                ? 'market.readFailed'
                : 'common.loading',
          )}
        </StatusMessage>
      </Screen>
    );
  }

  const photo = listingDetailPhoto(listing.species);
  const species = speciesLabelKey(listing.species);
  const available = listing.status === 'active' && listing.availableKg > 0;

  return (
    <Screen eyebrow={t('market.eyebrow.listing')} onBack={onBack} title={listing.name}>
      <View className="w-full gap-section">
        <AppText tone="muted" variant="metadata">
          {listingPlace(listing)}
        </AppText>

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
            {available
              ? interpolate(t('market.listing.stock'), {
                  species: species ? t(species) : listing.species,
                  available: String(listing.availableKg),
                })
              : t('market.listing.soldOut')}
          </AppText>
          {listing.description ? (
            <AppText tone="muted" variant="bodySmall">
              {listing.description}
            </AppText>
          ) : null}
        </View>

        <Card style={{ gap: spacing.cardGap, padding: spacing.section }}>
          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="calendar" size={22} />
            <AppText variant="bodySmall">
              {interpolate(t('market.listing.harvested'), {
                date: formatLongDate(listing.harvestedOn, locale),
              })}
            </AppText>
          </View>

          <View className="w-full flex-row items-center gap-gap">
            <Feather color={colors.accent} name="map-pin" size={22} />
            <AppText style={{ flex: 1 }} variant="bodySmall">
              {interpolate(t('market.listing.pickup'), {
                place: listing.pickup.place,
                window: listing.pickup.window,
              })}
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
              accessibilityLabel={interpolate(t('market.listing.contactA11y'), {
                name: listing.seller.name,
              })}
              icon={<Feather color={colors.accent} name="message-circle" size={20} />}
              label={t('market.listing.contact')}
              onPress={() => onContactSeller(listing.id)}
              style={{ flex: 1 }}
              testID="market-listing-contact"
              variant="secondary"
            />
          ) : null}
          {onOpenOrder && available ? (
            <AppButton
              icon={<Feather color={colors.onAccent} name="shopping-bag" size={20} />}
              label={t('market.listing.order')}
              onPress={() => onOpenOrder(listing.id)}
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
