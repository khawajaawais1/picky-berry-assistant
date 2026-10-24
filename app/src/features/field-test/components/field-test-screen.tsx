import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';

import { AppButton, AppText } from '@/components/atoms';
import { Callout, Card, TextAction } from '@/components/molecules';
import { Screen } from '@/components/templates';
import { useDevicePosition } from '@/hooks/use-device-position';
import { useNow } from '@/hooks/use-now';
import type { PositionFix, PositionSource } from '@/services/location';
import { shareText } from '@/services/share-text';

import {
  formatFieldDuration,
  formatFieldTestSummary,
  recordFieldFix,
  startFieldMeasurement,
  summariseBattery,
  summariseFieldMeasurement,
  type FieldMeasurement,
  type FieldRunMode,
} from '../domain/field-measurement';
import {
  batteryIssue,
  readDeviceBattery,
  type DeviceBatteryReading,
} from '../services/device-battery';

export type FieldTestScreenProps = {
  /** The position seam; a test supplies its own, the app uses the real one. */
  source?: PositionSource;
  /** The battery adapter; a test supplies a reading without a native module. */
  readBattery?: () => Promise<DeviceBatteryReading>;
  /** Opens Privacy settings, where the visit-tracking consent is switched on. */
  onOpenPrivacy?: () => void;
};

type Run = {
  mode: FieldRunMode;
  startedAt: number;
  measurement: FieldMeasurement;
  startBattery: DeviceBatteryReading | null;
  currentBattery: DeviceBatteryReading | null;
  issue: string | null;
};

type FinishedRun = Run & {
  endedAt: number;
  endBattery: DeviceBatteryReading | null;
};

type ShareState = 'idle' | 'shared' | 'dismissed' | 'failed';

/**
 * A development-only instrument for ADR-063's foreground watch budget.
 *
 * It is **not a product screen** and it is not translated: like the review-only prototypes, it is
 * hard-coded English because its audience is the tester, and the route redirects away in a
 * production build. What it measures is the real seam, not a simulation: a watch run mounts
 * `useDevicePosition`, so the consent gate, the platform permission and `POSITION_WATCH_BUDGET` all
 * behave exactly as they will when a screen calls them.
 *
 * Two modes are the point. A **watch run** records fixes and battery. A **control run** holds the
 * screen awake and records battery alone, so the difference between the two is the watch's cost
 * rather than the display's. The screen holds the display awake for the length of either run,
 * because a phone that sleeps stops the foreground watch and would measure the wrong thing.
 *
 * Nothing about a fix is written, shown or shared. The state keeps the newest position in memory
 * only so the distance to the next fix can be measured — the same in-memory rule ADR-045 sets for
 * every fix — and the summary is counts, gaps, stated accuracy, a distance total and battery levels.
 */
