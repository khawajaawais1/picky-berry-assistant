import type { PositionFix } from '@/services/location';

/**
 * The aggregate a field test keeps while the real watch runs (ADR-063).
 *
 * This is an **instrument**, not a feature the picker uses: it exists to answer whether the
 * foreground budget — `Accuracy.High`, a 50 m distance filter and a 60 s Android ceiling — produces
 * enough fixes at acceptable battery cost. It is pure, so the arithmetic can be checked without a
 * device, and it keeps **no coordinate history**: only the latest position is held, to measure the
 * distance to the next fix, and the summary contains counts rather than places.
 */

export type FieldRunMode = 'watch' | 'control';

export type FieldMeasurement = {
  startedAt: number;
  fixCount: number;
  firstFixAt: number | null;
  lastFixAt: number | null;
  /** Only the newest position, for the distance to the next fix. Never summarised. */
  lastPosition: { latitude: number; longitude: number } | null;
  intervalsMs: readonly number[];
  /** The platform's own stated accuracy radius for each fix, when it stated one. */
  accuracyMeters: readonly number[];
  movedMeters: number;
};

export type FieldSummary = {
  elapsedMs: number;
  fixCount: number;
  firstFixDelayMs: number | null;
  /** The time from the first fix to the last, or `null` with fewer than two. */
  observedMs: number | null;
  fixesPerHour: number | null;
  medianIntervalMs: number | null;
  minIntervalMs: number | null;
  maxIntervalMs: number | null;
  medianAccuracyMeters: number | null;
  movedMeters: number;
};

export type FieldBatterySummary = {
  /** Percent, one decimal, or `null` when the platform did not answer. */
  startPercent: number | null;
  endPercent: number | null;
  deltaPoints: number | null;
  pointsPerHour: number | null;
  /** Why the delta cannot be read as the watch's cost, or `null` when it can. */
  issue: string | null;
};

export type FieldTestSummaryInput = {
  mode: FieldRunMode;
  device: string;
  measurement: FieldMeasurement;
  endedAt: number;
  battery: FieldBatterySummary;
};

const EARTH_RADIUS_METERS = 6_371_000;

export function startFieldMeasurement(startedAt: number): FieldMeasurement {
  if (!Number.isFinite(startedAt)) {
    throw new RangeError(`a measurement starts at an epoch instant, got ${startedAt}`);
  }

  return {
    accuracyMeters: [],
    firstFixAt: null,
    fixCount: 0,
    intervalsMs: [],
    lastFixAt: null,
    lastPosition: null,
    movedMeters: 0,
    startedAt,
  };
}

/**
 * Folds one fix into the aggregate.
 *
 * A fix older than the run, or no newer than the last one already folded, is ignored: a cached fix
 * is not evidence about the watch this run is measuring, and a repeated timestamp would make an
 * interval of zero. The identity is returned unchanged in that case so the screen does not render
 * a reading that did not change.
 */
export function recordFieldFix(measurement: FieldMeasurement, fix: PositionFix): FieldMeasurement {
  if (
    !Number.isFinite(fix.at) ||
    !Number.isFinite(fix.latitude) ||
    !Number.isFinite(fix.longitude) ||
    fix.at < measurement.startedAt ||
    (measurement.lastFixAt !== null && fix.at <= measurement.lastFixAt)
  ) {
    return measurement;
  }

  const accuracy =
    fix.accuracyMeters !== null && Number.isFinite(fix.accuracyMeters) && fix.accuracyMeters >= 0
      ? fix.accuracyMeters
      : null;

  if (measurement.lastFixAt === null || measurement.lastPosition === null) {
    return {
      ...measurement,
      accuracyMeters: accuracy === null ? measurement.accuracyMeters : [accuracy],
      firstFixAt: fix.at,
      fixCount: 1,
      lastFixAt: fix.at,
      lastPosition: { latitude: fix.latitude, longitude: fix.longitude },
    };
  }

  return {
    ...measurement,
    accuracyMeters:
      accuracy === null ? measurement.accuracyMeters : [...measurement.accuracyMeters, accuracy],
    fixCount: measurement.fixCount + 1,
    intervalsMs: [...measurement.intervalsMs, fix.at - measurement.lastFixAt],
    lastFixAt: fix.at,
    lastPosition: { latitude: fix.latitude, longitude: fix.longitude },
    movedMeters:
      measurement.movedMeters +
      haversineMeters(measurement.lastPosition, {
        latitude: fix.latitude,
        longitude: fix.longitude,
      }),
  };
}

