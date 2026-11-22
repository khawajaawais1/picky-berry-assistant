import { isSpecies, type Species } from '@/features/discover';

/**
 * A marketplace listing as `GET /market/listings` serves it (feature E1): what is sold, at what
 * price per kilogram, how much is left, where to collect it and who is selling it.
 */
export type MarketSeller = {
  id: string;
  name: string;
  /** Average buyer rating, or `null` when no buyer has rated the seller yet. */
  rating: number | null;
  reviews: number;
  verified: boolean;
};

export type MarketPlace = {
  area: string;
  town: string;
  /** Kilometres from the phone, when the request carried a position. */
  distanceKm?: number;
};

export type MarketListing = {
  id: string;
  name: string;
  description: string | null;
  species: Species;
  pricePerKgCents: number;
  availableKg: number;
  place: MarketPlace;
  seller: MarketSeller;
  harvestedOn: string;
  pickup: { place: string; window: string };
  status: 'active' | 'sold' | 'withdrawn';
};

type Json = Record<string, unknown>;

function isRecord(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str = (value: unknown): string | null =>
  typeof value === 'string' && value !== '' ? value : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** One listing from the API, or `null` for anything the app cannot draw truthfully. */
export function parseListing(value: unknown): MarketListing | null {
  if (!isRecord(value) || !isRecord(value.place) || !isRecord(value.seller)) return null;
  if (!isRecord(value.pickup)) return null;
  const { place, seller, pickup } = value;

  const id = str(value.id);
  const name = str(value.title);
  const price = num(value.price_cents);
  const available = num(value.available_kg);
  const area = str(place.area);
  const town = str(place.town);
  const sellerId = str(seller.id);
  const harvestedOn = str(value.harvested_on);
  const pickupPlace = str(pickup.place);
  const pickupWindow = str(pickup.window);
  if (
    !id ||
    !name ||
    !isSpecies(value.species) ||
    price === null ||
    !Number.isInteger(price) ||
    available === null ||
    !area ||
    !town ||
    !sellerId ||
    !harvestedOn ||
    !pickupPlace ||
    !pickupWindow
  ) {
    return null;
  }

  const distanceKm = num(place.distance_km);
  const status = value.status === 'sold' || value.status === 'withdrawn' ? value.status : 'active';

  return {
    id,
    name,
    description: str(value.description),
    species: value.species,
    pricePerKgCents: price,
    availableKg: available,
    place: { area, town, ...(distanceKm === null ? {} : { distanceKm }) },
    seller: {
      id: sellerId,
      name: str(seller.name) ?? '',
      rating: num(seller.rating),
      reviews: num(seller.reviews) ?? 0,
      verified: seller.verified === true,
    },
    harvestedOn,
    pickup: { place: pickupPlace, window: pickupWindow },
    status,
  };
}

export function parseListings(body: unknown): MarketListing[] | null {
  if (!isRecord(body) || !Array.isArray(body.listings)) return null;
  return body.listings.map(parseListing).filter((l): l is MarketListing => l !== null);
}

/**
 * The listings whose name, place or seller contains the search, ignoring case; an empty search
 * keeps them all.
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
