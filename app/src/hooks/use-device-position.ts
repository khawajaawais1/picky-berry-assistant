import { useEffect, useRef, useState } from 'react';

import { positionSource, type PositionFix, type PositionSource } from '@/services/location';

import { usePrivacyConsent } from './use-privacy-consent';

/**
 * The device's position, read only when the picker has agreed to it — the gate between the seam
 * (`src/services/location/`) and any screen ([ADR-045](../../docs/adr/ADR-045-a-position-behind-a-
 * port-and-nothing-kept.md)).
 *
 * Two gates, and both are the user's:
 *
 * 1. **The app's own consent record** (screen 05 / the privacy screen, ADR-020). No record, a
 *    record that says no, or a record the device would not hand over all mean the same thing here:
 *    nothing is read. An unreadable record is treated as unanswered rather than as agreement, which
 *    is the rule the consent service already keeps.
 * 2. **The platform's permission**, asked once per authorisation. Its answer is reported as what it
 *    is — `denied` is a refusal, `unavailable` is a device with nothing to give, and a platform that
 *    will not answer at all is `failed`, because a failure is not a refusal.
 *
 * What the statuses mean to a screen, and the one rule that keeps them honest:
 *
 * - `waiting` — the consent record is still being read. Nothing may be claimed about position.
 * - `off` — the app is reading nothing, and no permission was refused: there is no consent to read
 *   under. (A screen that needs to say *why* reads the consent hook's own `error` alongside this.)
 * - `requesting` — the platform is being asked.
 * - `denied` / `unavailable` / `failed` — nothing is being read, for the three different reasons.
 * - `tracking` — a fix may arrive; `fix` is the newest observation, or `null` until one does.
 *
 * **Mounting this hook is what asks for a position.** There is no `enabled` flag, because “this
 * screen needs a fix” and “this screen is mounted” are the same statement — and stopping is the same
 * fact too: leaving the screen stops the watch. A watch that fails while it is running drops the fix
 * it was holding, because a fix from a dead watch is no longer evidence of where the picker is.
 *
 * **The answer belongs to the record it was read under.** What the platform said, and any fix that
 * came with it, are held together with the consent record's own timestamp; a screen that opens under
 * a later decision — a withdrawal and a fresh consent, or a different record — finds no answer here
 * and asks again rather than inheriting one read under a consent the user has since changed.
 *
 * Nothing here logs a fix (SECURITY.md §11), and nothing here decides whether a fix should be kept:
 * no caller stores one, and what may ever be persisted is an open question (ADR-014's 12 months is
 * about records the app keeps, and today it keeps none).
 */
export type DevicePositionStatus =
  'waiting' | 'off' | 'requesting' | 'denied' | 'unavailable' | 'failed' | 'tracking';

export type DevicePositionState = {
  /** The newest observation, or `null` when nothing is being read or nothing has arrived yet. */
  fix: PositionFix | null;
  status: DevicePositionStatus;
};

export type UseDevicePositionOptions = {
  /** The seam to read through; tests and device-free callers supply their own. */
  source?: PositionSource;
  /**
   * Called for each fix as it arrives, in addition to the `fix` this hook returns.
   *
   * It is a subscription, not a second gate: the consent record and the platform's answer still
   * decide whether anything is read at all. A caller that folds fixes into its own state — the
   * visit tracker does (`features/visits/hooks/use-visit-presence.ts`) — gets them here, where the
   * update happens in the event that delivered the fix rather than in an effect watching the
   * returned value.
   *
   * The callback is held in a ref, so a caller may pass a new function on every render without
   * restarting the watch.
   */
  onFix?: (fix: PositionFix) => void;
};

/** The platform's answer about one consent record, with the newest fix it produced. */
type PositionAnswer = {
  /** The consent record this was read under — `decidedAt` is what makes a record a decision. */
  forRecord: string;
  fix: PositionFix | null;
  status: Exclude<DevicePositionStatus, 'waiting' | 'off' | 'requesting'>;
};

export function useDevicePosition(options: UseDevicePositionOptions = {}): DevicePositionState {
  const source = options.source ?? positionSource;
  const { consent, loading } = usePrivacyConsent();
  const [answer, setAnswer] = useState<PositionAnswer | null>(null);

  // The subscriber is kept in a ref so the watch's own dependencies stay the record and the
  // source: a caller passing an inline callback would otherwise restart the watch on every
  // render, which is a permission prompt and a subscription the user did not ask to repeat.
  const subscriber = useRef(options.onFix);
  useEffect(() => {
    subscriber.current = options.onFix;
  }, [options.onFix]);

  // Anything other than a recorded yes is a no, including the record still being read.
  const mayRead = consent?.visitTracking === true;
  // The record that authorises a read, or `null` when nothing does. It is the answer's own key:
  // an answer read under an earlier decision is not this screen's answer.
  const record = !loading && mayRead ? (consent?.decidedAt ?? null) : null;

  useEffect(() => {
    if (record === null) return;

    let active = true;
    let stop: (() => void) | null = null;

    const hold = (status: PositionAnswer['status'], fix: PositionFix | null = null) =>
      setAnswer({ fix, forRecord: record, status });

    source
      .requestAvailability()
      .then((availability) => {
        if (!active) return;

        if (availability !== 'granted') {
          hold(availability);
          return;
        }

        hold('tracking');
        try {
          stop = source.watch({
            onFailure: () => {
              // A watch that stopped working is no longer evidence of where the picker is.
              if (active) hold('failed');
            },
            onFix: (next) => {
              if (!active) return;
              hold('tracking', next);
              subscriber.current?.(next);
            },
          });
        } catch {
          // A platform that throws instead of reporting a failure is still a failure.
          hold('failed');
        }
      })
      .catch(() => {
        // A platform that will not answer is not a device that refused: the caller is told which.
        if (active) hold('failed');
      });

    return () => {
      // Leaving the screen — or the record changing under it — stops the watch. This is the only
      // place a stop happens, so no watch outlives the screen that asked for it.
      active = false;
      stop?.();
      stop = null;
    };
  }, [record, source]);

  const held = answer !== null && answer.forRecord === record ? answer : null;

  return {
    fix: held?.fix ?? null,
    status: loading ? 'waiting' : record === null ? 'off' : (held?.status ?? 'requesting'),
  };
}
