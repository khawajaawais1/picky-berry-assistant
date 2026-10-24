import { act, renderHook, waitFor } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import type { Species } from '../../domain/species';
import type { Zone, ZoneSource } from '../../domain/zone-source';
import { useZones } from '../use-zones';

/**
 * The hook that puts the `ZoneSource` port behind the map's states.
 *
 * The cases that matter are the ones a device produces and a happy-path test does not: a
 * source that fails (the map must say so, not draw an empty world), a species the picker
 * changes while the first answer is still in flight (a slow answer for the old berry must
 * not repaint the map for the new one), and the first render, which is a load rather than a
 * map with nothing on it.
 */

const zone = (id: string, score: number): Zone => ({
  id,
  h3: `h3-${id}`,
  name: `Laajavuori ${id}`,
  score,
  confidence: 'medium',
  ripeness: 'ripe',
  scores: {},
  ring: [
    [25.68, 62.25],
    [25.69, 62.25],
    [25.69, 62.26],
    [25.68, 62.25],
  ],
});

function sourceThat(answer: (species: Species) => Promise<readonly Zone[]>): ZoneSource {
  return { list: ({ species }) => answer(species) };
}

describe('useZones', () => {
  it('loads the zones and says when they are ready', async () => {
    // A source that answers later than the first paint, which is every real one: the screen
    // must be able to say it is loading rather than draw an empty world.
    let answer: (zones: readonly Zone[]) => void = () => undefined;
    const source: ZoneSource = {
      list: () => new Promise<readonly Zone[]>((resolve) => (answer = resolve)),
    };

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    expect(result.current.status).toBe('loading');

    await act(async () => answer([zone('a', 50)]));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones.map((entry) => entry.id)).toEqual(['a']);
  });

  it('asks again when the species changes, and shows the new answer only', async () => {
    const source = sourceThat(async (species) => [zone(species, 10)]);

    const { result, rerender } = await renderHook(
      ({ species }: { species: Species }) => useZones(source, species),
      { initialProps: { species: 'bilberry' as Species }, wrapper: QueryProvider },
    );

    await waitFor(() => expect(result.current.zones[0]?.id).toBe('bilberry'));

    await rerender({ species: 'cloudberry' });

    await waitFor(() => expect(result.current.zones[0]?.id).toBe('cloudberry'));
  });

  it('does not repaint with the answer to a query the screen has already moved past', async () => {
    // A slow bilberry request that resolves after the cloudberry one is the race a real
    // network produces. Without the stale guard the map would end up showing the wrong
    // berry's scores under the chip the picker is actually pressing.
    let resolveBilberry: (zones: readonly Zone[]) => void = () => undefined;
    const slowBilberry = new Promise<readonly Zone[]>((resolve) => {
      resolveBilberry = resolve;
    });
    const source: ZoneSource = {
      list: ({ species }) =>
        species === 'bilberry' ? slowBilberry : Promise.resolve([zone('c', 5)]),
    };

    const { result, rerender } = await renderHook(
      ({ species }: { species: Species }) => useZones(source, species),
      { initialProps: { species: 'bilberry' as Species }, wrapper: QueryProvider },
    );

    await rerender({ species: 'cloudberry' });
    await waitFor(() => expect(result.current.zones[0]?.id).toBe('c'));

    resolveBilberry([zone('b', 99)]);

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones[0]?.id).toBe('c');
  });

  it('reports a source that failed instead of an empty map with no explanation', async () => {
    const source = sourceThat(async () => {
      throw new Error('no docs');
    });

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.zones).toEqual([]);
  });

  it('never hands the map a zone it could not draw', async () => {
    // The port's response is validated again, because a future adapter will hand the hook
    // JSON it did not parse itself. A score the map cannot band is no zones at all, rather
    // than a polygon painted in a colour that means nothing (ADR-036 §1.2).
    const malformed = { ...zone('a', 50), score: 130 };
    const source = sourceThat(async () => [malformed as unknown as Zone]);

    const { result } = await renderHook(() => useZones(source, 'bilberry'), {
      wrapper: QueryProvider,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.zones).toEqual([]);
  });
});
