import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { MarketService } from './market.service';

const BUYER = '00000000-0000-4000-8000-000000000001';
const SELLER = '00000000-0000-4000-8000-000000000002';
const LISTING = '00000000-0000-4000-8000-000000000003';

function serviceWithListing(listing: Record<string, unknown>) {
  const clientQuery = jest
    .fn()
    .mockImplementation((sql: string) =>
      sql.includes('FOR UPDATE')
        ? Promise.resolve({ rows: [listing], rowCount: 1 })
        : Promise.resolve({ rows: [], rowCount: 0 }),
    );
  const client = { query: clientQuery, release: jest.fn() };
  const database = {
    pool: { connect: jest.fn().mockResolvedValue(client), query: jest.fn() },
  } as unknown as DbService;
  return { market: new MarketService(database), client };
}

const order = { listing_id: LISTING, kilograms: 2, pickup_time: '18:30' };

describe('MarketService orders', () => {
  it('refuses an order on the buyer’s own listing', async () => {
    const { market, client } = serviceWithListing({
      seller_id: BUYER,
      price_cents: 800,
      available_kg: '20',
      status: 'active',
    });

    await expect(market.createOrder(BUYER, order)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });

  it('refuses more kilograms than the listing has left', async () => {
    const { market } = serviceWithListing({
      seller_id: SELLER,
      price_cents: 800,
      available_kg: '1.5',
      status: 'active',
    });

    await expect(market.createOrder(BUYER, order)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

describe('MarketService threads', () => {
  it('asks the seller which buyer a thread belongs to', async () => {
    const database = {
      pool: {
        query: jest.fn().mockResolvedValue({
          rows: [
            { id: LISTING, seller_id: SELLER, harvested_on: '2026-08-28' },
          ],
        }),
      },
    } as unknown as DbService;

    await expect(
      new MarketService(database).thread(SELLER, LISTING, undefined),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
