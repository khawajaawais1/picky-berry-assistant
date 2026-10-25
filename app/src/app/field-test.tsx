import { Redirect, router } from 'expo-router';

import { appEnvironment } from '@/config/env';
import { FieldTestScreen } from '@/features/field-test';

/**
 * The development-only location-watch field instrument (ADR-063).
 *
 * It is a route rather than a variant on a product screen because it has to hold the display awake
 * for half an hour and run the real watch, and because a deep link is how a tester gets to it on a
 * phone (`picky://field-test`). A production build has no such instrument: the route redirects to
 * the front door before the screen mounts, and `e2e/production-export.spec.ts` checks that the
 * redirect survives a real export.
 */
export default function FieldTestRoute() {
  if (appEnvironment() === 'production') {
    return <Redirect href="/" />;
  }

  return <FieldTestScreen onOpenPrivacy={() => router.push('/privacy-settings')} />;
}
