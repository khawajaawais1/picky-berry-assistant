import * as Battery from 'expo-battery';

/**
 * The device's battery, as the field instrument needs it (ADR-063). It lives behind a tiny adapter
 * for the same reason the position seam does: the screen's tests can hand it a reading without a
 * native module, and the platform's enum never reaches the measurement's arithmetic.
 */
export type DeviceBatteryReading = {
  /** The platform's `0..1` level, or `null` when it would not say (`-1`). */
  level: number | null;
  power: 'battery' | 'external' | 'unknown';
  lowPowerMode: boolean;
};

export async function readDeviceBattery(): Promise<DeviceBatteryReading> {
  const state = await Battery.getPowerStateAsync();

  return {
    level: state.batteryLevel >= 0 ? state.batteryLevel : null,
    lowPowerMode: state.lowPowerMode,
    power:
      state.batteryState === Battery.BatteryState.UNPLUGGED
        ? 'battery'
        : state.batteryState === Battery.BatteryState.UNKNOWN
          ? 'unknown'
          : 'external',
  };
}

/**
 * Why a reading cannot be used as the watch's battery cost, or `null` when it can.
 *
 * `NOT_CHARGING` counts as external too: the phone is on power even if the battery protection has
 * paused the charge, so it is not discharging.
 */
export function batteryIssue(reading: DeviceBatteryReading): string | null {
  if (reading.power === 'external') return 'the phone was plugged in';
  if (reading.power === 'unknown') return 'the platform did not report a power source';
  if (reading.lowPowerMode) return 'Low Power Mode was on';

  return null;
}
