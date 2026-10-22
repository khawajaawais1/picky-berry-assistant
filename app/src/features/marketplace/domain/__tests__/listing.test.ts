import { DEMO_LISTINGS, filterListings, listingById } from '../listing';

/**
 * Frame 15 (node `5:23780`) draws two listing cards and a search field, and the app can be
 * strictly true about both: the cards are the design's own composition, and the field is a
 * question this app can answer over whatever it is holding. What the search may not do is
 * quietly match on something it cannot see — the species *word* is the catalogue's, not the
 * data's — so what it reads is pinned here.
 */
describe('DEMO_LISTINGS', () => {
  it('holds the frame’s own two listings, in the order the frame draws them', () => {
    expect(DEMO_LISTINGS.map((listing) => listing.name)).toEqual([
      'Fresh blueberries',
      'Wild lingonberries',
    ]);
  });

  it('carries the prices and the sellers the frame prints', () => {
    const [blueberries, lingonberries] = DEMO_LISTINGS;

    // “€8 / kg” and “€6 / kg” on the cards, in cents, so no price is ever a rounded float.
    expect(blueberries.pricePerKgCents).toBe(800);
    expect(lingonberries.pricePerKgCents).toBe(600);

    // “20 kg available · Laajavuori, Jyväskylä” and “8 kg available · Palokka, 4.2 km away”.
    expect(blueberries.availableKg).toBe(20);
    expect(lingonberries.availableKg).toBe(8);

    // The place is three pieces, so the three lines the design builds from it can be built:
    // the card's “Palokka, 4.2 km away”, the detail's “Laajavuori · Jyväskylä” and the chat's
    // “20 kg available · Laajavuori”.
    expect(blueberries.place).toEqual({ area: 'Laajavuori', town: 'Jyväskylä' });
    expect(lingonberries.place).toEqual({
      area: 'Palokka',
      town: 'Jyväskylä',
      distanceKm: 4.2,
    });

    // “Matti Laine · 4.9 · 24 reviews” and “Liisa Niemi · 4.8 · 18 reviews”.
    expect(blueberries.seller).toEqual({
      name: 'Matti Laine',
      rating: 4.9,
      reviews: 24,
      verified: true,
    });
    expect(lingonberries.seller).toEqual({
      name: 'Liisa Niemi',
      rating: 4.8,
      reviews: 18,
      verified: true,
    });
  });

  it('gives every listing a unique identifier', () => {
    const ids = DEMO_LISTINGS.map((listing) => listing.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('listingById', () => {
  it('finds the listing the frame’s detail screen is about', () => {
    expect(listingById('blueberries')?.name).toBe('Fresh blueberries');
  });

  it('returns nothing for a listing the app does not hold', () => {
    // Never another listing's price under an unknown identifier: a card that prints one
    // listing's name over another's figures is worse than a card that prints none.
    expect(listingById('cloudberries')).toBeUndefined();
  });
});

describe('filterListings', () => {
  it('keeps every listing when nothing is typed', () => {
    expect(filterListings(DEMO_LISTINGS, '')).toHaveLength(2);
    expect(filterListings(DEMO_LISTINGS, '   ')).toHaveLength(2);
  });

  it('searches the listing’s own name', () => {
    expect(filterListings(DEMO_LISTINGS, 'lingon').map((listing) => listing.name)).toEqual([
      'Wild lingonberries',
    ]);
  });

  it('searches the seller, because the card prints the seller', () => {
    expect(filterListings(DEMO_LISTINGS, 'matti').map((listing) => listing.id)).toEqual([
      'blueberries',
    ]);
  });

  it('searches where the listing is, because the card prints that too', () => {
    expect(filterListings(DEMO_LISTINGS, 'palokka').map((listing) => listing.id)).toEqual([
      'lingonberries',
    ]);
    // And the town both of them are in, which the card prints for the first: a search for
    // “Jyväskylä” is a search for what is near it.
    expect(filterListings(DEMO_LISTINGS, 'jyväskylä')).toHaveLength(2);
  });

  it('ignores case and surrounding space', () => {
    expect(filterListings(DEMO_LISTINGS, '  FRESH  ').map((listing) => listing.id)).toEqual([
      'blueberries',
    ]);
  });

  it('answers with nothing rather than with everything when a search matches nothing', () => {
    // The screen draws this answer as a sentence, the way frame 06's filter does: a search
    // that finds nothing must never look like a search that did not run.
    expect(filterListings(DEMO_LISTINGS, 'cloudberries')).toEqual([]);
  });
});
