import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { OutboxVisit } from '@/services/visit-outbox';

import type { Visit } from '../../domain/visit-lifecycle';
import type { SubmitOutcome, VisitsApi } from '../../services/visits-api';
import { useVisitSync, type VisitOutboxStore } from '../use-visit-sync';

/**
 * Finished visits reach `POST /visits` through a durable outbox (ADR-066): a visit is kept on
 * the device first, then sent, and leaves the outbox only once the server has answered it. A
 * visit a lost network kept is sent on the next flush or the next launch.
 */
const T0 = Date.parse('2026-08-03T09:00:00.000Z');
const ZONE = 'cc0e7929-de9f-516a-9049-7a25a1a6d092';
const uuid = (n: number) => `4cd7a7d4-e6da-4d4c-bdbf-${String(n).padStart(12, '0')}`;

function visit(n: number, finalized = true): Visit {
  return {
    id: uuid(n),
    zoneId: ZONE,
    policyVersion: 'stand-in-1',
    openedAt: T0,
    lastPresenceAt: T0 + 60_000,
    segments: [{ enteredAt: T0, exitedAt: T0 + 60_000 }],
    finalizedAt: finalized ? T0 + 120_000 : null,
  };
}

function memoryOutbox(initial: OutboxVisit[] = []) {
  let held = [...initial];
  const outbox: VisitOutboxStore = {
    read: async () => [...held],
    add: async (entry) => {
      if (!held.some((h) => h.clientId === entry.clientId)) held.push(entry);
    },
    remove: async (clientId) => {
      held = held.filter((h) => h.clientId !== clientId);
    },
  };
  return { outbox, held: () => held };
}

function apiAnswering(...kinds: ('recorded' | 'retry' | 'refused')[]) {
  const queue = [...kinds];
  const send = jest.fn(async (): Promise<Exclude<SubmitOutcome, { kind: 'skipped' }>> => {
    const kind = queue.shift() ?? 'recorded';
    if (kind !== 'recorded') return { kind, failure: { kind: 'network' } };
    return {
      kind,
      record: {
        id: uuid(99),
        zoneId: ZONE,
        zoneName: null,
        startedAt: '2026-08-03T09:00:00.000Z',
        durationSeconds: 60,
        status: 'accepted',
        rejectReason: null,
      },
    };
  });
  const api: VisitsApi = { send, submit: jest.fn(), list: jest.fn() };
  return { api, send };
}

type Props = { list: readonly Visit[] };

describe('useVisitSync', () => {
  it('keeps a finalized visit, sends it, and lets it go once recorded', async () => {
    const { outbox, held } = memoryOutbox();
    const { api, send } = apiAnswering('recorded');

    await renderHook(({ list }: Props) => useVisitSync({ api, outbox, visits: list }), {
      initialProps: { list: [visit(1), visit(2, false)] },
    });

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenCalledWith({
      client_id: uuid(1),
      zone_id: ZONE,
      started_at: '2026-08-03T09:00:00.000Z',
      ended_at: '2026-08-03T09:01:00.000Z',
      manual: false,
    });
    await waitFor(() => expect(held()).toEqual([]));
  });

  it('keeps a visit the network lost, and sends it on the next flush', async () => {
    const { outbox, held } = memoryOutbox();
    const { api, send } = apiAnswering('retry', 'recorded');

    const { result } = await renderHook(() => useVisitSync({ api, outbox, visits: [visit(1)] }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(held()).toHaveLength(1);

    await act(async () => result.current.flush());

    expect(send).toHaveBeenCalledTimes(2);
    expect(held()).toEqual([]);
  });

  it('keeps a manual end through a lost network, and sends it as manual', async () => {
    const { outbox } = memoryOutbox();
    const { api, send } = apiAnswering('retry', 'recorded');
    const manual = { ...visit(3), endedManually: true };

    const { result } = await renderHook(() => useVisitSync({ api, outbox, visits: [manual] }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ manual: true }));

    await act(async () => result.current.flush());

    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ manual: true }));
  });

  it('lets a refused visit go, because the same body would be refused again', async () => {
    const { outbox, held } = memoryOutbox();
    const { api, send } = apiAnswering('refused');

    await renderHook(() => useVisitSync({ api, outbox, visits: [visit(1)] }));

    await waitFor(() => expect(send).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(held()).toEqual([]));
  });

  it('sends what an earlier run left in the outbox as soon as it mounts', async () => {
    const left: OutboxVisit = {
      clientId: uuid(7),
      zoneId: ZONE,
      startedAt: '2026-08-02T09:00:00.000Z',
      endedAt: '2026-08-02T09:30:00.000Z',
    };
    const { outbox } = memoryOutbox([left]);
    const { api, send } = apiAnswering('recorded');

    await renderHook(() => useVisitSync({ api, outbox, visits: [] }));

    await waitFor(() =>
      expect(send).toHaveBeenCalledWith(expect.objectContaining({ client_id: uuid(7) })),
    );
  });

  it('tries again to keep a visit the device would not store', async () => {
    const { outbox, held } = memoryOutbox();
    const add = jest.spyOn(outbox, 'add').mockRejectedValueOnce(new Error('storage full'));
    const { api } = apiAnswering('retry');

    const { rerender } = await renderHook(
      ({ list }: Props) => useVisitSync({ api, outbox, visits: list }),
      {
        initialProps: { list: [visit(1)] },
      },
    );
    await waitFor(() => expect(add).toHaveBeenCalledTimes(1));

    await rerender({ list: [visit(1), visit(2, false)] });

    await waitFor(() => expect(add).toHaveBeenCalledTimes(2));
    expect(held()).toHaveLength(1);
  });

  it('keeps and sends nothing without an API', async () => {
    const { outbox, held } = memoryOutbox();

    await renderHook(() => useVisitSync({ api: undefined, outbox, visits: [visit(1)] }));

    expect(held()).toEqual([]);
  });
});
