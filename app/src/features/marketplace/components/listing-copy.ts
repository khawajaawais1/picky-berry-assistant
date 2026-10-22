import { formatDistance } from '@/features/discover';
import { interpolate, type Locale, type TranslationKey } from '@/services/i18n';

import type { MarketListing, MarketSeller } from '../domain/listing';
import { formatEuros } from '../domain/money';

/** A translator, as `useTranslation` hands one out. */
type Translate = (key: TranslationKey) => string;

/**
 * The four lines a listing is printed as, in one place.
 *
 * It is the same kind of table `species-copy.ts` is for the picker's berries: the *data* is the
 * listing's (a number of cents, a weight, a seller), the *words* are the catalogue's, and this is
 * where the two meet. Keeping it here rather than in a screen is what stops frame 15's card and
 * frame 16's screen printing the same price two ways.
 *
 * Every value that the language writes differently passes through the formatter for it: money
 * through `formatEuros` (the decimal mark), a distance through the app's one distance formatter,
 * and a day through the date service. Nothing numeric is ever glued into a string by hand.
 */

/** A listing's price, as frame 15's card prints it (“€8 / kg”). */
export function listingPrice(listing: MarketListing, locale: Locale, t: Translate): string {
  return interpolate(t('market.card.price'), {
    amount: formatEuros(listing.pricePerKgCents, locale),
  });
}

/** The same figure as the listing's own screen prints it (“€8/kg”, frame 16 node `5:23854`). */
export function listingUnitPrice(listing: MarketListing, locale: Locale, t: Translate): string {
  return interpolate(t('market.listing.price'), {
    amount: formatEuros(listing.pricePerKgCents, locale),
  });
}

/**
 * What is left of a listing and where it is: “20 kg available · Laajavuori, Jyväskylä”, and — for a
 * listing the frame describes by how far away it is — “8 kg available · Palokka, 4.2 km away”
 * (frame 15 nodes `5:23813` and `5:23823`).
 *
 * Which of the two forms applies is the data's own answer, not a screen's: a listing that carries a
 * distance is one the frame describes by that distance.
 */
export function listingAvailability(listing: MarketListing, locale: Locale, t: Translate): string {
  const distance = listing.place.distanceKm;

  if (distance !== undefined) {
    return interpolate(t('market.card.availableAway'), {
      available: String(listing.availableKg),
      place: listing.place.area,
      distance: formatDistance(distance * 1000, locale),
    });
  }

  return interpolate(t('market.card.available'), {
    available: String(listing.availableKg),
    place: `${listing.place.area}, ${listing.place.town}`,
  });
}

/** A seller's own line on frame 15's card: “Matti Laine · 4.9 · 24 reviews”. */
export function sellerLine(seller: MarketSeller, t: Translate): string {
  return interpolate(t('market.card.seller'), {
    name: seller.name,
    rating: String(seller.rating),
    reviews: String(seller.reviews),
  });
}

/**
 * The seller's line on their own screen (frame 16 node `5:23871`): the badge's claim and the
 * figures behind it, or the figures alone for a seller the app has not verified.
 */
export function sellerReputation(seller: MarketSeller, t: Translate): string {
  const values = { rating: String(seller.rating), reviews: String(seller.reviews) };

  return seller.verified
    ? interpolate(t('market.seller.meta'), values)
    : interpolate(t('market.seller.metaUnverified'), values);
}

/** Where a listing is, as frame 16's header line prints it (“Laajavuori · Jyväskylä”). */
export function listingPlace(listing: MarketListing): string {
  return `${listing.place.area} · ${listing.place.town}`;
}
