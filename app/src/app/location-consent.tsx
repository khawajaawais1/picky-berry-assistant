import { router } from 'expo-router';

import { OnboardingLocationConsentScreen } from '@/features/onboarding';

/**
 * Screen 05 · Onboarding · Location consent (Figma node 5:22885).
 *
 * A route only wires a screen to a feature's public API. The back control is wired because
 * screen 04 sits behind it.
 *
 * **Continuing and skipping both lead into the app** — the screens the design draws beyond this
 * one (frames 06+), which exist, so the flow no longer stops here. Until 2026-10-10 this route's
 * own note said there was no screen beyond this one; a sign-up that cannot reach the app is a
 * flow nobody can walk, and the account the sign-up produces is held in the process, so a reload
 * cannot stand in for the way on. The two differ in what the screen before recorded — continuing
 * keeps a decision, skipping leaves it unanswered — and not in where they lead, because nothing
 * captures position yet either way.
 *
 * What is still deliberately unwired is **asking the operating system for location**: the lawful
 * basis for position is an owner decision (PROJECT.md, open question 15), so the screen collects
 * the consent the user can read and hear, and the permission prompt follows that decision rather
 * than preceding it.
 */
export default function LocationConsentRoute() {
  return (
    <OnboardingLocationConsentScreen
      onBack={() => router.back()}
      onContinue={() => router.push('/discover')}
      onSkip={() => router.push('/discover')}
    />
  );
}
