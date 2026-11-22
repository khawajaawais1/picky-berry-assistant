import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  CreateListingDto,
  CreateOrderDto,
  ListingsQueryDto,
} from './dto/market.dto';

interface ListingRow {
  id: string;
  seller_id: string;
  seller_name: string | null;
  seller_verified: boolean;
  seller_rating: string | null;
  seller_reviews: number;
  species: string;
  title: string;
  description: string | null;
  price_cents: number;
  available_kg: string;
  area: string;
  town: string;
  distance_m: number | null;
  harvested_on: Date | string;
  pickup_place: string;
  pickup_window: string;
  status: string;
  created_at: Date;
}

interface OrderRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  kilograms: string;
  price_cents: number;
  delivery_cents: number;
  pickup_time: string;
  status: string;
  created_at: Date;
}

const LISTING_SELECT = `
  SELECT l.id, l.seller_id, l.species, l.title, l.description, l.price_cents,
         l.available_kg, l.area, l.town, l.harvested_on, l.pickup_place,
         l.pickup_window, l.status, l.created_at,
         coalesce(u.nickname, 'Picker') AS seller_name,
         (u.email_verified_at IS NOT NULL) AS seller_verified,
         (SELECT round(avg(o.buyer_rating)::numeric, 1) FROM market_orders o
           WHERE o.seller_id = l.seller_id AND o.buyer_rating IS NOT NULL) AS seller_rating,
         (SELECT count(*)::int FROM market_orders o
           WHERE o.seller_id = l.seller_id AND o.buyer_rating IS NOT NULL) AS seller_reviews`;

function isoDate(value: Date | string): string {
  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10);
}

@Injectable()
export class MarketService {
  constructor(private readonly database: DbService) {}

