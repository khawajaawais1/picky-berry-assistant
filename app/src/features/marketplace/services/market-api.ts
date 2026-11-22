import { apiClient, type ApiClient, type ApiFailure } from '@/services/api';

import { parseThread, type ChatThread } from '../domain/chat';
import { parseListing, parseListings, type MarketListing } from '../domain/listing';
import { parseOrder, type MarketOrder } from '../domain/order';

export class MarketError extends Error {
  constructor(readonly failure: ApiFailure) {
    super(`the marketplace could not answer (${failure.kind})`);
    this.name = 'MarketError';
  }
}

export type MarketApi = {
  listings(position?: { latitude: number; longitude: number }): Promise<MarketListing[]>;
  listing(id: string): Promise<MarketListing>;
  thread(listingId: string): Promise<ChatThread>;
  send(listingId: string, body: string): Promise<ChatThread>;
  placeOrder(listingId: string, kilograms: number, pickupTime: string): Promise<MarketOrder>;
  order(id: string): Promise<MarketOrder>;
};

export function createMarketApi({ client }: { client: ApiClient }): MarketApi {
  async function call<T>(
    method: 'GET' | 'POST',
    path: string,
    parse: (body: unknown) => T | null,
    body?: unknown,
    query?: Record<string, number | undefined>,
  ): Promise<T> {
    const result = await client.request({ method, path, parse, body, query });
    if (!result.ok) throw new MarketError(result.error);
    return result.data;
  }
  const id = (value: string) => encodeURIComponent(value);

  return {
    listings: (position) =>
      call('GET', '/market/listings', parseListings, undefined, {
        lat: position?.latitude,
        lng: position?.longitude,
      }),
    listing: (listingId) => call('GET', `/market/listings/${id(listingId)}`, parseListing),
    thread: (listingId) => call('GET', `/market/listings/${id(listingId)}/messages`, parseThread),
    send: (listingId, body) =>
      call('POST', `/market/listings/${id(listingId)}/messages`, parseThread, { body }),
    placeOrder: (listingId, kilograms, pickupTime) =>
      call('POST', '/market/orders', parseOrder, {
        listing_id: listingId,
        kilograms,
        pickup_time: pickupTime,
      }),
    order: (orderId) => call('GET', `/market/orders/${id(orderId)}`, parseOrder),
  };
}

export const appMarketApi: MarketApi = createMarketApi({ client: apiClient });
