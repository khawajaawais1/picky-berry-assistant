import { Feather } from '@/components/atoms/app-icon';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { StatusMessage, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDevicePosition } from '@/hooks/use-device-position';
import { interpolate, useTranslation } from '@/services/i18n';

import { filterListings } from '../domain/listing';
import type { MarketApi } from '../services/market-api';
import { ListingCard } from './listing-card';
import { MarketSearchField } from './market-search-field';

export type MarketBrowseScreenProps = {
  marketApi: Pick<MarketApi, 'listings'>;
  onOpenListing?: (listingId: string) => void;
};

/**
 * Screen 15 · Marketplace · Browse (Figma node `5:23762`).
 *
 * The active listings from `GET /market/listings`, nearest first by the distance the API measures
 * from the phone's position when the picker allowed one. The search narrows them by name, place
 * or seller; every card opens its listing.
 */
export function MarketBrowseScreen({ marketApi, onOpenListing }: MarketBrowseScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();
  const { fix } = useDevicePosition();
  const position = fix ? { latitude: fix.latitude, longitude: fix.longitude } : undefined;
  const listings = useQuery({
    queryKey: [
      'market',
      'listings',
      position ? Math.round(position.latitude * 100) : null,
      position ? Math.round(position.longitude * 100) : null,
    ],
    queryFn: () => marketApi.listings(position),
    retry: false,
  });

  const [query, setQuery] = useState('');
  const matches = filterListings(listings.data ?? [], query).sort(
    (a, b) => (a.place.distanceKm ?? Infinity) - (b.place.distanceKm ?? Infinity),
  );
  const count = matches.length;

  return (
    <Screen
      eyebrow={t('market.eyebrow.browse')}
      headerAccessory={<Feather color={colors.success} name="feather" size={22} />}
      title={t('market.title.browse')}
    >
      <View className="w-full gap-section">
        <MarketSearchField onChangeText={setQuery} value={query} />

        {listings.data ? (
          <>
            <View className="w-full gap-section">
              {matches.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onPress={onOpenListing ? () => onOpenListing(listing.id) : undefined}
                />
              ))}
            </View>

            <AppText
              style={{ textAlign: 'center' }}
              testID="market-browse-count"
              tone="muted"
              variant="bodySmall"
            >
              {count === 0
                ? t(query.trim() === '' ? 'market.browse.empty' : 'market.browse.none')
                : interpolate(
                    count === 1 ? t('market.browse.count.one') : t('market.browse.count.many'),
                    { count: String(count) },
                  )}
            </AppText>
          </>
        ) : (
          <View className="w-full items-center gap-gap">
            <StatusMessage
              testID="market-browse-status"
              tone={listings.isError ? 'danger' : 'muted'}
              variant="bodySmall"
            >
              {t(listings.isError ? 'market.readFailed' : 'common.loading')}
            </StatusMessage>
            {listings.isError ? (
              <TextAction label={t('discover.map.retry')} onPress={() => void listings.refetch()} />
            ) : null}
          </View>
        )}
      </View>
    </Screen>
  );
}
