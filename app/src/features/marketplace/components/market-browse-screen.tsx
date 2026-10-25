import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/atoms';
import { Chip, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';
import { interpolate, useTranslation } from '@/services/i18n';

import { DEMO_LISTING_ID, DEMO_LISTINGS, filterListings } from '../domain/listing';
import { ListingCard } from './listing-card';
import { MarketDisclosure } from './market-disclosure';
import { MarketSearchField } from './market-search-field';

export type MarketBrowseScreenProps = {
  /**
   * Opens the listing's own screen (frame 16). Left out when the route has nowhere to send it, and
   * no card then draws a chevron or claims a role.
   *
   * The app has a screen for **one** of the frame's two listings — frames 16–18 tell that one's
   * story — so the way in belongs to that card alone and this takes no argument: the route's
   * destination does not depend on which card was pressed, because only one of them is a way in.
   */
  onOpenListing?: () => void;
};

/**
 * Screen 15 · Planned marketplace · Browse (Figma node `5:23780`).
 *
 * The design's marketplace front door as a **demo**: two listings, drawn from the frame's own two
 * cards, with the frame's own disclosure above them (“Planned extra”, “Buyer mode · Preview”).
 * There is no listings service, so the composition is `DEMO_LISTINGS` and the screen says so — the
 * same arrangement frame 06's map has with its “SEASON DEMO” eyebrow.
 *
 * What is real is the search. The frame asks for berries near a place, and `filterListings` answers
 * exactly that question over the listings the app holds, narrowing the list as it is typed. What is
 * left is visible two ways: the cards themselves, and the frame's own line under them, whose count
 * is the number the search left — the answer a filter has to give, and the case where it leaves
 * none is a state the frame does not draw and a picker still needs.
 *
 * One card is a way in and the other is not: frames 16–18 tell the story of the first, so it opens
 * the listing screen and draws the frame's chevron, while the second is the frame's own drawing of
 * a marketplace that has more in it than this app does. It is still searched and still drawn — it
 * simply leads nowhere, and says so by drawing no chevron (the rule frame 06's zone list follows).
 *
 * Three things the frame draws and this screen deliberately does not, all recorded in PROJECT.md:
 *
 * - its **three filter chips** — the app holds two listings and both survive each of them, so a
 *   chip that acted would be a filter nothing can observe. They are drawn as the frame draws them,
 *   in the frame's own chosen and unchosen states, and claim no role (the rule frame 11's period
 *   chips are drawn under);
 * - its **sliders glyph** inside the field, a filter sheet this app does not have;
 * - the **core navigation**, which the marketplace frames do not draw at all: they label themselves
 *   “OUTSIDE CORE”, and the app shell's four destinations cover frames 06–14 (ADR-022).
 *
 * The OS status bar and home indicator the frame draws belong to the device.
 */
export function MarketBrowseScreen({ onOpenListing }: MarketBrowseScreenProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation();

  const [query, setQuery] = useState('');
  const matches = filterListings(DEMO_LISTINGS, query);
  const count = matches.length;

  return (
    <Screen
      eyebrow={t('market.eyebrow.browse')}
      headerAccessory={<Feather color={colors.success} name="feather" size={22} />}
      title={t('market.title.browse')}
    >
      <View className="w-full gap-section">
        <MarketDisclosure>
          <AppText tone="muted" variant="metadata">
            {t('market.browse.mode')}
          </AppText>
        </MarketDisclosure>

        <MarketSearchField onChangeText={setQuery} value={query} />

        {/* The frame's three chips, in its own states. `flex-wrap`: the frames set them on one line
            and their own labels fit in one; at the largest system text size they do not (ADR-019). */}
        <View className="w-full flex-row flex-wrap gap-sm" testID="market-filters">
          <Chip label={t('market.filter.all')} testID="market-filter-all" tone="accent" />
          <Chip label={t('market.filter.pickup')} testID="market-filter-pickup" />
          <Chip label={t('market.filter.distance')} testID="market-filter-distance" />
        </View>

        <View className="w-full gap-section">
          {matches.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onPress={onOpenListing && listing.id === DEMO_LISTING_ID ? onOpenListing : undefined}
            />
          ))}
        </View>

        {/* The frame's own text action (node `5:23828`, “Browse 12 local listings”), with the number
            the app can answer for. It opens nothing — there is no listing index behind it — so it
            claims no role, the way frame 07's “See all 11” is drawn as the design's words. */}
        <TextAction
          align="center"
          label={
            count === 0
              ? t('market.browse.none')
              : interpolate(
                  count === 1 ? t('market.browse.count.one') : t('market.browse.count.many'),
                  {
                    count: String(count),
                  },
                )
          }
          testID="market-browse-count"
        />
      </View>
    </Screen>
  );
}
