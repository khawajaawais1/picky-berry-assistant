export type SpeciesCode =
  | 'bilberry'
  | 'lingonberry'
  | 'cloudberry'
  | 'crowberry';

export type Confidence = 'low' | 'medium' | 'high';
export type Ripeness = 'unripe' | 'ripening' | 'ripe' | 'past';

export interface MlHealth {
  status: 'ok';
  models: {
    detector: string;
    zone_grid: string;
    yield: string;
    score_rules: string;
  };
}

export interface MlExplanation {
  model_version: string;
  rules_version: string;
  reasons: string[];
  inputs: {
    site_class: 'good' | 'moderate' | 'poor';
    site_potential: number;
    window_start: string;
    window_end: string;
    year_index: number;
    forest_share: number;
    reports_used: number;
    evidence_weight: number;
  };
}

export interface MlSpeciesScore {
  score: number;
  confidence: Confidence;
  ripeness: Ripeness;
  explanation: MlExplanation;
}

export interface MlZonePoint {
  id: string;
  h3: string | null;
  lat: number;
  lon: number;
}

export interface MlZoneScoreResult extends MlZonePoint {
  coverage: 'grid' | 'none';
  cells: number;
  forest_share: number | null;
  scores: Record<SpeciesCode, MlSpeciesScore> | null;
}

export interface MlZoneScoresResponse {
  date: string;
  model_version: string;
  rules_version: string;
  results: MlZoneScoreResult[];
}

export interface MlReport {
  created_at: string;
  rating: number | null;
  photo_count: number | null;
  reporter_trust: number;
  visit_backed: boolean;
}

export interface MlScoreUpdateRequest {
  map_score: number;
  map_confidence: Confidence;
  map_explanation: MlExplanation;
  reports: MlReport[];
  now: string;
}

export interface MlScoreUpdateResponse {
  score: number;
  confidence: Confidence;
  s_model: number;
  s_feedback: number | null;
  evidence_weight: number;
  reports_used: number;
  explanation: MlExplanation;
}

export interface MlTrustUpdateRequest {
  trust: number;
  rating: number | null;
  photo_count: number | null;
  species: SpeciesCode;
  zone_consensus: number | null;
}

export interface MlTrustUpdateResponse {
  trust: number;
  rules_version: string;
}

export interface MlDetectionResponse {
  counts: Record<SpeciesCode, number>;
  total: number;
  image_size: { width: number; height: number };
  model_version: string;
}
