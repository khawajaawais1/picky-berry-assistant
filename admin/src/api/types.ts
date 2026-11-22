export type Confidence = 'high' | 'medium' | 'low';
export type Ripeness = 'unripe' | 'ripening' | 'ripe' | 'past' | 'off_season';
export type UserRole = 'picker' | 'buyer' | 'admin';
export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface Species {
  code: string;
  name_fi: string;
  name_en: string;
  latin: string | null;
  colour: string;
  season_start_doy: number | null;
  season_end_doy: number | null;
}

export interface AuditEntry {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: Record<string, unknown>;
  request_id: string | null;
  created_at: string | null;
}

export interface Overview {
  generated_at: string;
  zones: {
    total: number;
    scored: number;
    score_rows: number;
    coverage_pct: number;
    latest_score_at: string | null;
    stale_scores: number;
  };
  users: {
    total: number;
    pickers: number;
    admins: number;
    buyers: number;
    new_last_7d: number;
  };
  reports: { total: number; last_24h: number; last_7d: number };
  visits: {
    total: number;
    accepted: number;
    rejected: number;
    last_24h: number;
    last_7d: number;
  };
  jobs: {
    queued: number;
    running: number;
    done: number;
    failed: number;
    done_7d: number;
    failed_7d: number;
    oldest_queued_at: string | null;
    overdue: number;
  };
  species: Species[];
  recent_activity: AuditEntry[];
}

export interface Centroid {
  lat: number;
  lng: number;
}

export interface ZoneSummary {
  id: string;
  h3: string;
  name: string | null;
  forest_type: string | null;
  area_km2: number | null;
  centroid: Centroid | null;
  species_scored: number;
  best_score: number | null;
  latest_computed_at: string | null;
  reports_total: number;
}

export interface ZonesResponse {
  zones: ZoneSummary[];
  page: number;
  page_size: number;
  total: number;
}

export interface ZoneScore {
  species: string;
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  s_reports: number | null;
  s_model: number | null;
  n_eff: number | null;
  band_width: number | null;
  explanation: {
    version?: number;
    inputs?: Record<string, unknown>;
    reasons?: string[];
    model_version?: string;
  };
  computed_at: string | null;
}

export interface ZoneDetail {
  id: string;
  h3: string;
  h3_parent6: string | null;
  name: string | null;
  forest_type: string | null;
  fertility_class: string | null;
  area_km2: number | null;
  source_version: string | null;
  built_at: string | null;
  centroid: Centroid | null;
  scores: ZoneScore[];
  species_fit: { species: string; suitability: number; rules_version: string | null }[];
  reports: {
    id: string;
    species: string;
    rating: number;
    visit_id: string | null;
    user_id: string | null;
    user_email: string | null;
    user_nickname: string | null;
    user_deleted: boolean;
    trust: number;
    created_at: string | null;
  }[];
  visits: {
    id: string;
    status: 'accepted' | 'rejected';
    manual: boolean;
    started_at: string | null;
    ended_at: string | null;
    duration_s: number;
    user_email: string | null;
  }[];
  jobs: {
    id: number;
    type: string;
    status: string;
    attempts: number;
    created_at: string | null;
    finished_at: string | null;
    last_error: string | null;
  }[];
}

export interface Job {
  id: number;
  type: string;
  payload: Record<string, unknown>;
  dedupe_key: string | null;
  status: JobStatus;
  attempts: number;
  run_at: string | null;
  locked_at: string | null;
  finished_at: string | null;
  last_error: string | null;
  created_at: string | null;
}

export interface JobsResponse {
  jobs: Job[];
  page: number;
  page_size: number;
  total: number;
  counts: Record<string, number>;
}

export interface Report {
  id: string;
  zone_id: string;
  zone_name: string | null;
  zone_h3: string;
  species: string;
  rating: number;
  user_id: string | null;
  user_email: string | null;
  user_nickname: string | null;
  user_deleted: boolean;
  trust: number;
  created_at: string | null;
}

export interface ReportsResponse {
  reports: Report[];
  page: number;
  page_size: number;
  total: number;
}

export interface Account {
  id: string;
  email: string;
  nickname: string | null;
  role: UserRole;
  lang: 'fi' | 'en';
  privacy_level: 'private' | 'shared' | 'public';
  email_verified_at: string | null;
  created_at: string | null;
  trust: number;
  reports_total: number;
  visits_total: number;
  last_sign_in: string | null;
}

export interface UsersResponse {
  users: Account[];
  page: number;
  page_size: number;
  total: number;
}

export interface UserSession {
  id: string;
  created_at: string | null;
  expires_at: string | null;
  user_agent: string | null;
}

export interface UserReport {
  id: string;
  zone_id: string;
  zone_name: string | null;
  zone_h3: string;
  species: string;
  rating: number;
  created_at: string | null;
}

export interface UserVisit {
  id: string;
  zone_id: string | null;
  zone_name: string | null;
  zone_h3: string | null;
  status: string;
  manual: boolean;
  started_at: string | null;
  duration_s: number;
}

export interface UserDetail extends Account {
  background_location: boolean;
  alert_radius_km: number;
  species_interest: string[];
  sessions: UserSession[];
  reports: UserReport[];
  visits: UserVisit[];
  audit: AuditEntry[];
}

export interface RevokeSessionsResponse {
  user_id: string;
  revoked_count: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

export interface DailyJobs {
  date: string;
  done: number;
  failed: number;
}

export interface SpeciesStat {
  species: string;
  name_en: string;
  name_fi: string;
  colour: string;
  zones_supported: number;
  zones_scored: number;
  avg_score: number | null;
  high_confidence: number;
  high_confidence_pct: number;
  reports_7d: number;
}

export interface DistributionBucket {
  min: number;
  max: number;
  count: number;
}

export interface AnalyticsResponse {
  days: number;
  reports_daily: DailyCount[];
  visits_daily: DailyCount[];
  signups_daily: DailyCount[];
  jobs_daily: DailyJobs[];
  job_status: Record<JobStatus, number>;
  species_stats: SpeciesStat[];
  score_distribution: { species: string; buckets: DistributionBucket[] }[];
  top_zones: {
    id: string;
    name: string | null;
    h3: string;
    reports_7d: number;
    avg_rating: number | null;
  }[];
}

export interface AuditResponse {
  entries: AuditEntry[];
  page: number;
  page_size: number;
  total: number;
}

export type HealthStatus = 'ok' | 'warn' | 'fail';

export interface OperationsBreakdown {
  key: string;
  label: string;
  status: HealthStatus;
  value: string;
  detail?: string;
}

export interface OperationsCheck {
  id: string;
  label: string;
  status: HealthStatus;
  value: string;
  threshold: string;
  detail: string;
  owner: string;
  runbook: string;
  href?: string;
  checked_at: string;
  breakdown?: OperationsBreakdown[];
}

export interface OperationsUnavailable {
  id: string;
  label: string;
  reason: string;
}

export interface OperationsHealth {
  generated_at: string;
  status: HealthStatus;
  checks: OperationsCheck[];
  unavailable: OperationsUnavailable[];
}

export interface HistoryResponse {
  zone_id: string;
  species: string;
  days: number;
  points: { date: string; score: number; confidence: Confidence }[];
}

export interface ExplanationResponse {
  zone_id: string;
  species: string;
  lang: string;
  reasons: { code: string; text: string }[];
  inputs: Record<string, unknown>;
  model_version: string;
  computed_at: string;
}

export interface EnqueueResult {
  job_id: number;
  status: 'queued';
  deduplicated: boolean;
  source_job_id?: number;
}
