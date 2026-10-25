import {
  router,
  Stack,
  usePathname,
  useRouter,
  type ErrorBoundaryProps,
  type Href,
} from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { CoreNavigation, type CoreNavKey } from '@/components/organisms';
import { ErrorScreen } from '@/components/templates';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * The app shell: the nine screens the design draws the core navigation on, inside one bar.
 *
 * Frames 06–14 each draw the same bar (node `5:23012`) with one destination current, so the bar
 * is mounted once — here, in a route group, rather than nine times in nine screens. This file is
 * the only place that knows both halves of that: which route each destination leads to, and which
 * destination each screen in the group belongs to. The bar itself knows neither (it is a shared
 * component and must not know routes), and the screens do not repeat it.
 *
 * Switching destinations uses `navigate`, not `push`: the four are peers, so moving between them
 * replaces what the shell shows instead of stacking the app's history with the places a user has
 * already looked at. A screen pushed *within* a destination (zone details, the route to a zone,
 * the report) keeps the bar and its destination current — frames 07, 08, 09 and 10 draw exactly
 * that. Onboarding (`src/app/`) is outside the group, and frames 01–05 draw no bar at all.
 *
 * `ACTIVE_TAB` covers every route in this group. A path that is not in it means a screen was added
 * to the shell without saying which destination it belongs to; that draws no bar rather than a bar
 * claiming the user is somewhere they are not, and the browser harness (`npm run test:layout`)
 * fails on the missing bar.
 *
 * The shell draws no control in the screens' header rows: the settings live in the profile page,
 * and the bar's fourth destination is the way to them (owner's call on 2026-10-22 — a gear at the
 * header's top right was drawn and then taken out, because the header should carry nothing but the
 * frame's own heading).
 */
const TAB_ROUTES: Record<CoreNavKey, Href> = {
  discover: '/discover',
  visits: '/visits',
  alerts: '/alerts',
  // Frame 14 is the profile: the account-and-offline screen the fourth destination opens.
  profile: '/privacy-settings',
};

/**
 * The destination each screen in the group belongs to, as the frames draw it: 06–08 are the
 * Discover tab with a screen pushed on top of it, 09–11 are Visits (the walk, its report and the
 * season they join), 12 is Alerts, and 13–14 are the profile, downloads included.
 *
 * The saved plan (`/saved-spots`) is the profile too, because the only way in is frame 14's own
 * row on the profile screen: the design never drew the screen (ADR-030), so where it sits is
 * decided by the frame that links it rather than by what it lists. The account surface
 * (`/account-security`) and the notice (`/terms-privacy`) sit there for the same reason: they are
 * the destinations of that frame's two remaining rows (ADR-039), and neither has a frame of its own
 * to say where it belongs. The copy (`/your-data`, ADR-040) is reached from that notice, so it
 * belongs where the notice does. The zone's own report list (`/zone-reports`, ADR-044) is pushed
 * from the zone screen's own row, so it is the Discover destination too.
 */
const ACTIVE_TAB: Record<string, CoreNavKey> = {
  '/discover': 'discover',
  '/zone-details': 'discover',
  '/zone-reports': 'discover',
  '/route-to-zone': 'discover',
  '/active-visit': 'visits',
  '/post-visit-feedback': 'visits',
  '/visits': 'visits',
  '/alerts': 'alerts',
  '/account-security': 'profile',
  '/downloads': 'profile',
  '/privacy-settings': 'profile',
  '/saved-spots': 'profile',
  '/terms-privacy': 'profile',
  '/your-data': 'profile',
};

/**
 * A screen in the shell that throws falls back here: the same fallback as the root's, with the
 * shell's home as the way out, so the user is not sent back through onboarding.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return <ErrorScreen error={error} onHome={() => router.replace('/discover')} onRetry={retry} />;
}

export default function AppShellLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { colors } = useAppTheme();
  const activeKey = ACTIVE_TAB[pathname];

  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      {/*
        A nested stack, not a Slot: the shell swaps routes itself, which made every bottom-bar
        change a hard cut with no transition (reported twice from Expo Go, 2026-10-25). The stack
        gives each screen the platform's own fade; the bar stays outside it, so it never moves.
      */}
      <Stack screenOptions={{ animation: 'fade', headerShown: false }} />
      {activeKey ? (
        <CoreNavigation
          activeKey={activeKey}
          onSelect={(key) => router.navigate(TAB_ROUTES[key])}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
});
