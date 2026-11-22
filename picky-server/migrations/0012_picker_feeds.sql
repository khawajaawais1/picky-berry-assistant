-- Up Migration
-- Picker-facing feeds the mobile app reads instead of design samples.
--
-- reports: the post-visit report carries the harvest the picker entered and how long the visit
--   lasted, and the app's own id so an outbox replay cannot store the same report twice.
-- market_*: feature E1 — listings pickers post, the buyer/seller thread on each listing and the
--   orders placed against it. Money is whole cents; quantities are kilograms.

ALTER TABLE reports
  ADD COLUMN client_id uuid,
  ADD COLUMN amount_kg numeric(6, 2) CHECK (amount_kg IS NULL OR (amount_kg >= 0 AND amount_kg <= 500)),
  ADD COLUMN minutes integer CHECK (minutes IS NULL OR (minutes >= 0 AND minutes <= 1440)),
  ADD COLUMN recorded_at timestamptz;
CREATE UNIQUE INDEX reports_client_id_uq ON reports (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX reports_user_ix ON reports (user_id, created_at DESC);

CREATE TABLE market_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species         text NOT NULL REFERENCES species(code),
  title           text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description     text CHECK (description IS NULL OR char_length(description) <= 1000),
  price_cents     integer NOT NULL CHECK (price_cents BETWEEN 1 AND 100000),
  available_kg    numeric(6, 2) NOT NULL CHECK (available_kg >= 0 AND available_kg <= 1000),
  area            text NOT NULL CHECK (char_length(area) BETWEEN 1 AND 80),
  town            text NOT NULL CHECK (char_length(town) BETWEEN 1 AND 80),
  location        geometry(Point, 4326),
  harvested_on    date NOT NULL,
  pickup_place    text NOT NULL CHECK (char_length(pickup_place) BETWEEN 1 AND 120),
  pickup_window   text NOT NULL CHECK (char_length(pickup_window) BETWEEN 1 AND 40),
  status          text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'withdrawn')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX market_listings_active_ix ON market_listings (created_at DESC) WHERE status = 'active';
CREATE INDEX market_listings_seller_ix ON market_listings (seller_id, created_at DESC);

CREATE TABLE market_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  buyer_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kilograms       numeric(6, 2) NOT NULL CHECK (kilograms > 0 AND kilograms <= 1000),
  price_cents     integer NOT NULL CHECK (price_cents > 0),
  delivery_cents  integer NOT NULL DEFAULT 0 CHECK (delivery_cents >= 0),
  pickup_time     text NOT NULL CHECK (char_length(pickup_time) BETWEEN 1 AND 20),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  buyer_rating    smallint CHECK (buyer_rating IS NULL OR buyer_rating BETWEEN 1 AND 5),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (buyer_id <> seller_id)
);
CREATE INDEX market_orders_buyer_ix ON market_orders (buyer_id, created_at DESC);
CREATE INDEX market_orders_seller_ix ON market_orders (seller_id, created_at DESC);

CREATE TABLE market_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      uuid NOT NULL REFERENCES market_listings(id) ON DELETE CASCADE,
  -- The buyer whose conversation with the seller this message belongs to.
  buyer_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body            text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX market_messages_thread_ix ON market_messages (listing_id, buyer_id, created_at);

ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_messages ENABLE ROW LEVEL SECURITY;

-- Down Migration
DROP TABLE market_messages, market_orders, market_listings;
DROP INDEX IF EXISTS reports_user_ix;
DROP INDEX IF EXISTS reports_client_id_uq;
ALTER TABLE reports DROP COLUMN recorded_at, DROP COLUMN minutes, DROP COLUMN amount_kg, DROP COLUMN client_id;
