-- Up Migration

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  nickname text,
  role text NOT NULL DEFAULT 'picker' CHECK (role IN ('picker', 'admin', 'buyer')),
  privacy_level text NOT NULL DEFAULT 'private' CHECK (privacy_level IN ('private', 'shared', 'public')),
  background_location boolean NOT NULL DEFAULT false,
  alert_radius_km int NOT NULL DEFAULT 10 CHECK (alert_radius_km BETWEEN 1 AND 100),
  species_interest text[] NOT NULL DEFAULT '{}',
  lang text NOT NULL DEFAULT 'fi' CHECK (lang IN ('fi', 'en')),
  email_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX users_email_uq ON users (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE refresh_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by uuid,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_ix ON refresh_tokens (user_id) WHERE revoked_at IS NULL;

CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('terms', 'privacy_policy', 'background_location')),
  version text,
  granted boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consents_user_ix ON consents (user_id, kind, created_at DESC);

CREATE TABLE devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android')),
  app_version text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE email_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('verify_email')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

ALTER TABLE reports ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE reports ADD CONSTRAINT reports_user_fk FOREIGN KEY (user_id) REFERENCES users(id);
ALTER TABLE user_trust ADD CONSTRAINT user_trust_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tokens ENABLE ROW LEVEL SECURITY;

-- Down Migration
ALTER TABLE user_trust DROP CONSTRAINT user_trust_user_fk;
ALTER TABLE reports DROP CONSTRAINT reports_user_fk;
ALTER TABLE reports ALTER COLUMN user_id SET NOT NULL;
DROP TABLE email_tokens, devices, consents, refresh_tokens, users;