export function FieldTestScreen({
  onOpenPrivacy,
  readBattery = readDeviceBattery,
  source,
}: FieldTestScreenProps) {
  const now = useNow();
  const [run, setRun] = useState<Run | null>(null);
  const [finished, setFinished] = useState<FinishedRun | null>(null);
  const [starting, setStarting] = useState<FieldRunMode | null>(null);
  const [stopping, setStopping] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareState, setShareState] = useState<ShareState>('idle');

  // The reader is held in a ref so an inline test adapter (or any caller passing a new function)
  // cannot restart the battery poll on every render — the same reason the position hook holds its
  // subscriber in a ref.
  const batteryReader = useRef(readBattery);
  useEffect(() => {
    batteryReader.current = readBattery;
  }, [readBattery]);

  const device =
    Platform.OS === 'android'
      ? `Android API ${String(Platform.Version)}`
      : `${Platform.OS === 'ios' ? 'iOS' : Platform.OS} ${String(Platform.Version)}`;

  // A run is only valid while the phone is discharging and not in Low Power Mode. The start checks
  // this before mounting a watch; the poll below catches a charger or Low Power Mode appearing
  // halfway through, because either makes the battery half of the run unusable.
  const runStartedAt = run?.startedAt ?? null;
  useEffect(() => {
    if (runStartedAt === null) return;

    let active = true;

    const poll = async () => {
      try {
        const reading = await batteryReader.current();
        if (!active) return;

        setRun((current) => {
          if (current === null || current.startedAt !== runStartedAt) return current;

          return {
            ...current,
            currentBattery: reading,
            issue: mergeIssues(current.issue, batteryIssue(reading)),
          };
        });
      } catch {
        // The platform refusing a battery read is not a reason to stop the watch; the summary
        // says the battery half is unavailable instead of inventing a level.
      }
    };

    const interval = setInterval(() => void poll(), 60_000);
    void poll();

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [runStartedAt]);

  const start = async (mode: FieldRunMode) => {
    if (run !== null || starting !== null) return;

    setStarting(mode);
    setNotice(null);
    setFinished(null);
    setShareState('idle');

    let battery: DeviceBatteryReading | null = null;
    try {
      battery = await batteryReader.current();
    } catch {
      setNotice('Battery level is unavailable. The fix-rate half will still run.');
    }

    const issue = battery === null ? null : batteryIssue(battery);

    if (battery !== null && battery.power === 'external') {
      setNotice('The phone is plugged in. Unplug it and start again.');
      setStarting(null);
      return;
    }

    if (battery?.lowPowerMode === true) {
      setNotice('Low Power Mode is on. Turn it off and start again.');
      setStarting(null);
      return;
    }

    const startedAt = Date.now();
    setRun({
      currentBattery: battery,
      issue,
      measurement: startFieldMeasurement(startedAt),
      mode,
      startBattery: battery,
      startedAt,
    });
    setStarting(null);
  };

  const stop = async () => {
    if (run === null || stopping) return;

    setStopping(true);
    const stopped = run;
    const endedAt = Date.now();
    // Unmounting the watch now stops the platform subscription; the battery read after this is
    // still the run's end reading, and waiting on it must not keep the watch alive. The finished
    // run is drawn immediately with an unavailable end reading, then updated when the read answers.
    setFinished({ ...stopped, endBattery: null, endedAt });
    setRun(null);

    let endBattery: DeviceBatteryReading | null = null;
    try {
      endBattery = await batteryReader.current();
    } catch {
      // Reported through the summary as an unavailable battery reading.
    }

    setFinished((current) =>
      current === null || current.startedAt !== stopped.startedAt
        ? current
        : {
            ...current,
            endBattery,
            issue: mergeIssues(
              current.issue,
              endBattery === null ? null : batteryIssue(endBattery),
            ),
          },
    );
    setStopping(false);
  };

  const active = run ?? finished;
  const elapsedMs =
    run !== null
      ? Math.max(0, now.getTime() - run.startedAt)
      : finished === null
        ? 0
        : Math.max(0, finished.endedAt - finished.startedAt);
  const summary =
    active === null
      ? null
      : summariseFieldMeasurement(active.measurement, finished?.endedAt ?? now.getTime());
  const battery =
    active === null
      ? null
      : summariseBattery(
          active.startBattery?.level ?? null,
          (finished?.endBattery ?? active.currentBattery)?.level ?? null,
          elapsedMs,
          active.issue,
        );
  const summaryText =
    finished === null
      ? null
      : formatFieldTestSummary({
          battery: summariseBattery(
            finished.startBattery?.level ?? null,
            finished.endBattery?.level ?? null,
            Math.max(0, finished.endedAt - finished.startedAt),
            finished.issue,
          ),
          device,
          endedAt: finished.endedAt,
          measurement: finished.measurement,
          mode: finished.mode,
        });

  const share = async () => {
    if (summaryText === null) return;

    setShareState('idle');
    try {
      setShareState(await shareText(summaryText, 'Location watch field test'));
    } catch {
      setShareState('failed');
    }
  };

  return (
    <Screen
      eyebrow="DEVELOPMENT · FIELD INSTRUMENT"
      title="Location watch field test"
      testID="field-test-screen"
    >
      <View className="w-full gap-section">
        <AppText tone="muted" variant="bodySmall">
          Internal only. A production build redirects away from this route. The numbers here are
          read from the real position seam and the device&apos;s own battery, not a simulation.
        </AppText>

        <Callout title="How to run it" tone="accent">
          Run the same 30-minute route once as a watch run and once as a control, on each phone.
          Keep this screen in front (it holds the display awake), start unplugged, turn Low Power
          Mode off, and keep brightness and route the same. The control measures the display&apos;s
          cost; the difference between the two is the watch&apos;s.
        </Callout>

        <Callout title="Aggregates only" tone="success">
          The harness holds the newest fix in memory to measure the gap to the next one. It writes,
          shows and sends no coordinate. The summary contains counts, gaps, stated accuracy, a
          distance total and battery levels only.
        </Callout>

        {run === null ? (
          <View className="w-full gap-sm">
            <AppButton
              accessibilityLabel="Start watch measurement"
              busy={starting === 'watch'}
              disabled={starting !== null}
              label={starting === 'watch' ? 'Starting watch…' : 'Start watch run'}
              onPress={() => void start('watch')}
              testID="field-test-start-watch"
            />
            <AppButton
              accessibilityLabel="Start control measurement"
              busy={starting === 'control'}
              disabled={starting !== null}
              label={starting === 'control' ? 'Starting control…' : 'Start control run'}
              onPress={() => void start('control')}
              testID="field-test-start-control"
              variant="secondary"
            />
          </View>
        ) : (
          <View className="w-full gap-sm">
            <AppText tone="accent" variant="cardTitle">
              {run.mode === 'watch' ? 'Watch run in progress' : 'Control run in progress'}
            </AppText>
            <AppButton
              accessibilityLabel="Stop measurement"
              busy={stopping}
              label={stopping ? 'Stopping…' : 'Stop run'}
              onPress={() => void stop()}
              testID="field-test-stop"
            />
            <ActiveRun
              mode={run.mode}
              onFix={(next) =>
                setRun((current) => {
                  if (current === null) return current;

                  const measurement = recordFieldFix(current.measurement, next);
                  return measurement === current.measurement
                    ? current
                    : { ...current, measurement };
                })
              }
              onOpenPrivacy={onOpenPrivacy}
              source={source}
            />
          </View>
        )}

        {notice === null ? null : (
          <AppText testID="field-test-notice" tone="danger" variant="bodySmall">
            {notice}
          </AppText>
        )}

        {active === null || summary === null || battery === null ? null : (
          <Card title="Reading" testID="field-test-reading">
            <Reading label="Mode" value={active.mode === 'watch' ? 'Watch' : 'Control'} />
            <Reading label="Elapsed" value={formatFieldDuration(elapsedMs)} />
            <Reading
              label="Fixes"
              testID="field-test-fixes"
              value={active.mode === 'control' ? '—' : String(summary.fixCount)}
            />
            <Reading
              label="Median gap"
              testID="field-test-median-gap"
              value={
                active.mode === 'control'
                  ? '—'
                  : summary.medianIntervalMs === null
                    ? '—'
                    : formatFieldDuration(summary.medianIntervalMs)
              }
            />
            <Reading
              label="Stated accuracy (median)"
              testID="field-test-accuracy"
              value={
                active.mode === 'control' || summary.medianAccuracyMeters === null
                  ? '—'
                  : `${Math.round(summary.medianAccuracyMeters)} m`
              }
            />
            <Reading
              label="Distance between fixes"
              value={
                active.mode === 'control' || summary.movedMeters === 0
                  ? '—'
                  : summary.movedMeters >= 1000
                    ? `${(summary.movedMeters / 1000).toFixed(2)} km`
                    : `${Math.round(summary.movedMeters)} m`
              }
            />
            <Reading
              label="Battery"
              testID="field-test-battery"
              value={
                battery.startPercent === null || battery.endPercent === null
                  ? 'Unavailable'
                  : battery.issue === null
                    ? `${formatPercent(battery.startPercent)} → ${formatPercent(battery.endPercent)}`
                    : `${formatPercent(battery.startPercent)} → ${formatPercent(battery.endPercent)} · invalid`
              }
            />
            {battery.issue === null ? null : (
              <AppText testID="field-test-battery-issue" tone="danger" variant="caption">
                Battery cost is not valid for this run: {battery.issue}.
              </AppText>
            )}
          </Card>
        )}

        {summaryText === null ? null : (
          <Card title="Summary to record" testID="field-test-summary">
            <AppText selectable testID="field-test-summary-text" variant="bodySmall">
              {summaryText}
            </AppText>
            <TextAction
              label="Share summary"
              onPress={() => void share()}
              testID="field-test-share"
            />
            <TextAction
              label="Clear reading"
              onPress={() => {
                setFinished(null);
                setShareState('idle');
              }}
              testID="field-test-clear"
            />
            {shareState === 'idle' ? null : (
              <AppText testID="field-test-share-state" tone="muted" variant="caption">
                {shareState === 'shared'
                  ? 'The summary was handed to the share sheet.'
                  : shareState === 'dismissed'
                    ? 'The share sheet was closed without choosing.'
                    : 'The summary could not be handed over.'}
              </AppText>
            )}
          </Card>
        )}
      </View>
    </Screen>
  );
}

