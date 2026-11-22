import AsyncStorage from '@react-native-async-storage/async-storage';

import { NOTIFY_COOLDOWN_DAYS, type NotifiedAlerts } from '../domain/reasoning-alert';

/**
 * When this phone last showed an alert for each zone and berry (`alertKey`), so the same alert is
 * not shown again within the cooldown and no more than two are shown a day. Kept on this device
 * only and sent nowhere; an entry past the cooldown is dropped on the next write, and signing out
 * or uninstalling removes nothing anyone else holds.
 */
export const NOTIFIED_ALERTS_STORAGE_KEY = 'picky.notified-alerts.v1';

const DAY_MS = 24 * 60 * 60 * 1000;

function isNotifiedAlerts(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((at) => typeof at === 'string' && !Number.isNaN(Date.parse(at)))
  );
}

export async function readNotifiedAlerts(): Promise<NotifiedAlerts> {
  const raw = await AsyncStorage.getItem(NOTIFIED_ALERTS_STORAGE_KEY);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return isNotifiedAlerts(parsed) ? parsed : {};
  } catch {
    // A value the app cannot read is the same as having shown nothing.
    return {};
  }
}

export async function recordNotifiedAlerts(keys: readonly string[], now: Date): Promise<void> {
  const previous = await readNotifiedAlerts();
  const horizon = now.getTime() - NOTIFY_COOLDOWN_DAYS * DAY_MS;
  const next: Record<string, string> = {};
  for (const [key, at] of Object.entries(previous)) {
    if (Date.parse(at) >= horizon) next[key] = at;
  }
  for (const key of keys) next[key] = now.toISOString();

  await AsyncStorage.setItem(NOTIFIED_ALERTS_STORAGE_KEY, JSON.stringify(next));
}
