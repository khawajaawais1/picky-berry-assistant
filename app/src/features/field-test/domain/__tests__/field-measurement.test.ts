import type { PositionFix } from '@/services/location';

import {
  formatFieldDuration,
  formatFieldTestSummary,
  haversineMeters,
  recordFieldFix,
  startFieldMeasurement,
  summariseBattery,
  summariseFieldMeasurement,
} from '../field-measurement';

const START = 1_700_000_000_000;

function fix(at: number, latitude = 62.24, longitude = 25.76, accuracyMeters = 12): PositionFix {
  return { accuracyMeters, at, latitude, longitude };
}

describe('the field-measurement accumulator', () => {
  it('counts fixes and keeps the gaps between them, with no coordinate history', () => {
    let measurement = startFieldMeasurement(START);

    measurement = recordFieldFix(measurement, fix(START + 10_000));
    measurement = recordFieldFix(measurement, fix(START + 70_000));
    measurement = recordFieldFix(measurement, fix(START + 130_000));

    expect(measurement.fixCount).toBe(3);
    expect(measurement.intervalsMs).toEqual([60_000, 60_000]);
    expect(measurement.firstFixAt).toBe(START + 10_000);
    expect(measurement.lastFixAt).toBe(START + 130_000);
    expect(measurement.accuracyMeters).toEqual([12, 12, 12]);
    // Only the newest position is held, not the sequence that produced it.
    expect(measurement.lastPosition).toEqual({ latitude: 62.24, longitude: 25.76 });
  });

  it('ignores a cached fix, a repeated timestamp and an out-of-order fix', () => {
    let measurement = startFieldMeasurement(START);
    const first = recordFieldFix(measurement, fix(START + 10_000));
    measurement = first;

    expect(recordFieldFix(measurement, fix(START - 1))).toBe(measurement);
    expect(recordFieldFix(measurement, fix(START + 10_000))).toBe(measurement);
    expect(recordFieldFix(measurement, fix(START + 20_000))).not.toBe(measurement);
  });

  it('adds the distance between consecutive positions, not a trail', () => {
    let measurement = startFieldMeasurement(START);
    measurement = recordFieldFix(measurement, fix(START + 1_000, 62.24, 25.76));
    measurement = recordFieldFix(measurement, fix(START + 61_000, 62.241, 25.76));

    expect(measurement.movedMeters).toBeCloseTo(111.2, 0);
    expect(measurement.lastPosition).toEqual({ latitude: 62.241, longitude: 25.76 });
  });

  it('summarises the cadence the budget is being judged on', () => {
    let measurement = startFieldMeasurement(START);
    measurement = recordFieldFix(measurement, fix(START + 10_000, 62.24, 25.76, 8));
    measurement = recordFieldFix(measurement, fix(START + 70_000, 62.2405, 25.76, 10));
    measurement = recordFieldFix(measurement, fix(START + 130_000, 62.241, 25.76, 12));

    const summary = summariseFieldMeasurement(measurement, START + 300_000);

    expect(summary).toMatchObject({
      elapsedMs: 300_000,
      firstFixDelayMs: 10_000,
      fixCount: 3,
      fixesPerHour: 90,
      maxIntervalMs: 60_000,
      medianAccuracyMeters: 10,
      medianIntervalMs: 60_000,
      minIntervalMs: 60_000,
      observedMs: 120_000,
    });
    expect(summary.movedMeters).toBeCloseTo(111.2, 0);
  });

  it('leaves one middle gap when there are three, and averages two when there are four', () => {
    let measurement = startFieldMeasurement(START);

    for (const at of [10_000, 30_000, 60_000, 100_000]) {
      measurement = recordFieldFix(measurement, fix(START + at));
    }

    // Timestamps: 10 s, 30 s, 60 s, 100 s after start → gaps 20, 30, 40; median 30.
    expect(summariseFieldMeasurement(measurement, START + 120_000).medianIntervalMs).toBe(30_000);

    measurement = recordFieldFix(measurement, fix(START + 160_000));
    // Five fixes → four gaps: 20, 30, 40, 60; median (30 + 40) / 2 = 35.
    expect(summariseFieldMeasurement(measurement, START + 180_000).medianIntervalMs).toBe(35_000);
  });
});

