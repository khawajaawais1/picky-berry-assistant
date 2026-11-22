import '../../global.css';

import { Stack, router, type ErrorBoundaryProps } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/components/theme-provider';
import { ErrorScreen } from '@/components/templates';
import { zonesQueryCachePersistence } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useDocumentLanguage } from '@/hooks/use-document-language';
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

function RootShell() {
  const theme = useAppTheme();
  const { locale } = useTranslation();
  // The static document can only declare the source language; on the web the document follows the
  // language the app ended up showing (`src/app/+html.tsx` sets the first one).
  useDocumentLanguage(locale);

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
