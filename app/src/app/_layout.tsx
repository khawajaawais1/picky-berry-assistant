import '../../global.css';

import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/components/theme-provider';
import { appEnvironment } from '@/config/env';
import { ErrorScreen } from '@/components/templates';
import { zonesQueryCachePersistence } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDocumentLanguage } from '@/hooks/use-document-language';
import { seedDemoData } from '@/services/demo-seed';
import { QueryProvider } from '@/services/query-client';
import { useTranslation } from '@/services/i18n';

/**
 * The root fallback. Expo Router renders a route's exported `ErrorBoundary` with the thrown error
 * and a reset; the shell below has its own boundary so a screen error does not lose the core
 * navigation it is drawn inside.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} onHome={() => router.replace('/')} onRetry={retry} />;
}

export default function RootLayout() {
  // The theme is resolved once, above everything that paints (`components/theme-provider.tsx`):
  // the static web export paints light, so the tree may not resolve its own scheme on the first
  // client render without disagreeing with the HTML.
  return (
    <AppThemeProvider>
      <RootShell />
    </AppThemeProvider>
  );
}

/**
 * The preview seed gate. The saved plan and the report queue are the picker's own device
 * records; a native development/preview build starts them with two samples so the personal
 * screens can be demoed before the zone and report services exist. The seed is one-time, never
 * runs in production or on the web, and the profile says a preview may start with samples.
 *
 * `useSyncExternalStore` rather than a state-setting effect: the app must not paint a screen
 * that reads an empty store and then have its rows appear underneath it. The server snapshot is
 * ready (the web export is never seeded), and the native snapshot becomes ready when the seed
 * has finished or failed.
 */
let demoSeedReady = Platform.OS === 'web' || appEnvironment() === 'production';
let demoSeedStarted = false;
const demoSeedListeners = new Set<() => void>();

function subscribeToDemoSeed(listener: () => void) {
  demoSeedListeners.add(listener);

  return () => {
    demoSeedListeners.delete(listener);
  };
}

const getDemoSeedSnapshot = () => demoSeedReady;
const getDemoSeedServerSnapshot = () => true;

function startDemoSeed() {
  if (demoSeedStarted || demoSeedReady) {
    return;
  }

  demoSeedStarted = true;

  seedDemoData()
    .catch(() => {
      // A failed sample write must not hold the app behind a blank frame; the screens fall
      // back to their own honest empty states.
    })
    .finally(() => {
      demoSeedReady = true;

      for (const listener of demoSeedListeners) {
        listener();
      }
    });
}

function RootShell() {
  const demoSeed = useSyncExternalStore(
    subscribeToDemoSeed,
    getDemoSeedSnapshot,
    getDemoSeedServerSnapshot,
  );

  useEffect(() => {
    startDemoSeed();
  }, []);

  const theme = useAppTheme();
  const { locale } = useTranslation();
  // The static document can only declare the source language; on the web the document follows the
  // language the app ended up showing (`src/app/+html.tsx` sets the first one).
  useDocumentLanguage(locale);

  if (!demoSeed) {
    return null;
  }

  return (
    // The one place the app says which reads survive a restart: the Discover map opens with
    // the last zones this device read, rather than a loading line in a forest with no signal
    // (`features/discover/services/zone-cache.ts`).
    <QueryProvider persistOptions={zonesQueryCachePersistence}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        />
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </QueryProvider>
  );
}
