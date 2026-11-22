import { filterListings, parseListing, parseListings } from '../listing';
import { API_LISTING } from '../test-fixtures';

describe('parseListing', () => {
  it('reads the API’s listing into the app’s shape', () => {
    expect(parseListing(API_LISTING)).toEqual({
      id: 'l1',
      name: 'Fresh bilberries',
      description: null,
      species: 'bilberry',
      pricePerKgCents: 800,
      availableKg: 20,
      place: { area: 'Laajavuori', town: 'Jyväskylä', distanceKm: 0.8 },
      seller: { id: 's1', name: 'Matti L.', rating: null, reviews: 0, verified: true },
      harvestedOn: '2026-08-28',
      pickup: { place: 'Laajavuori car park', window: '17:00–19:00' },
      status: 'active',
    });
  });

  it('leaves the distance out when the request carried no position', () => {
    const listing = parseListing({
      ...API_LISTING,
      place: { ...API_LISTING.place, distance_km: null },
    });
    expect(listing?.place).toEqual({ area: 'Laajavuori', town: 'Jyväskylä' });
  });

  it('refuses a listing it cannot draw truthfully', () => {
    expect(parseListing({ ...API_LISTING, species: 'strawberry' })).toBeNull();
    expect(parseListing({ ...API_LISTING, price_cents: 8.5 })).toBeNull();
    expect(parseListing({ ...API_LISTING, seller: null })).toBeNull();
  });

  it('drops unreadable listings from a page rather than the page', () => {
    expect(parseListings({ listings: [API_LISTING, { id: 'x' }] })).toHaveLength(1);
    expect(parseListings({})).toBeNull();
  });
});

describe('filterListings', () => {
  const listing = parseListing(API_LISTING)!;

  it('matches name, place and seller, ignoring case', () => {
    expect(filterListings([listing], 'LAAJA')).toEqual([listing]);
    expect(filterListings([listing], 'matti')).toEqual([listing]);
    expect(filterListings([listing], 'cloud')).toEqual([]);
    expect(filterListings([listing], '  ')).toEqual([listing]);
  });
});
