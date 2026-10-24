import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  CONSENT_STORAGE_KEY,
  clearPrivacyConsent,
  readPrivacyConsent,
  recordPrivacyConsent,
} from '../privacy-consent';

/**
 * The record behind screen 05's consent and the switch that withdraws it.
 *
 * It is a *record* rather than a piece of UI state because consent has to be demonstrable
 * and withdrawing it has to be as easy as giving it (GDPR Art. 7). It is stored on the
 * device and sent nowhere: there is no backend, and nothing captures position yet
 * (ADR-020, PROJECT.md).
 *
 * Since 2026-10-12 the field is `visitTracking`: what the app asks for, and all it does, is
 * time visits while the app is open — background capture is an owner decision that has not
 * been taken (ADR-047). The record's old shape is named here as data the app refuses to
 * read and clears away.
 */
const LEGACY_STORAGE_KEY = 'picky.privacy-consent.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('the stored consent record', () => {
  it('is absent until the user has decided', async () => {
    await expect(readPrivacyConsent()).resolves.toBeNull();
  });

  it('keeps its own version, so a changed shape is a new key and not a misread old one', () => {
    expect(CONSENT_STORAGE_KEY).toBe('picky.privacy-consent.v2');
  });

  it('records the decision together with when it was made', async () => {
    const decidedAt = new Date('2026-10-09T12:00:00.000Z');

    const consent = await recordPrivacyConsent(true, decidedAt);

    expect(consent).toEqual({ visitTracking: true, decidedAt: '2026-10-09T12:00:00.000Z' });
    await expect(readPrivacyConsent()).resolves.toEqual(consent);
    await expect(AsyncStorage.getItem(CONSENT_STORAGE_KEY)).resolves.toBe(JSON.stringify(consent));
  });

  it('records a withdrawn consent as the current value, not as a gap', async () => {
    await recordPrivacyConsent(true, new Date('2026-10-09T12:00:00.000Z'));

    const withdrawn = await recordPrivacyConsent(false, new Date('2026-10-09T13:00:00.000Z'));

    // The record states what is true now; the time it was last decided is how the app can
    // tell “turned off” from “never asked”.
    expect(withdrawn).toEqual({
      visitTracking: false,
      decidedAt: '2026-10-09T13:00:00.000Z',
    });
    await expect(readPrivacyConsent()).resolves.toEqual(withdrawn);
  });

  it('reads back nothing when the stored value is not a record it wrote', async () => {
    // Fail closed: a value the app cannot understand must never be read as consent. The
    // first two are the shape this record had before 2026-10-12 — unreadable now, and
    // deliberately not migrated: the app asks again rather than guessing what was agreed to
    // under the frames' heavier promise (ADR-047).
    for (const unreadable of [
      'not json at all',
      'null',
      'true',
      '{"backgroundTracking":true,"decidedAt":"2026-10-09T12:00:00.000Z"}',
      '{"visitTracking":true}',
      '{"visitTracking":"yes","decidedAt":"2026-10-09T12:00:00.000Z"}',
      '{"visitTracking":true,"decidedAt":""}',
      '{"visitTracking":true,"decidedAt":42}',
    ]) {
      await AsyncStorage.setItem(CONSENT_STORAGE_KEY, unreadable);
      await expect(readPrivacyConsent()).resolves.toBeNull();
    }
  });

  it('clears a record left under the previous key, which it can no longer read', async () => {
    // A consent the app cannot show is a consent it cannot rely on — and a record nobody can
    // read or withdraw is a stored field with no answers to the four questions (AGENTS.md
    // §11). Deleting it is the safe direction: it is not read as consent either way, so the
    // user is asked again instead of the app assuming what they agreed to.
    await AsyncStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ backgroundTracking: true, decidedAt: '2026-10-09T12:00:00.000Z' }),
    );

    await expect(readPrivacyConsent()).resolves.toBeNull();
    await expect(AsyncStorage.getItem(LEGACY_STORAGE_KEY)).resolves.toBeNull();
  });

  it('leaves a decision already made under the current key alone', async () => {
    // The cleanup is tied to the current record being absent: a device that has decided under
    // this shape keeps its answer.
    await recordPrivacyConsent(true, new Date('2026-10-12T12:00:00.000Z'));
    await AsyncStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ backgroundTracking: false, decidedAt: '2026-10-09T12:00:00.000Z' }),
    );

    await expect(readPrivacyConsent()).resolves.toEqual({
      visitTracking: true,
      decidedAt: '2026-10-12T12:00:00.000Z',
    });
  });

  it('is removed when the user leaves, without leaving either key behind', async () => {
    await recordPrivacyConsent(true);
    await AsyncStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({ backgroundTracking: true, decidedAt: '2026-10-09T12:00:00.000Z' }),
    );

    await clearPrivacyConsent();

    await expect(readPrivacyConsent()).resolves.toBeNull();
    await expect(AsyncStorage.getItem(CONSENT_STORAGE_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(LEGACY_STORAGE_KEY)).resolves.toBeNull();
  });
});
