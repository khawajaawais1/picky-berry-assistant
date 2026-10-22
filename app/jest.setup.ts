/**
 * Jest setup shared by every test file.
 *
 * `react-native-safe-area-context` reads native metrics, so it is replaced by
 * the mock the library ships for tests. Keep this file limited to environment
 * setup — never hide real failures with broad mocks.
 */
import { registerCSS, setupAllComponents } from 'react-native-css-interop/test';

import '@testing-library/react-native';

/**
 * In the app, Metro compiles `global.css` and hands the result to NativeWind. Jest
 * has no Metro pass, so `jest.global-setup.js` compiles the same CSS once and it is
 * registered here with the same runtime instance `nativewind` uses. Without this,
 * every `className` resolves to nothing and style assertions would be vacuous.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- the build output is a plain JS module written by jest.global-setup.js before this file runs; requiring it keeps this file free of filesystem and Node globals.
const compiledTailwindCss: string = require('./node_modules/.cache/picky/tailwind-css.js');

// The interop has to claim the core React Native components before styles resolve.
setupAllComponents();
registerCSS(compiledTailwindCss);

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports, so the mock must be required lazily inside the factory.
  return require('react-native-safe-area-context/jest/mock').default;
});

// `expo-network`'s hook reads a native module no test environment has, and its answer is a
// promise the renderer would otherwise be left holding. The mock's answer is “the platform has
// not said”, which is what a screen must neither turn into a claim nor draw anything for; a test
// that cares about the connection replaces this hook with its own answer (see
// `features/offline/components/__tests__/offline-sync-screen.test.tsx`).
jest.mock('expo-network', () => ({ useNetworkState: () => ({}) }));

// AsyncStorage is a native module, so it is replaced by the in-memory mock the library
// ships for tests. What is stored on a device is still a device concern; what the app does
// with a stored value — including refusing to read one it cannot understand — is what the
// tests above it exercise (see `services/privacy-consent.ts`).
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories are hoisted above imports, so the mock must be required lazily inside the factory.
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
