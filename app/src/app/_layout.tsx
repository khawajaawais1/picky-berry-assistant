import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { zonesQueryCachePersistence } from '@/features/discover';
import { useAppTheme } from '@/hooks/use-app-theme';
import { QueryProvider } from '@/services/query-client';

export default function RootLayout() {
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
