import '../../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useAppTheme } from '@/hooks/use-app-theme';
import { QueryProvider } from '@/services/query-client';

export default function RootLayout() {
  const theme = useAppTheme();

  return (
    <QueryProvider>
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
