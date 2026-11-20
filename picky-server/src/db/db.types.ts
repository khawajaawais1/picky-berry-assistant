import type { ColumnType, Generated } from 'kysely';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type Json = ColumnType<
  Record<string, unknown>,
  string | Record<string, unknown>,
  string | Record<string, unknown>
>;

export interface SpeciesTable {
  code: string;
  latin: string | null;
  name_fi: string;
  name_en: string;
  iri: string | null;
  colour: string;
  season_start_doy: number | null;
  season_end_doy: number | null;
}

export interface ZonesTable {
  id: string;
  h3: string;
  h3_parent6: string;
  name: string | null;
  forest_type: string | null;
  area_km2: number;
  centroid: unknown;
  geom: unknown;
}

export interface ZoneScoresCurrentTable {
  zone_id: string;
  species: string;
  score: number;
  confidence: string;
  ripeness: string;
  s_reports: number | null;
  s_model: number | null;
  n_eff: number | null;
  band_width: number | null;
  explanation: Json;
  computed_at: Timestamp;
}

export interface UsersTable {
  id: Generated<string>;
  email: string;
  password_hash: string;
  nickname: string | null;
  role: string;
  privacy_level: string;
  background_location: boolean;
  alert_radius_km: number;
  species_interest: string[];
  lang: string;
  email_verified_at: Timestamp | null;
  created_at: Timestamp;
  deleted_at: Timestamp | null;
}

export interface RefreshTokensTable {
  id: Generated<string>;
  user_id: string;
  token_hash: string;
  expires_at: Timestamp;
  revoked_at: Timestamp | null;
  replaced_by: string | null;
  user_agent: string | null;
  created_at: Timestamp;
}

export interface ConsentsTable {
  id: Generated<string>;
  user_id: string;
  kind: string;
  version: string | null;
  granted: boolean;
  created_at: Timestamp;
}

export interface DevicesTable {
  id: Generated<string>;
  user_id: string;
  fcm_token: string;
  platform: string;
  app_version: string | null;
  last_seen_at: Timestamp;
  created_at: Timestamp;
}

export interface EmailTokensTable {
  id: Generated<string>;
  user_id: string;
  purpose: string;
  token_hash: string;
  expires_at: Timestamp;
  used_at: Timestamp | null;
}

export interface VisitsTable {
  id: string;
  user_id: string | null;
  zone_id: string | null;
  started_at: Timestamp;
  ended_at: Timestamp;
  duration_s: Generated<number>;
  manual: boolean;
  status: string;
  reject_reason: string | null;
  created_at: Timestamp;
}

export interface ReportsTable {
  id: Generated<string>;
  user_id: string | null;
  zone_id: string;
  species: string;
  rating: number;
  visit_id: string | null;
  created_at: Timestamp;
}

export interface JobsTable {
  id: Generated<number>;
  type: string;
  payload: Json;
  dedupe_key: string | null;
  status: string;
  attempts: number;
  run_at: Timestamp;
  locked_at: Timestamp | null;
  finished_at: Timestamp | null;
  last_error: string | null;
  created_at: Timestamp;
}

export interface UserTrustTable {
  user_id: string;
  trust: number;
}

export interface DbSchema {
  species: SpeciesTable;
  zones: ZonesTable;
  zone_scores_current: ZoneScoresCurrentTable;
  users: UsersTable;
  refresh_tokens: RefreshTokensTable;
  consents: ConsentsTable;
  devices: DevicesTable;
  email_tokens: EmailTokensTable;
  visits: VisitsTable;
  reports: ReportsTable;
  jobs: JobsTable;
  user_trust: UserTrustTable;
}

export type JobId = Generated<number>;
