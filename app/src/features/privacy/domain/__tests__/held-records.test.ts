import { heldRecords, type StoredRecordState } from '../held-records';

/**
 * The rule the Terms & privacy screen is built on: **the screen names only the records the phone
 * is actually holding.**
 *
 * It exists because the screen's own subject is a claim about the device. Frame 14 draws the row
 * (“Terms & privacy”, node 5:23688) and no frame draws the screen behind it, so the app writes it —
 * and the one thing a notice may not do is describe records that do not exist, or leave out one
 * that does. A cold start holds nothing; a phone with a plan and no account holds two things; a
 * read that failed holds nothing the app can name. Each of those is a case below.
 *
 * What it deliberately does not decide: the *count* in each record (the plan's own screen counts
 * it), the words a record is described with (the catalogue's), and whether a record is personal
 * data (it is, and each one's own module documents its lawful-basis question — PROJECT.md open
 * question 15).
 */
const NOTHING: StoredRecordState = {
  consentDecided: false,
  planCount: 0,
  queueCount: 0,
  signedIn: false,
};

describe('the records a phone is holding', () => {
  it('names nothing on a phone the app has just been installed on', () => {
    expect(heldRecords(NOTHING)).toEqual([]);
  });

  it('names all four, in the order the app collected them', () => {
    // The order is the screen's own reading order: who the user is, what they agreed to, what they
    // saved, and what is waiting. A different order is a different screen, and this test is where
    // that decision is visible.
    expect(
      heldRecords({ consentDecided: true, planCount: 4, queueCount: 1, signedIn: true }),
    ).toEqual(['account', 'consent', 'plan', 'queue']);
  });

  it('names a record that is a decision, whichever way the decision went', () => {
    // The consent record is written both when visit tracking is switched on and when it is
    // switched off: the refusal is a record too (ADR-020), so the screen names it either way.
    expect(heldRecords({ ...NOTHING, consentDecided: true })).toEqual(['consent']);
  });

  it('names one record at a time, whatever else the phone holds', () => {
    expect(heldRecords({ ...NOTHING, signedIn: true })).toEqual(['account']);
    expect(heldRecords({ ...NOTHING, consentDecided: true })).toEqual(['consent']);
    expect(heldRecords({ ...NOTHING, planCount: 1 })).toEqual(['plan']);
    expect(heldRecords({ ...NOTHING, queueCount: 1 })).toEqual(['queue']);
  });

  it('claims nothing about a record the app could not read', () => {
    // `undefined` is “the app does not know”, and it must not read as “the phone holds nothing” or
    // as “the phone holds something”: both would be the screen inventing an answer the store did
    // not give (the same rule the settings screen follows for the plan's count).
    expect(
      heldRecords({
        consentDecided: undefined,
        planCount: undefined,
        queueCount: undefined,
        signedIn: undefined,
      }),
    ).toEqual([]);
  });

  it('never names an empty plan or an empty queue as a record', () => {
    // An empty plan is the absence of a record: the app writes one when the picker saves a zone,
    // not when they open a screen (ADR-024), and the queue is written by a report (ADR-005).
    expect(heldRecords({ ...NOTHING, planCount: 0, queueCount: 0 })).toEqual([]);
  });
});
