import type { PrivacyConsent } from '@/services/privacy-consent';
import type { VisitReport } from '@/services/report-queue';
import type { SavedZone } from '@/services/saved-zones';
import type { Session } from '@/services/session';

/**
 * The copy the app owes of the records this phone holds, as one document.
 *
 * PROJECT.md's open question 23 names what the app still owed for its two device-side records —
 * “an export or portability path (a copy the user can take somewhere else; a share the queued
 * report, or a file export would answer it)” — and AGENTS.md §11 asks every stored field *how the
 * user gets a copy*. This module is that answer, written once for all of them: one document
 * holding each record's own values, handed to the device's own share sheet by the screen that
 * reads it (`features/privacy/components/your-data-screen.tsx`).
 *
 * **It is a document rather than a sentence, and its keys are the app's own field names.** A copy
 * that another tool can read is what portability means, so the keys are not translated: they are
 * the identifiers the services write (`zoneId`, `yieldRating`, `decidedAt`), and translating them
 * would produce a file the app itself could no longer read back. The screen's own copy — what the
 * copy contains, where it goes — is the catalogue's, in both shipped languages.
 *
 * **What it deliberately does not contain.** Nothing the app does not hold: no token, no password,
 * no device identifier, no storage key, no session secret. The app holds a name, an identifier, a
 * consent decision, the zones someone saved and the reports still waiting, and the document is
 * exactly those five things. Its own key set is asserted rather than described, so a field added
 * to a record cannot reach a copy of the user's data without that assertion being changed too.
 *
 * **It is honest about a read that failed.** `incomplete` is about the copy, not about the records:
 * a store that would not answer means this document may be missing something, and a copy presented
 * as the whole of what is held is the one thing an export may not do. What was read is carried
 * whatever the flag says, because it is still the user's.
 *
 * Pure: no React, no I/O, and no clock of its own — the moment the copy was made is passed in, so
 * the document is a value a test can assert to the millisecond.
 */

/**
 * The format's own name and version, written into every document.
 *
 * A reader that receives a copy has to be able to say what it is holding. When the records' shape
 * changes, this string changes with it, and an older copy stays readable rather than being
 * mistaken for a current one.
 */
export const EXPORT_FORMAT = 'picky.personal-data.v1';

/** What the app is holding, as the screens and hooks read it. */
export type ExportRecords = {
  /** The account the app is holding, in memory (ADR-028) — `null` when it holds none. */
  session: Session | null;
  /** The consent decision, or `null` when the user has never decided (ADR-020). */
  consent: PrivacyConsent | null;
  /** The zones on the picker's plan (ADR-024). */
  zones: SavedZone[];
  /** The reports still waiting to reach a server (ADR-005). */
  reports: VisitReport[];
  /** True when any of the reads above did not answer, so this copy may be missing something. */
  readFailed: boolean;
};

/**
 * The document, as the JSON text that is handed over.
 *
 * A record the phone does not hold is written as `null` (or an empty list) rather than left out:
 * “this phone holds no consent” is a fact about the phone, and a missing key would be a fact about
 * the writer.
 */
export function buildExportDocument(records: ExportRecords, at: Date): string {
  return JSON.stringify(
    {
      account: records.session,
      consent: records.consent,
      format: EXPORT_FORMAT,
      generatedAt: at.toISOString(),
      incomplete: records.readFailed,
      queuedReports: records.reports,
      savedZones: records.zones,
    },
    null,
    2,
  );
}
