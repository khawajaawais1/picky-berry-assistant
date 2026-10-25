/// <reference types="node" />
// `app.json` is configuration, so this reads it rather than importing it (the same shape as
// `verify-gate.test.ts`): what the build ships is the file, not a TypeScript module.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The client hardening SECURITY.md §12 requires, asserted against the manifest the app is built
 * from rather than trusted to review.
 *
 * **Android auto-backup.** Expo's prebuild sets `android:allowBackup` from this file's
 * `android.allowBackup`, defaulting to `true` (`getAllowBackup` in
 * `@expo/config-plugins/build/android/AllowBackup.js`). The generated manifest therefore does not
 * fall back to the template's `false` — an absent key is not an off switch. With backup on, the
 * OS copies the app's private files, `AsyncStorage` included, into the user's cloud backup: the
 * consent record, the saved plan and the report queue would leave the phone that the app's own
 * copy says holds them, without the picker asking for it. The fix is this manifest setting; the
 * test is what keeps a later config edit from turning it back on silently.
 *
 * **Permissions.** Foreground location is the only capability the app asks the OS for. Android's
 * `ACCESS_BACKGROUND_LOCATION` would let capture continue with the app closed, which ADR-056
 * places out of scope and ADR-047 says the consent copy may not promise. An exact list makes a
 * new permission a reviewed change rather than an accident — if a feature genuinely needs one,
 * update this list and the privacy notice in the same change.
 *
 * **iOS transport.** ATS is on by default; `NSAllowsArbitraryLoads` would turn it off for the
 * whole app. A scoped exception may be justified one day, so only the blanket one is refused.
 */
type ExpoManifest = {
  android?: {
    allowBackup?: boolean;
    permissions?: string[];
  };
  ios?: {
    infoPlist?: {
      NSAppTransportSecurity?: {
        NSAllowsArbitraryLoads?: boolean;
      };
    };
  };
};

/** The app's root (the npm package): this file is `src/config/__tests__/`. */
const ROOT = join(__dirname, '..', '..', '..');

/** Foreground location, and what the copy in `location-consent-screen.tsx` promises. */
const FOREGROUND_LOCATION = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
];

function manifest(): ExpoManifest {
  return (JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')) as { expo: ExpoManifest }).expo;
}

describe('the app manifest', () => {
  it('keeps the records this phone holds out of Android auto-backup', () => {
    expect(manifest().android?.allowBackup).toBe(false);
  });

  it('asks for foreground location and no other Android permission', () => {
    expect(manifest().android?.permissions).toEqual(FOREGROUND_LOCATION);
  });

  it('adds no blanket cleartext exception on iOS', () => {
    expect(manifest().ios?.infoPlist?.NSAppTransportSecurity?.NSAllowsArbitraryLoads).not.toBe(
      true,
    );
  });
});
