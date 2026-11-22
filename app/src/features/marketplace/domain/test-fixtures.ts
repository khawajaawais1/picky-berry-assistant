/** A listing as `GET /market/listings/:id` serves it, for the marketplace tests. */
export const API_LISTING = {
  id: 'l1',
  title: 'Fresh bilberries',
  description: null,
  species: 'bilberry',
  price_cents: 800,
  available_kg: 20,
  place: { area: 'Laajavuori', town: 'Jyväskylä', distance_km: 0.8 },
  seller: { id: 's1', name: 'Matti L.', rating: null, reviews: 0, verified: true },
  harvested_on: '2026-08-28',
  pickup: { place: 'Laajavuori car park', window: '17:00–19:00' },
  status: 'active',
  created_at: '2026-08-28T08:00:00.000Z',
};

export const API_ORDER = {
  id: 'o1',
  role: 'buyer',
  listing: API_LISTING,
  kilograms: 2,
  price_cents: 800,
  subtotal_cents: 1600,
  delivery_cents: 0,
  total_cents: 1600,
  pickup_time: '18:30',
  status: 'pending',
  created_at: '2026-08-28T12:00:00.000Z',
};

export const API_THREAD = {
  listing_id: 'l1',
  buyer_id: 'b1',
  seller_name: 'Matti L.',
  messages: [
    {
      id: 'm1',
      author: 'buyer',
      mine: true,
      body: 'Still available?',
      read: true,
      sent_at: '2026-08-28T14:02:00.000Z',
    },
    {
      id: 'm2',
      author: 'seller',
      mine: false,
      body: 'Yes!',
      read: false,
      sent_at: '2026-08-28T14:04:00.000Z',
    },
  ],
};