  async listings(query: ListingsQueryDto): Promise<Record<string, unknown>> {
    const located = query.lat !== undefined && query.lng !== undefined;
    const params: unknown[] = [query.limit];
    const where = ["l.status = 'active'", 'l.available_kg > 0'];
    if (query.species) {
      params.push(query.species);
      where.push(`l.species = $${params.length}`);
    }
    if (query.q) {
      params.push(`%${query.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
      const p = `$${params.length}`;
      where.push(
        `(l.title ILIKE ${p} OR l.area ILIKE ${p} OR l.town ILIKE ${p} OR u.nickname ILIKE ${p})`,
      );
    }
    let distance = 'NULL::double precision';
    if (located) {
      params.push(query.lng, query.lat);
      distance = `ST_Distance(l.location::geography, ST_SetSRID(ST_MakePoint($${params.length - 1}, $${params.length}), 4326)::geography)`;
    }
    const rows = await this.database.pool.query<ListingRow>(
      `${LISTING_SELECT}, ${distance} AS distance_m
       FROM market_listings l JOIN users u ON u.id = l.seller_id
       WHERE ${where.join(' AND ')} AND u.deleted_at IS NULL
       ORDER BY l.created_at DESC
       LIMIT $1`,
      params,
    );
    return { listings: rows.rows.map((row) => this.toListing(row)) };
  }

  async listing(id: string): Promise<Record<string, unknown>> {
    return this.toListing(await this.findListing(id));
  }

  async createListing(
    sellerId: string,
    input: CreateListingDto,
  ): Promise<Record<string, unknown>> {
    if ((input.lat === undefined) !== (input.lng === undefined)) {
      throw new UnprocessableEntityException(
        'lat and lng must be provided together.',
      );
    }
    const inserted = await this.database.pool.query<{ id: string }>(
      `INSERT INTO market_listings
         (seller_id, species, title, description, price_cents, available_kg, area, town,
          location, harvested_on, pickup_place, pickup_window)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               CASE WHEN $9::float8 IS NULL THEN NULL
                    ELSE ST_SetSRID(ST_MakePoint($9, $10), 4326) END,
               $11, $12, $13)
       RETURNING id`,
      [
        sellerId,
        input.species,
        input.title,
        input.description ?? null,
        input.price_cents,
        input.available_kg,
        input.area,
        input.town,
        input.lng ?? null,
        input.lat ?? null,
        input.harvested_on.slice(0, 10),
        input.pickup_place,
        input.pickup_window,
      ],
    );
    return this.listing(inserted.rows[0].id);
  }

  /** The buyer–seller thread on a listing, as seen by the caller; marks the other side's messages read. */
  async thread(
    userId: string,
    listingId: string,
    buyerId: string | undefined,
  ): Promise<Record<string, unknown>> {
    const listing = await this.findListing(listingId);
    const buyer = this.threadBuyer(userId, listing, buyerId);
    await this.database.pool.query(
      `UPDATE market_messages SET read_at = now()
       WHERE listing_id = $1 AND buyer_id = $2 AND sender_id <> $3 AND read_at IS NULL`,
      [listingId, buyer, userId],
    );
    const rows = await this.database.pool.query<{
      id: string;
      sender_id: string;
      body: string;
      read_at: Date | null;
      created_at: Date;
    }>(
      `SELECT id, sender_id, body, read_at, created_at FROM market_messages
       WHERE listing_id = $1 AND buyer_id = $2 ORDER BY created_at, id`,
      [listingId, buyer],
    );
    return {
      listing_id: listingId,
      buyer_id: buyer,
      seller_name: listing.seller_name ?? 'Picker',
      messages: rows.rows.map((row) => ({
        id: row.id,
        author: row.sender_id === listing.seller_id ? 'seller' : 'buyer',
        mine: row.sender_id === userId,
        body: row.body,
        read: row.read_at !== null,
        sent_at: new Date(row.created_at).toISOString(),
      })),
    };
  }

  async send(
    userId: string,
    listingId: string,
    body: string,
    buyerId: string | undefined,
  ): Promise<Record<string, unknown>> {
    const listing = await this.findListing(listingId);
    const buyer = this.threadBuyer(userId, listing, buyerId);
    await this.database.pool.query(
      `INSERT INTO market_messages (listing_id, buyer_id, sender_id, body)
       VALUES ($1, $2, $3, $4)`,
      [listingId, buyer, userId, body],
    );
    return this.thread(userId, listingId, buyer);
  }

  async createOrder(
    buyerId: string,
    input: CreateOrderDto,
  ): Promise<Record<string, unknown>> {
    const client = await this.database.pool.connect();
    try {
      await client.query('BEGIN');
      const listing = await client.query<{
        seller_id: string;
        price_cents: number;
        available_kg: string;
        status: string;
      }>(
        `SELECT seller_id, price_cents, available_kg, status
         FROM market_listings WHERE id = $1 FOR UPDATE`,
        [input.listing_id],
      );
      const row = listing.rows[0];
      if (!row) throw this.listingNotFound();
      if (row.seller_id === buyerId) {
        throw new ForbiddenException({
          error: 'OWN_LISTING',
          message: 'You cannot order from your own listing.',
        });
      }
      if (
        row.status !== 'active' ||
        Number(row.available_kg) < input.kilograms
      ) {
        throw new ConflictException({
          error: 'NOT_ENOUGH_STOCK',
          message: 'The listing does not have that many kilograms left.',
        });
      }
      const remaining = Number(row.available_kg) - input.kilograms;
      await client.query(
        `UPDATE market_listings
         SET available_kg = $2::numeric,
             status = CASE WHEN $2::numeric <= 0 THEN 'sold' ELSE status END,
             updated_at = now()
         WHERE id = $1`,
        [input.listing_id, remaining],
      );
      const order = await client.query<OrderRow>(
        `INSERT INTO market_orders
           (listing_id, buyer_id, seller_id, kilograms, price_cents, pickup_time)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          input.listing_id,
          buyerId,
          row.seller_id,
          input.kilograms,
          row.price_cents,
          input.pickup_time,
        ],
      );
      await client.query('COMMIT');
      return this.order(buyerId, order.rows[0].id);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async orders(userId: string): Promise<Record<string, unknown>> {
    const rows = await this.database.pool.query<{ id: string }>(
      `SELECT id FROM market_orders WHERE buyer_id = $1 OR seller_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId],
    );
    return {
      orders: await Promise.all(
        rows.rows.map((row) => this.order(userId, row.id)),
      ),
    };
  }

  async order(
    userId: string,
    orderId: string,
  ): Promise<Record<string, unknown>> {
    const rows = await this.database.pool.query<OrderRow>(
      'SELECT * FROM market_orders WHERE id = $1',
      [orderId],
    );
    const order = rows.rows[0];
    if (!order || (order.buyer_id !== userId && order.seller_id !== userId)) {
      throw new NotFoundException({
        error: 'ORDER_NOT_FOUND',
        message: 'The order does not exist.',
      });
    }
    const kilograms = Number(order.kilograms);
    const subtotal = Math.round(kilograms * Number(order.price_cents));
    return {
      id: order.id,
      role: order.buyer_id === userId ? 'buyer' : 'seller',
      listing: await this.listing(order.listing_id),
      kilograms,
      price_cents: Number(order.price_cents),
      subtotal_cents: subtotal,
      delivery_cents: Number(order.delivery_cents),
      total_cents: subtotal + Number(order.delivery_cents),
      pickup_time: order.pickup_time,
      status: order.status,
      created_at: new Date(order.created_at).toISOString(),
    };
  }

  private threadBuyer(
    userId: string,
    listing: ListingRow,
    buyerId: string | undefined,
  ): string {
    if (listing.seller_id !== userId) return userId;
    if (!buyerId || buyerId === userId) {
      throw new UnprocessableEntityException({
        error: 'BUYER_REQUIRED',
        message: 'The seller names the buyer whose thread this is.',
      });
    }
    return buyerId;
  }

  private async findListing(id: string): Promise<ListingRow> {
    const rows = await this.database.pool.query<ListingRow>(
      `${LISTING_SELECT}, NULL::double precision AS distance_m
       FROM market_listings l JOIN users u ON u.id = l.seller_id
       WHERE l.id = $1 AND l.status <> 'withdrawn'`,
      [id],
    );
    const row = rows.rows[0];
    if (!row) throw this.listingNotFound();
    return row;
  }

  private listingNotFound(): NotFoundException {
    return new NotFoundException({
      error: 'LISTING_NOT_FOUND',
      message: 'The listing does not exist.',
    });
  }

  private toListing(row: ListingRow): Record<string, unknown> {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      species: row.species,
      price_cents: Number(row.price_cents),
      available_kg: Number(row.available_kg),
      place: {
        area: row.area,
        town: row.town,
        distance_km:
          row.distance_m === null
            ? null
            : Math.round(Number(row.distance_m) / 100) / 10,
      },
      seller: {
        id: row.seller_id,
        name: row.seller_name ?? 'Picker',
        rating: row.seller_rating === null ? null : Number(row.seller_rating),
        reviews: Number(row.seller_reviews),
        verified: row.seller_verified,
      },
      harvested_on: isoDate(row.harvested_on),
      pickup: { place: row.pickup_place, window: row.pickup_window },
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }
}
