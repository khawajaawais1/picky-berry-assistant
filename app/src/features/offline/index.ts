/**
 * Public API of the `offline` feature.
 *
 * One screen: frame 13's sync centre, which is the app's own answer to “what is still on this
 * phone?” — the report queue screen 10 writes read back where the design lists it. The feature
 * owns the vocabulary a queued report is printed with (`domain/queued-reports.ts`).
 *
 * There is no transport, no tile cache and no forecast download behind this frame yet, so the
 * parts of it that would claim one are not drawn; PROJECT.md records each of them.
 */
export { OfflineSyncScreen, type OfflineSyncScreenProps } from './components/offline-sync-screen';
export { queuedReportRows, waitingLabelKey, type QueuedReportRow } from './domain/queued-reports';
