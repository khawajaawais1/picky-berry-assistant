import { parseListing, type MarketListing } from './listing';

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

/** An order placed against a listing, as `/market/orders` serves it. Money is whole cents. */
export type MarketOrder = {
  id: string;
  role: 'buyer' | 'seller';
  listing: MarketListing;
  kilograms: number;
  pricePerKgCents: number;
  subtotalCents: number;
  deliveryCents: number;
  totalCents: number;
  pickupTime: string;
  status: OrderStatus;
  createdAt: string;
};

const STATUSES: readonly OrderStatus[] = ['pending', 'confirmed', 'completed', 'cancelled'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const cents = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;

export function parseOrder(body: unknown): MarketOrder | null {
  if (!isRecord(body)) return null;
  const listing = parseListing(body.listing);
  const price = cents(body.price_cents);
  const subtotal = cents(body.subtotal_cents);
  const delivery = cents(body.delivery_cents);
  const total = cents(body.total_cents);
  if (
    !listing ||
    typeof body.id !== 'string' ||
    typeof body.kilograms !== 'number' ||
    price === null ||
    subtotal === null ||
    delivery === null ||
    total === null ||
    typeof body.pickup_time !== 'string' ||
    !(STATUSES as readonly unknown[]).includes(body.status) ||
    typeof body.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: body.id,
    role: body.role === 'seller' ? 'seller' : 'buyer',
    listing,
    kilograms: body.kilograms,
    pricePerKgCents: price,
    subtotalCents: subtotal,
    deliveryCents: delivery,
    totalCents: total,
    pickupTime: body.pickup_time,
    status: body.status as OrderStatus,
    createdAt: body.created_at,
  };
}

/** The kilograms a buyer typed ("2", "1,5"), or `null` when it is not a quantity they can order. */
export function parseOrderKilograms(text: string, availableKg: number): number | null {
  const match = /^\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*$/.exec(text);
  if (!match) return null;

  const value = Number(match[1]!.replace(',', '.'));
  return value >= 0.1 && value <= availableKg ? value : null;
}

/** The first time in a pickup window ("17:00–19:00" → "17:00"), or `null`. */
export function pickupStart(window: string): string | null {
  return /([01]\d|2[0-3]):[0-5]\d/.exec(window)?.[0] ?? null;
}
