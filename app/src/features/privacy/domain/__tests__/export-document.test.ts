import type { PrivacyConsent } from '@/services/privacy-consent';
import type { VisitReport } from '@/services/report-queue';
import type { SavedZone } from '@/services/saved-zones';
import type { Session } from '@/services/session';

import { EXPORT_FORMAT, buildExportDocument, type ExportRecords } from '../export-document';

/**
 * The copy the app owes for the records this phone holds (PROJECT.md, open question 23: “an export
 * or portability path”), which is AGENTS.md §11's *how the user gets a copy* answered for every
 * stored field at once.
 *
 * It is a document rather than a sentence because portability means a copy another tool can read.
 * What these tests hold is therefore the document's **shape and its honesty**:
 *
 * - it carries the app's own field names, so the app (or anything else) can read it back;
 * - it carries **nothing else** — no token, no password, no device identifier, because the app
 *   holds none of those and a document is not the place to start inventing them;
 * - it copies each record's own values and restamps nothing, so the copy is the record rather
 *   than the app's opinion of it;
 * - and it says when a read failed, because a copy presented as the whole of what is held while a
 *   store would not answer is the one lie this document could tell.
 */
const AT = new Date('2026-10-11T09:30:00.000Z');

const EMPTY: ExportRecords = {
  consent: null,
  readFailed: false,
  reports: [],
  session: null,
  zones: [],
};

const CONSENT: PrivacyConsent = {
  visitTracking: false,
  decidedAt: '2026-10-09T08:15:00.000Z',
};

const SESSION: Session = {
  accountId: 'aino@example.fi',
  displayName: 'Aino Korhonen',
  expiresAt: '2026-10-11T10:00:00.000Z',
  issuedAt: '2026-10-11T09:00:00.000Z',
};

const ZONES: SavedZone[] = [
  { savedAt: '2026-08-26T09:00:00.000Z', speciesId: 'bilberry', zoneId: 'Z14' },
  { savedAt: '2026-08-27T09:00:00.000Z', speciesId: 'lingonberry', zoneId: 'Z09' },
];

const REPORTS: VisitReport[] = [
  {
    amountText: '1.3 kg',
    minutes: 52,
    recordedAt: '2026-08-28T10:55:00.000Z',
    speciesId: 'lingonberry',
    yieldRating: 4,
    zoneId: 'Z14',
  },
];

function document(records: ExportRecords): Record<string, unknown> {
  return JSON.parse(buildExportDocument(records, AT)) as Record<string, unknown>;
}

describe('buildExportDocument', () => {
  it('names its own format and the moment the copy was made', () => {
    const copy = document(EMPTY);

    // A versioned format is what makes the copy readable by something that did not write it, and
    // the moment is the copy's, never a record's.
    expect(copy.format).toBe(EXPORT_FORMAT);
    expect(copy.generatedAt).toBe('2026-10-11T09:30:00.000Z');
  });

  it('carries the records and nothing else', () => {
    // The key set is the whole of the claim: no token, no password, no device identifier, no
    // storage key. A document that listed something the app does not hold would be the worst kind
    // of export — one that looks complete.
    expect(Object.keys(document(EMPTY)).sort()).toEqual([
      'account',
      'consent',
      'format',
      'generatedAt',
      'incomplete',
      'queuedReports',
      'savedZones',
    ]);
  });

  it('copies an empty phone as empty records rather than omitting them', () => {
    const copy = document(EMPTY);

    // `null` rather than a missing key: “this phone holds no account” is a fact about the phone,
    // and an absent key is a fact about the writer.
    expect(copy.account).toBeNull();
    expect(copy.consent).toBeNull();
    expect(copy.savedZones).toEqual([]);
    expect(copy.queuedReports).toEqual([]);
    expect(copy.incomplete).toBe(false);
  });

  it('copies each record’s own values, restamping nothing', () => {
    const copy = document({
      consent: CONSENT,
      readFailed: false,
      reports: REPORTS,
      session: SESSION,
      zones: ZONES,
    });

    expect(copy.account).toEqual(SESSION);
    expect(copy.consent).toEqual(CONSENT);
    expect(copy.savedZones).toEqual(ZONES);
    expect(copy.queuedReports).toEqual(REPORTS);
    // The copy's own moment is not stamped over the records it copies: the consent was decided when
    // it was decided, and the report recorded when it was recorded.
    expect(copy.consent).toHaveProperty('decidedAt', CONSENT.decidedAt);
    expect(copy.queuedReports).toEqual([
      expect.objectContaining({ recordedAt: '2026-08-28T10:55:00.000Z' }),
    ]);
  });

  it('says the copy may be incomplete when a record could not be read, and still carries what it read', () => {
    const copy = document({
      consent: null,
      readFailed: true,
      reports: [],
      session: null,
      zones: ZONES,
    });

    // A copy that silently dropped a record would say the phone holds less than it does. The flag
    // is about the copy, not about the records, which is why everything read is still in it.
    expect(copy.incomplete).toBe(true);
    expect(copy.savedZones).toEqual(ZONES);
  });

  it('writes a document a reader can parse a second time', () => {
    const text = buildExportDocument({ ...EMPTY, consent: CONSENT, session: SESSION }, AT);

    // Round-tripping is the whole point of a machine-readable copy, and `undefined` values are the
    // way a document written from optional fields loses a key without anyone noticing.
    expect(JSON.parse(text)).toEqual(document({ ...EMPTY, consent: CONSENT, session: SESSION }));
  });
});