/**
 * Keeps the display awake for either mode, and mounts the real watch only for a watch run.
 * `useDevicePosition` is what asks the platform for permission and what reads the consent record,
 * so a watch run exercises exactly the gate a product screen would.
 */
function ActiveRun({
  mode,
  onFix,
  onOpenPrivacy,
  source,
}: {
  mode: FieldRunMode;
  onFix: (fix: PositionFix) => void;
  onOpenPrivacy?: () => void;
  source?: PositionSource;
}) {
  useKeepAwake('location-watch-field-test');

  return mode === 'watch' ? (
    <WatchStatus onFix={onFix} onOpenPrivacy={onOpenPrivacy} source={source} />
  ) : null;
}

function WatchStatus({
  onFix,
  onOpenPrivacy,
  source,
}: {
  onFix: (fix: PositionFix) => void;
  onOpenPrivacy?: () => void;
  source?: PositionSource;
}) {
  const { status } = useDevicePosition({ onFix, source });

  return (
    <View className="w-full gap-tight">
      <AppText testID="field-test-watch-status" tone="muted" variant="caption">
        Watch: {status}
      </AppText>
      {status === 'off' && onOpenPrivacy ? (
        <TextAction
          label="Open privacy settings"
          onPress={onOpenPrivacy}
          testID="field-test-open-privacy"
        />
      ) : null}
      {status === 'off' ? (
        <AppText tone="danger" variant="caption">
          Visit tracking consent is off, so the watch cannot start.
        </AppText>
      ) : null}
      {status === 'denied' ? (
        <AppText tone="danger" variant="caption">
          The platform refused location permission; check this app&apos;s location access in system
          settings.
        </AppText>
      ) : null}
    </View>
  );
}

function Reading({ label, testID, value }: { label: string; testID?: string; value: string }) {
  return (
    <View className="w-full flex-row items-start justify-between gap-gap">
      <AppText tone="muted" variant="caption">
        {label}
      </AppText>
      <AppText style={{ flexShrink: 1, textAlign: 'right' }} testID={testID} variant="bodySmall">
        {value}
      </AppText>
    </View>
  );
}

function formatPercent(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function mergeIssues(existing: string | null, next: string | null): string | null {
  if (next === null) return existing;
  if (existing === null) return next;

  return existing.includes(next) ? existing : `${existing}; ${next}`;
}
