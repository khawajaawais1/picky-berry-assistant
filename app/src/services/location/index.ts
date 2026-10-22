/**
 * The position seam (`src/services/location/`): read where the device is, when the picker has
 * agreed to it — and keep nothing.
 *
 * Read [ADR-045](../../../docs/adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md) for the
 * decision, and this file for what the app is allowed to claim.
 *
 * **What is kept, and the four questions AGENTS.md §11 asks of every stored field.** The honest
 * answer is that there is no stored field: a `PositionFix` lives in memory for as long as a screen
 * is asking for it, and this module neither writes, sends nor logs one. Because that is a claim
 * about the code rather than a state the app drifts into, it is stated as the four answers:
 *
 * - **Who may read it** — the screen that is asking, through `use-device-position`, and nothing
 *   else. Nothing is written to storage, so nothing survives the screen; nothing is sent anywhere,
 *   because there is no server; nothing is logged (SECURITY.md §11).
 * - **How the user gets a copy** — there is nothing to copy: what the app holds is the picker's
 *   position right now, and it is gone when the screen closes. The consent record itself is the
 *   copy of *why* the app may read it (`src/services/privacy-consent.ts`, ADR-020).
 * - **How it is corrected** — the next fix replaces the last one, always; the app never edits or
 *   merges observations.
 * - **How it is deleted** — leaving the screen stops the watch and drops the fix (the hook's own
 *   contract), withdrawing consent means the next screen reads nothing, and uninstalling the app
 *   takes the consent record with it.
 *
 * **Where the trail question lands.** The design's consent screen promised timing a visit “while
 * the app is in the background”; the copy that ships says what this seam does instead — tracking
 * while the app is open ([ADR-047](../../../docs/adr/ADR-047-the-consent-says-what-the-app-does.md))
 * — and retention for position-derived records is 12 months (ADR-014). Neither is in this seam
 * yet, deliberately: **no watch runs in the app today** — there
 * is nothing that can use a fix while the map has no geography and no zone service returns rings
 * (PROJECT.md, known issues 12, 14, 30) — so the app reads nothing at all, and the least it can
 * collect is nothing. What background capture would require (the platform's “always” permission
 * and Android's foreground service, each with a store declaration) and what may be persisted from
 * a visit are the owner's decisions, recorded as the slots of ADR-047 §2 rather than assumed here.
 */
export { createDevicePositionSource, positionSource, toPositionFix } from './expo-source';

export type { PositionAvailability, PositionFix, PositionHandlers, PositionSource } from './types';
