import { useCallback, useEffect, useState } from 'react';

import {
  clearPrivacyConsent,
  readPrivacyConsent,
  recordPrivacyConsent,
  type PrivacyConsent,
} from '@/services/privacy-consent';

/**
 * The stored consent record ([privacy-consent.ts](../services/privacy-consent.ts)), as
 * screens use it.
 *
 * It lives here rather than in the service because it is UI state — a read in flight and a
 * failure a screen has to show — while the service stays plain storage that any caller,
 * renderer or not, can use.
 *
 * Both the consent screen and the privacy screen change the same value, so they read and
 * write the same record and neither keeps its own copy. A failed write leaves the state
 * showing what is *stored* — re-read, not assumed — so a control can never show a consent
 * that does not exist, and `error` reports it rather than swallowing it. What a screen does
 * with that is the screen's business: the consent screen blocks its action, and the privacy
 * screen says the choice could not be saved.
 */
export type PrivacyConsentState = {
  /** The recorded decision, or `null` while it is unknown or was never made. */
  consent: PrivacyConsent | null;
  /**
   * True while the record is being read. Screens must treat this as “no consent yet”:
   * nothing may act on a guess about what the user agreed to.
   */
  loading: boolean;
  /** True when the device would not let the app read or write the record. */
  error: boolean;
  record: (visitTracking: boolean) => Promise<void>;
  clear: () => Promise<void>;
};

export function usePrivacyConsent(): PrivacyConsentState {
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    readPrivacyConsent()
      .then((stored) => {
        if (active) setConsent(stored);
      })
      .catch(() => {
        // A store the app cannot read is an unanswered consent, and it is reported.
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const record = useCallback(async (visitTracking: boolean) => {
    try {
      setConsent(await recordPrivacyConsent(visitTracking));
      setError(false);
    } catch {
      setError(true);
      // Show what is stored, not what was attempted: re-reading is the only honest answer
      // when the write did not happen.
      await readPrivacyConsent()
        .then(setConsent)
        .catch(() => setConsent(null));
    }
  }, []);

  const clear = useCallback(async () => {
    try {
      await clearPrivacyConsent();
      setConsent(null);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  return { clear, consent, error, loading, record };
}
