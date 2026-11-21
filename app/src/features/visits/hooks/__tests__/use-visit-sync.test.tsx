import { renderHook, waitFor } from '@testing-library/react-native';

import type { Visit } from '../../domain/visit-lifecycle';
import type { SubmitOutcome, VisitsApi } from '../../services/visits-api';
import { useVisitSync } from '../use-visit-sync';

/**
 * The tracker's finalized visits reach `POST /visits` once each (ADR-065, the plan's phase 4).
 * A visit the network lost is tried again the next time the tracker's list changes, and a visit
 * the server recorded or refused is never sent again.
 */
const T0 = Date.parse('2026-08-03T09:00:00.000Z');

function visit(id: string, finalized = true): Visit {
  return {
    id,
    zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    policyVersion: 'stand-in-1',
    openedAt: T0,
    lastPresenceAt: T0 + 60_000,
    segments: [{ enteredAt: T0, exitedAt: T0 + 60_000 }],
    finalizedAt: finalized ? T0 + 120_000 : null,
  };
}

function apiAnswering(...outcomes: SubmitOutcome['kind'][]) {
  const queue = [...outcomes];
  const submit = jest.fn(async (): Promise<SubmitOutcome> => {
    const kind = queue.shift() ?? 'recorded';
    if (kind === 'retry' || kind === 'refused') return { kind, failure: { kind: 'network' } };
    if (kind === 'skipped') return { kind };
    return {
      kind,
      record: {
        id: 'r',
        zoneId: null,
        zoneName: null,
        startedAt: '2026-08-03T09:00:00.000Z',
        durationSeconds: 60,
        status: 'accepted',
        rejectReason: null,
      },
    };
  });
  const api: VisitsApi = { submit, list: jest.fn() };
  return { api, submit };
}

describe('useVisitSync', () => {
  it('submits each finalized visit once, and none that may still resume', async () => {
    const { api, submit } = apiAnswering();
    const visits = [visit('a'), visit('b', false)];

    const { rerender } = await renderHook(
      ({ list }: { list: readonly Visit[] }) => useVisitSync({ api, visits: list }),
      {
        initialProps: { list: visits },
      },
    );
    await rerender({ list: [...visits] });

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    expect(submit).toHaveBeenCalledWith(visits[0]);
  });

  it('tries a lost visit again the next time the list changes', async () => {
    const { api, submit } = apiAnswering('retry', 'recorded');

    const { rerender } = await renderHook(
      ({ list }: { list: readonly Visit[] }) => useVisitSync({ api, visits: list }),
      {
        initialProps: { list: [visit('a')] },
      },
    );
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));

    await rerender({ list: [visit('a'), visit('c', false)] });

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  });

  it('does not send a refused visit again', async () => {
    const { api, submit } = apiAnswering('refused');

    const { rerender } = await renderHook(
      ({ list }: { list: readonly Visit[] }) => useVisitSync({ api, visits: list }),
      {
        initialProps: { list: [visit('a')] },
      },
    );
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));

    await rerender({ list: [visit('a'), visit('c', false)] });

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('sends nothing without an API', async () => {
    await renderHook(() => useVisitSync({ api: undefined, visits: [visit('a')] }));
  });
});
