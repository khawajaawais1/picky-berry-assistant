/// <reference types="node" />
// Node's file APIs, for reading the app's own configuration. `tsconfig.json` restricts the
// automatic type set to `jest`, so this file asks for the other one it needs by name.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The app's own promise about position, checked where it would be broken: in `app.json`, which is
 * what the native projects are generated from (AGENTS.md §3).
 *
 * The owner's answer of 2026-10-12 is **foreground only**: the app asks to read the picker's
 * position while a screen is open, and asks for nothing else. Android's background location and
 * iOS's “Always” are separate permissions with their own store declarations and their own
 * justification, and neither is decided; a background permission that slipped into the config
 * would be a promise the app cannot keep and a heavier permission than the consent screen
 * describes. The guard is a test because a permission is a one-word edit away from existing.
 *
 * What it does **not** decide: the copy's own wording, which is the app's (`locationWhenInUsePermission`
 * below), and whether the app should ever ask for more. Those are the owner's, recorded in
 * PROJECT.md's open questions.
 */
const ROOT = join(__dirname, '..', '..', '..');

type PluginEntry = string | [string, Record<string, unknown>];

function appConfig(): { plugins: readonly PluginEntry[] } {
  const parsed = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as {
    expo?: { plugins?: readonly PluginEntry[] };
  };

  return { plugins: parsed.expo?.plugins ?? [] };
}

function locationPlugin(): Record<string, unknown> {
  const entry = appConfig().plugins.find((plugin) =>
    typeof plugin === 'string' ? plugin === 'expo-location' : plugin[0] === 'expo-location',
  );

  if (entry === undefined || typeof entry === 'string') {
    throw new Error(
      'app.json does not configure the expo-location plugin: the permission strings the platform shows would come from nowhere (ADR-045)',
    );
  }

  return entry[1];
}

describe('the app’s location permissions', () => {
  it('asks for the picker’s position while a screen is open, in the app’s own words', () => {
    const whenInUse = locationPlugin().locationWhenInUsePermission;

    expect(typeof whenInUse).toBe('string');
    expect((whenInUse as string).length).toBeGreaterThan(20);
  });

  it('asks for no background location, in the config or on either platform', () => {
    const plugin = locationPlugin();

    // The plugin's background switches: on iOS this adds `NSLocationAlwaysAndWhenInUseUsageDescription`
    // and the location background mode, on Android `ACCESS_BACKGROUND_LOCATION` and the foreground
    // service (verified in expo-location's own plugin, SDK 57).
    for (const key of [
      'isAndroidBackgroundLocationEnabled',
      'isAndroidForegroundServiceEnabled',
      'isIosBackgroundLocationEnabled',
      'locationAlwaysAndWhenInUsePermission',
      'locationAlwaysPermission',
    ]) {
      expect(plugin[key]).toBeUndefined();
    }
  });
});