/** The great-circle distance between two positions, in metres. */
export function haversineMeters(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = radians(to.latitude - from.latitude);
  const deltaLongitude = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(deltaLongitude / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

export function summariseFieldMeasurement(
  measurement: FieldMeasurement,
  endedAt: number,
): FieldSummary {
  const elapsedMs = Math.max(0, endedAt - measurement.startedAt);
  const observedMs =
    measurement.firstFixAt === null || measurement.lastFixAt === null
      ? null
      : Math.max(0, measurement.lastFixAt - measurement.firstFixAt);
  const intervals = measurement.intervalsMs;

  return {
    elapsedMs,
    fixCount: measurement.fixCount,
    firstFixDelayMs:
      measurement.firstFixAt === null
        ? null
        : Math.max(0, measurement.firstFixAt - measurement.startedAt),
    fixesPerHour:
      observedMs === null || observedMs === 0
        ? null
        : (measurement.fixCount * 3_600_000) / observedMs,
    maxIntervalMs: intervals.length === 0 ? null : Math.max(...intervals),
    medianAccuracyMeters: median(measurement.accuracyMeters),
    medianIntervalMs: median(intervals),
    minIntervalMs: intervals.length === 0 ? null : Math.min(...intervals),
    movedMeters: measurement.movedMeters,
    observedMs,
  };
}

/**
 * The battery half, kept separate from the fix half: a run can be valid for cadence and invalid for
 * battery (a charger, or Low Power Mode), and the summary has to say which.
 *
 * `levels` are the platform's `0..1` readings; percent is printed to one decimal because a phone
 * reports whole percentages and a 30-minute run can move by only a few points.
 */
export function summariseBattery(
  startLevel: number | null,
  endLevel: number | null,
  elapsedMs: number,
  issue: string | null,
): FieldBatterySummary {
  const startPercent = toPercent(startLevel);
  const endPercent = toPercent(endLevel);
  const deltaPoints =
    startPercent === null || endPercent === null
      ? null
      : Math.round((startPercent - endPercent) * 10) / 10;

  return {
    deltaPoints,
    endPercent,
    issue,
    pointsPerHour:
      deltaPoints === null || issue !== null || elapsedMs <= 0
        ? null
        : Math.round((deltaPoints / (elapsedMs / 3_600_000)) * 10) / 10,
    startPercent,
  };
}

/** One text block the tester can hand over through the platform's share sheet. */
export function formatFieldTestSummary({
  battery,
  device,
  endedAt,
  measurement,
  mode,
}: FieldTestSummaryInput): string {
  const summary = summariseFieldMeasurement(measurement, endedAt);
  const lines = [
    `Location watch field test — ${mode === 'watch' ? 'watch run' : 'control run (watch off)'}`,
    `Device: ${device}`,
    `Window: ${new Date(measurement.startedAt).toISOString()} → ${new Date(endedAt).toISOString()}`,
    `Duration: ${formatFieldDuration(summary.elapsedMs)}`,
    mode === 'control'
      ? 'Fixes: 0 (control run — the watch was not started)'
      : `Fixes: ${summary.fixCount}${summary.fixesPerHour === null ? '' : ` · ${formatNumber(summary.fixesPerHour)}/hour (first→last)`}`,
    ...(mode === 'watch'
      ? [
          `First fix: ${summary.firstFixDelayMs === null ? 'none' : `${formatSeconds(summary.firstFixDelayMs)} after start`}`,
          `Gap: median ${summary.medianIntervalMs === null ? '—' : formatSeconds(summary.medianIntervalMs)} · min ${summary.minIntervalMs === null ? '—' : formatSeconds(summary.minIntervalMs)} · max ${summary.maxIntervalMs === null ? '—' : formatSeconds(summary.maxIntervalMs)}`,
          `Stated accuracy: median ${summary.medianAccuracyMeters === null ? '—' : `${formatNumber(summary.medianAccuracyMeters)} m`} (${measurement.accuracyMeters.length} readings)`,
          `Distance between fixes: ${formatMeters(summary.movedMeters)}`,
        ]
      : []),
    formatBatteryLine(battery),
    'Budget under test: Accuracy.High · 50 m distance · 60 s time ceiling on Android.',
    'No coordinate is in this summary, and no fix was written, shown or sent.',
  ];

  return lines.join('\n');
}

export function formatFieldDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const two = (value: number) => String(value).padStart(2, '0');

  return hours > 0 ? `${hours}h ${two(minutes)}m ${two(seconds)}s` : `${minutes}m ${two(seconds)}s`;
}

function formatBatteryLine(battery: FieldBatterySummary): string {
  if (battery.startPercent === null || battery.endPercent === null) {
    return `Battery: unavailable${battery.issue === null ? '' : ` — ${battery.issue}`}`;
  }

  const levels = `${formatNumber(battery.startPercent)}% → ${formatNumber(battery.endPercent)}%`;

  if (battery.issue !== null) {
    return `Battery: ${levels} — not a valid cost (${battery.issue})`;
  }

  return `Battery: ${levels} · ${formatNumber(battery.deltaPoints ?? 0)} points · ${formatNumber(battery.pointsPerHour ?? 0)} points/hour`;
}

function toPercent(level: number | null): number | null {
  if (level === null || !Number.isFinite(level) || level < 0) return null;

  return Math.round(level * 1000) / 10;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatSeconds(ms: number): string {
  return `${formatNumber(Math.round(ms / 100) / 10)} s`;
}

function formatMeters(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}
