import {
  alertKey,
  alertNotificationData,
  alertsToNotify,
  parseReasoningAlerts,
  zoneTargetOf,
  type ReasoningAlert,
} from '../reasoning-alert';

const WIRE = {
  ruleId: 'ripe_nearby',
  ruleVersion: '1.0.0',
  zoneId: '082f0e54-03f4-5636-be4a-3f39d243a696',
  zoneIri: 'https://picky.example/zone/082f0e54-03f4-5636-be4a-3f39d243a696',
  zoneNumber: 'Ukonvuori 4',
  place: null,
  species: 'bilberry',
  speciesIri: 'https://picky.example/onto#Bilberry',
  nameEn: 'bilberry',
  nameFi: 'mustikka',
  score: 82,
  confidence: 'medium',
  suitability: 0.706,
  ripeness: 'ripe',
  ecologyVerified: false,
  sentence: 'Ripe bilberry in zone Ukonvuori 4 — yield score 82, medium confidence.',
};

function alert(overrides: Partial<ReasoningAlert> = {}): ReasoningAlert {
  return {
    ruleId: 'ripe_nearby',
    zoneId: 'z1',
    zoneName: 'Zone 1',
    species: 'bilberry',
    score: 80,
    confidence: 'medium',
    ripeness: 'ripe',
    sentence: 'Ripe bilberry in zone Zone 1 — yield score 80, medium confidence.',
    ...overrides,
  };
}

const NOW = new Date('2026-08-15T09:00:00.000Z');

describe('parseReasoningAlerts', () => {
  it('reads the reasoning service’s alerts, best score first', () => {
    const parsed = parseReasoningAlerts([{ ...WIRE, zoneId: 'low', score: 32 }, WIRE]);

    expect(parsed?.map((a) => a.zoneId)).toEqual([WIRE.zoneId, 'low']);
    expect(parsed?.[0]).toEqual({
      ruleId: 'ripe_nearby',
      zoneId: WIRE.zoneId,
      zoneName: 'Ukonvuori 4',
      species: 'bilberry',
      score: 82,
      confidence: 'medium',
      ripeness: 'ripe',
      sentence: WIRE.sentence,
    });
  });

  it('drops an alert it cannot read, including one without a sentence', () => {
    const parsed = parseReasoningAlerts([
      WIRE,
      { ...WIRE, species: 'strawberry' },
      { ...WIRE, sentence: '' },
      { ...WIRE, sentence: undefined },
      'nonsense',
    ]);

    expect(parsed).toHaveLength(1);
  });

  it('refuses a body that is not a list', () => {
    expect(parseReasoningAlerts(null)).toBeNull();
    expect(parseReasoningAlerts({ alerts: [] })).toBeNull();
  });
});

describe('alertsToNotify', () => {
  it('keeps only confident alerts scoring at least 70, at most two, best first', () => {
    const picked = alertsToNotify({
      alerts: [
        alert({ zoneId: 'a', score: 75 }),
        alert({ zoneId: 'b', score: 69 }),
        alert({ zoneId: 'c', score: 95, confidence: 'low' }),
        alert({ zoneId: 'd', score: 90 }),
        alert({ zoneId: 'e', score: 70 }),
      ],
      notified: {},
      now: NOW,
    });

    expect(picked.map((a) => a.zoneId)).toEqual(['d', 'a']);
  });

  it('does not repeat a zone and berry within three days', () => {
    const recent = alert({ zoneId: 'a', score: 90 });
    const old = alert({ zoneId: 'b', score: 85 });

    const picked = alertsToNotify({
      alerts: [recent, old],
      notified: {
        [alertKey(recent)]: '2026-08-13T10:00:00.000Z',
        [alertKey(old)]: '2026-08-11T09:00:00.000Z',
      },
      now: NOW,
    });

    expect(picked.map((a) => a.zoneId)).toEqual(['b']);
  });

  it('counts what was already sent today against the daily two', () => {
    const picked = alertsToNotify({
      alerts: [alert({ zoneId: 'a' }), alert({ zoneId: 'b' })],
      notified: { 'x:bilberry': '2026-08-15T06:30:00.000Z' },
      now: NOW,
    });

    expect(picked).toHaveLength(1);
  });
});

describe('the notification payload', () => {
  it('carries the zone and berry as strings, the way FCM delivers them', () => {
    expect(alertNotificationData(alert({ score: 82 }))).toEqual({
      ruleId: 'ripe_nearby',
      species: 'bilberry',
      zoneId: 'z1',
      score: '82',
      confidence: 'medium',
    });
  });

  it('reads the zone to open back from a tapped notification', () => {
    expect(zoneTargetOf({ zoneId: 'z1', species: 'lingonberry' })).toEqual({
      zoneId: 'z1',
      species: 'lingonberry',
    });
  });

  it('opens the pilot berry when the payload names one the app does not know', () => {
    expect(zoneTargetOf({ zoneId: 'z1', species: 'strawberry' })).toEqual({
      zoneId: 'z1',
      species: 'bilberry',
    });
  });

  it('opens nothing for a payload without a zone', () => {
    expect(zoneTargetOf(undefined)).toBeNull();
    expect(zoneTargetOf({ species: 'bilberry' })).toBeNull();
    expect(zoneTargetOf({ zoneId: '' })).toBeNull();
    expect(zoneTargetOf({ zoneId: '../../etc' })).toBeNull();
  });
});
