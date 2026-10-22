import type { Species } from '@/features/discover';

/**
 * What the marketplace sells, as frame 15 (Planned marketplace · Browse, node `5:23780`) draws it
 * and frames 16–18 tell their story about.
 *
 * **All of it is the design's own demo.** There is no listings service, no seller account, no
 * payment provider and no chat transport, and the frames say so themselves: frame 15's chip reads
 * “Planned extra”, its own line “Buyer mode · Preview”, frame 18's second chip “Provider test mode”
 * and its status message “No real money was charged. Demo payment is held by the provider.” So the
 * two listings below are the frame's own two cards — nothing more was invented for them than the
 * identifiers the app needs — and the screens that draw them carry the frame's own disclosure
 * rather than claiming a marketplace that answers.
 *
 * **Money is an integer number of cents**, never a float, and `money.ts` is where it becomes a
 * price a person reads.
 *
 * The species is the app's own vocabulary (`features/discover`'s three berries, which is what the
 * catalogue has words for); the *words* are the catalogue's (`market.species.*`), never these
 * identifiers, which is what `components/listing-copy.ts` joins.
 */

/** Who is selling, as frame 15's card line and frame 16's seller row print them. */
export type MarketSeller = {
  name: string;
  /** The frame's own rating, out of five (“4.9 / 5”, frame 16 node `5:23871`). */
  rating: number;
  reviews: number;
  /**
   * Whether the app has verified the seller. The design draws a `badge-check` beside every seller
   * it shows, and it says “Verified seller”; the flag is data because a marketplace with no
   * verification process must not draw that badge for someone it has not verified.
   */
  verified: boolean;
};

/**
 * Where a listing is, in the three pieces the design's own lines are built from: the frames print
 * “Laajavuori, Jyväskylä” on the card, “Laajavuori · Jyväskylä” in the detail header and
 * “Laajavuori” alone in the chat's listing row, and the second listing is described by how far
 * away it is rather than by its town.
 *
 * The distance is a number, not part of a string, because the two languages write its decimal mark
 * differently (“4.2 km” against “4,2 km”) and a formatted distance has to be a formatted number.
 */
export type MarketPlace = {
  area: string;
  town: string;
  /** How far it is. Absent for the listing in the picker's own town. */
  distanceKm?: number;
};

export type MarketListing = {
  id: string;
  /** What the card and the detail header call it ("Fresh blueberries"). */
  name: string;
  species: Species;
  /** Euros per kilogram, in cents. */
  pricePerKgCents: number;
  availableKg: number;
  place: MarketPlace;
  seller: MarketSeller;
};

/**
 * The frame's own two listing cards, in the order it draws them (nodes `5:23808` and `5:23818`).
 *
 * Only the first is a listing the app has a story for: frames 16–18 are about it, its seller and
 * its order. The second is drawn because the frame draws it, and the search may find it.
 */
export const DEMO_LISTINGS: readonly MarketListing[] = [
  {
    id: 'blueberries',
    name: 'Fresh blueberries',
    species: 'bilberry',
    pricePerKgCents: 800,
    availableKg: 20,
    place: { area: 'Laajavuori', town: 'Jyväskylä' },
    seller: { name: 'Matti Laine', rating: 4.9, reviews: 24, verified: true },
  },
  {
    id: 'lingonberries',
    name: 'Wild lingonberries',
    species: 'lingonberry',
    pricePerKgCents: 600,
    availableKg: 8,
    place: { area: 'Palokka', town: 'Jyväskylä', distanceKm: 4.2 },
    seller: { name: 'Liisa Niemi', rating: 4.8, reviews: 18, verified: true },
  },
];

/**
 * The listing with this identifier, or nothing.
 *
 * A screen that asked for an unknown listing must not fall back to another one's price: printing
 * one listing's name over another's figures is worse than printing none (the rule screen 04's
 * destination and `zoneDetailsFor` follow).
 */
/**
 * What only the listing the design tells its story about has: the day its berries were picked and
 * where and when they can be collected (frame 16's card, node `5:23857`).
 *
 * It is a type of its own rather than three optional fields on `MarketListing` because it is not a
 * property every listing has in the app: frames 16–18 are about **one** listing, and the app holds
 * a second card (frame 15's lingonberries) that has no screen, no thread and no order behind it.
 * A screen that asked for the story of a listing the app has none for gets nothing, and draws
 * nothing, rather than another listing's harvest date.
 */
export type ListingDetail = {
  listingId: string;
  /** The day the berries were picked, as an instant the date service formats. */
  harvestedOn: string;
  pickup: {
    /** Where they can be collected (“Laajavuori car park”). */
    place: string;
    /** The window the frame prints (“17:00–19:00”). */
    window: string;
  };
};

/**
 * The listing frames 16–18 are about: the first card frame 15 draws, whose seller the chat is with
 * and whose order the checkout screen prints. One constant, because three screens tell one story;
 * `order.ts` takes its listing from here too.
 */
export const DEMO_LISTING_ID = 'blueberries';

/** The frame's own figures for that listing (nodes `5:23858`–`5:23866`). */
export const DEMO_LISTING_DETAIL: ListingDetail = {
  listingId: DEMO_LISTING_ID,
  // “Harvested 28 August 2026”, and the chat's own stamp over its thread.
  harvestedOn: '2026-08-28T00:00:00.000Z',
  // “Pickup · Laajavuori car park Today 17:00–19:00”.
  pickup: { place: 'Laajavuori car park', window: '17:00–19:00' },
};

/** The listing the whole marketplace story belongs to. */
export const DEMO_LISTING = listingById(DEMO_LISTING_ID)!;

/**
 * The listing with this identifier, or nothing.
 *
 * A screen that asked for an unknown listing must not fall back to another one's price: printing
 * one listing's name over another's figures is worse than printing none (the rule screen 04's
 * destination and `zoneDetailsFor` follow).
 */
export function listingById(id: string): MarketListing | undefined {
  return DEMO_LISTINGS.find((listing) => listing.id === id);
}

/** The story of the listing the frames draw in full, or nothing for one the app has none for. */
export function listingDetailFor(listingId: string): ListingDetail | undefined {
  return DEMO_LISTING_DETAIL.listingId === listingId ? DEMO_LISTING_DETAIL : undefined;
}

/**
 * The listings frame 15's search field leaves, in the order it draws them.
 *
 * The field's own example is “Berries near Jyväskylä” and the app answers the questions its cards
 * can: the listing's name, the place it is in and the seller's name, all of which the card prints.
 * It deliberately does **not** match the species word: that word is the catalogue's, the domain
 * holds only the identifier, and a search that quietly matched an English identifier would answer
 * “bilberry” while a Finnish picker types “mustikka” and finds nothing.
 */
export function filterListings(listings: readonly MarketListing[], query: string): MarketListing[] {
  const needle = query.trim().toLowerCase();

  if (needle === '') return [...listings];

  return listings.filter((listing) =>
    [listing.name, listing.place.area, listing.place.town, listing.seller.name].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
