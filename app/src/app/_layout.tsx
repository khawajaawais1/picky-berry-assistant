import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppThemeProvider } from '@/components/theme-provider';
import { zonesQueryCachePersistence } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueryProvider } from '@/services/query-client';

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

  return (
    // The one place the app says which reads survive a restart: the Discover map opens with
    // the last zones this device read, rather than a loading line in a forest with no signal
    // (`features/discover/services/zone-cache.ts`).
    <QueryProvider persistOptions={zonesQueryCachePersistence}>
      <SafeAreaProvider>
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