describe('the battery summary', () => {
  it('turns levels into points and points per hour', () => {
    expect(summariseBattery(0.8, 0.74, 30 * 60_000, null)).toEqual({
      deltaPoints: 6,
      endPercent: 74,
      issue: null,
      pointsPerHour: 12,
      startPercent: 80,
    });
  });

  it('refuses to present a charging or Low Power run as the watch’s cost', () => {
    const summary = summariseBattery(0.8, 0.74, 30 * 60_000, 'the phone was plugged in');

    expect(summary.deltaPoints).toBe(6);
    expect(summary.pointsPerHour).toBeNull();
    expect(summary.issue).toBe('the phone was plugged in');
  });

  it('does not invent a reading when the platform returns an unknown level', () => {
    expect(summariseBattery(-1, 0.74, 30 * 60_000, null)).toMatchObject({
      deltaPoints: null,
      endPercent: 74,
      pointsPerHour: null,
      startPercent: null,
    });
  });
});

describe('the shareable summary', () => {
  it('contains aggregates only — never a latitude or longitude', () => {
    let measurement = startFieldMeasurement(START);
    measurement = recordFieldFix(measurement, fix(START + 10_000, 62.240123, 25.760456, 9));
    measurement = recordFieldFix(measurement, fix(START + 70_000, 62.241, 25.761, 11));

    const text = formatFieldTestSummary({
      battery: summariseBattery(0.8, 0.74, 120_000, null),
      device: 'iOS 18.6',
      endedAt: START + 120_000,
      measurement,
      mode: 'watch',
    });

    expect(text).toContain('Fixes: 2');
    expect(text).toContain('Gap: median 60 s');
    expect(text).toContain('Stated accuracy: median 10 m (2 readings)');
    expect(text).toContain('Battery: 80% → 74%');
    expect(text).not.toContain('62.24');
    expect(text).not.toContain('25.76');
    expect(text).toMatch(/No coordinate is in this summary/);
  });

  it('names a control run and does not print watch-only readings', () => {
    const text = formatFieldTestSummary({
      battery: summariseBattery(0.8, 0.78, 30 * 60_000, null),
      device: 'Android API 35',
      endedAt: START + 30 * 60_000,
      measurement: startFieldMeasurement(START),
      mode: 'control',
    });

    expect(text).toContain('control run (watch off)');
    expect(text).toContain('Fixes: 0 (control run');
    expect(text).not.toContain('Gap:');
    expect(text).not.toContain('Stated accuracy:');
  });

  it('states why a battery delta is not comparable', () => {
    const text = formatFieldTestSummary({
      battery: summariseBattery(0.8, 0.74, 30 * 60_000, 'the phone was plugged in'),
      device: 'Android API 35',
      endedAt: START + 30 * 60_000,
      measurement: startFieldMeasurement(START),
      mode: 'watch',
    });

    expect(text).toContain('not a valid cost (the phone was plugged in)');
  });
});

describe('the display formatters', () => {
  it('prints a duration in minutes and seconds, or hours when it needs them', () => {
    expect(formatFieldDuration(0)).toBe('0m 00s');
    expect(formatFieldDuration(30 * 60_000 + 2_000)).toBe('30m 02s');
    expect(formatFieldDuration(65 * 60_000 + 3_000)).toBe('1h 05m 03s');
  });

  it('measures a known latitude step in metres', () => {
    expect(
      haversineMeters(
        { latitude: 62.24, longitude: 25.76 },
        { latitude: 62.241, longitude: 25.76 },
      ),
    ).toBeCloseTo(111.2, 0);
  });
});
