import type { ApiClient, ApiRequest, ApiResult } from '@/services/api';

import { API_LISTING, API_ORDER, API_THREAD } from '../../domain/test-fixtures';
import { createMarketApi, MarketError } from '../market-api';

function clientAnswering(data: unknown) {
  const request = jest.fn(async (req: ApiRequest<unknown>): Promise<ApiResult<unknown>> => {
    const parsed = req.parse(data);
    return parsed === null
      ? { ok: false, error: { kind: 'invalid-response', status: 200 } }
      : { ok: true, status: 200, data: parsed };
  });
  return { api: createMarketApi({ client: { request } as unknown as ApiClient }), request };
}

describe('createMarketApi', () => {
  it('reads listings, with the phone’s position when there is one', async () => {
    const { api, request } = clientAnswering({ listings: [API_LISTING] });

    await expect(api.listings({ latitude: 62.2, longitude: 25.7 })).resolves.toHaveLength(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/market/listings', query: { lat: 62.2, lng: 25.7 } }),
    );
    await api.listings();
    expect(request).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: { lat: undefined, lng: undefined } }),
    );
  });

  it('reads one listing and its thread by id', async () => {
    const listing = clientAnswering(API_LISTING);
    await expect(listing.api.listing('l 1')).resolves.toMatchObject({ id: 'l1' });
    expect(listing.request).toHaveBeenCalledWith(
      expect.objectContaining({ path: '/market/listings/l%201' }),
    );

    const thread = clientAnswering(API_THREAD);
    await expect(thread.api.thread('l1')).resolves.toMatchObject({ sellerName: 'Matti L.' });
  });

  it('sends a message and places an order', async () => {
    const thread = clientAnswering(API_THREAD);
    await thread.api.send('l1', 'Hello');
    expect(thread.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/market/listings/l1/messages',
        body: { body: 'Hello' },
      }),
    );

    const order = clientAnswering(API_ORDER);
    await expect(order.api.placeOrder('l1', 2, '18:30')).resolves.toMatchObject({ id: 'o1' });
    expect(order.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/market/orders',
        body: { listing_id: 'l1', kilograms: 2, pickup_time: '18:30' },
      }),
    );
    await expect(order.api.order('o1')).resolves.toMatchObject({ totalCents: 1600 });
  });

  it('throws a market error the screens can say', async () => {
    const { api } = clientAnswering({ nothing: true });

    await expect(api.listing('l1')).rejects.toThrow(MarketError);
    await expect(api.order('o1')).rejects.toThrow('the marketplace could not answer');
  });
});
