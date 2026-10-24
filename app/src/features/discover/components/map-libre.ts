import type * as MapLibreReactNative from '@maplibre/maplibre-react-native';

export type MapLibreModule = typeof MapLibreReactNative;

/**
 * MapLibre's JavaScript entry asks for `MLRNCameraModule` through
 * `TurboModuleRegistry.getEnforcing` as soon as it loads, so a binary without MapLibre —
 * Expo Go, or a development build whose native project was generated before the package was
 * added — throws during import, before any screen can render a fallback. The Discover feature
 * is reached from the root layout, which makes that an app-wide crash rather than a missing
 * screen.
 *
 * Loading through this function is the seam: it returns `null` only for that specific
 * missing-native-module failure so the map can say it needs a development build. Any other
 * failure is rethrown, because a bundle or compatibility error must not be mistaken for a
 * build that simply lacks the native view.
 */
export function loadMapLibre(): MapLibreModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- a static import would run MapLibre's native-module lookup before the guard can catch its absence; the require is the guard.
    return require('@maplibre/maplibre-react-native') as MapLibreModule;
  } catch (error) {
    if (isMissingCameraModule(error)) {
      return null;
    }

    throw error;
  }
}

function isMissingCameraModule(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.includes('MLRNCameraModule') &&
    error.message.includes('could not be found')
  );
}
