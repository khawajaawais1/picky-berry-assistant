import {
  parseScoreHistory,
  parseZoneDetail,
  parseZoneExplanation,
  scoreRange,
} from '../zone-insight';

/**
 * What the team API says about one zone beyond its map score (ADR-065, the plan's phase 3):
 * `GET /zones/{id}`, `/explanation` and `/history`, read at the boundary. Each is external input
 * (SECURITY.md §4), so anything the app cannot read is dropped, and a document it cannot read at
 * all is `null`.
 */
const SCORE = {
  species: 'bilberry',
  score: 53,
  confidence: 'medium',
  ripeness: 'past',
  updated_at: '2026-08-03T04:02:00.000Z',
};

const DETAIL = {
  id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  h3: '8811250e25fffff',
  name: 'Laajavuori 1',
  forest_type: 'forest_broadleaf',
  area_km2: 0.74,
  centroid: { lat: 62.25, lng: 25.69 },
  scores: [
    SCORE,
    { ...SCORE, species: 'lingonberry', score: 70, ripeness: 'ripe' },
    { ...SCORE, species: 'blueberry', score: 10 },
  ],
  reports_7d: [
    { species: 'bilberry', count: 4, avg_rating: 3.5 },
    { species: 'lingonberry', count: 2, avg_rating: null },
  ],
};

describe('parseZoneDetail', () => {
  it('reads every species the zone is scored for, in the app’s vocabulary only', () => {
    const detail = parseZoneDetail(DETAIL);

    expect(detail?.scores).toEqual({
      bilberry: { score: 53, confidence: 'medium', ripeness: 'past' },
      lingonberry: { score: 70, confidence: 'medium', ripeness: 'ripe' },
    });
  });

  it('reads the week’s report counts, with an average only where the server gives one', () => {
    expect(parseZoneDetail(DETAIL)?.reports).toEqual({
      bilberry: { count: 4, averageRating: 3.5 },
      lingonberry: { count: 2, averageRating: null },
    });
  });

  it('drops a score or a report it cannot read rather than the whole zone', () => {
    const detail = parseZoneDetail({
      ...DETAIL,
      scores: [SCORE, { ...SCORE, species: 'lingonberry', score: 140 }],
      reports_7d: [{ species: 'bilberry', count: -1, avg_rating: null }],
    });

    expect(Object.keys(detail?.scores ?? {})).toEqual(['bilberry']);
    expect(detail?.reports).toEqual({});
  });

  it('reads a document that is not a zone as nothing', () => {
    expect(parseZoneDetail(null)).toBeNull();
    expect(parseZoneDetail({ ...DETAIL, id: '' })).toBeNull();
    expect(parseZoneDetail({ ...DETAIL, scores: {} })).toBeNull();
  });
});

describe('parseZoneExplanation', () => {
  it('reads the server’s localized reasons, in order', () => {
    expect(
      parseZoneExplanation({
        zone_id: DETAIL.id,
        species: 'bilberry',
        lang: 'en',
        reasons: [
          { code: 'gdd_high', text: 'Warm summer so far.' },
          { code: 'bad', text: '  ' },
          { code: 'rain', text: 'Enough rain in the last month.' },
        ],
        inputs: {},
        model_version: 'v1',
        computed_at: '2026-08-03T04:02:00.000Z',
      }),
    ).toEqual(['Warm summer so far.', 'Enough rain in the last month.']);
  });

  it('reads a document with no reasons list as nothing', () => {
    expect(parseZoneExplanation({ reasons: 'warm' })).toBeNull();
  });
});

describe('parseScoreHistory', () => {
  it('reads each day’s score, and drops a day it cannot read', () => {
    expect(
      parseScoreHistory({
        zone_id: DETAIL.id,
        species: 'bilberry',
        days: 30,
        points: [
          { date: '2026-08-01', score: 40, confidence: 'low' },
          { date: 'yesterday', score: 41, confidence: 'low' },
          { date: '2026-08-02', score: 55, confidence: 'medium' },
        ],
      }),
    ).toEqual({
      days: 30,
      points: [
        { date: '2026-08-01', score: 40 },
        { date: '2026-08-02', score: 55 },
      ],
    });
  });

  it('reads a document with no points as nothing', () => {
    expect(parseScoreHistory({ days: 30 })).toBeNull();
  });
});

describe('scoreRange', () => {
  it('answers the lowest and highest score over the history', () => {
    expect(
      scoreRange([
        { date: '2026-08-01', score: 40 },
        { date: '2026-08-02', score: 62 },
        { date: '2026-08-03', score: 55 },
      ]),
    ).toEqual({ low: 40, high: 62 });
  });

  it('answers nothing for an empty history, rather than a range of zero', () => {
    expect(scoreRange([])).toBeNull();
  });
});
