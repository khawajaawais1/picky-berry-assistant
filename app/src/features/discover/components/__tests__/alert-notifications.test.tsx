import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, waitFor } from '@testing-library/react-native';

import type { AlertNotifier } from '@/services/push';

import type { ReasoningAlert } from '../../domain/reasoning-alert';
import { readNotifiedAlerts } from '../../services/notified-alerts-store';
import { AlertNotifications } from '../alert-notifications';

const RIPE: ReasoningAlert = {
  ruleId: 'ripe_nearby',
  zoneId: '082f0e54-03f4-5636-be4a-3f39d243a696',
  zoneName: 'Ukonvuori 4',
  species: 'bilberry',
  score: 82,
  confidence: 'medium',
  ripeness: 'ripe',
  sentence: 'Ripe bilberry in zone Ukonvuori 4 — yield score 82, medium confidence.',
};

const NOW = () => new Date('2026-08-15T09:00:00.000Z');

function fakeNotifier({ allowed = true }: { allowed?: boolean } = {}) {
  let tap: ((data: unknown) => void) | null = null;
  const notifier = {
    canNotify: jest.fn(async () => allowed),
    show: jest.fn(async () => undefined),
    onTap: jest.fn((handler: (data: unknown) => void) => {
      tap = handler;
      return () => {
        tap = null;
      };
    }),
  } satisfies AlertNotifier;
  return { notifier, tap: (data: unknown) => tap?.(data) };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AlertNotifications', () => {
  it('shows each new alert with the reasoning service’s sentence as its text', async () => {
    const { notifier } = fakeNotifier();
    const list = jest.fn(async () => [RIPE, { ...RIPE, zoneId: 'weak', score: 40 }]);

    await render(
      <AlertNotifications notifier={notifier} now={NOW} onOpenZone={jest.fn()} source={{ list }} />,
    );

    await waitFor(() => expect(notifier.show).toHaveBeenCalledTimes(1));
    expect(notifier.show).toHaveBeenCalledWith({
      title: 'Berry alert: Bilberry',
      body: RIPE.sentence,
      data: {
        ruleId: 'ripe_nearby',
        species: 'bilberry',
        zoneId: RIPE.zoneId,
        score: '82',
        confidence: 'medium',
      },
    });
    await waitFor(async () =>
      expect(await readNotifiedAlerts()).toEqual({
        [`${RIPE.zoneId}:bilberry`]: '2026-08-15T09:00:00.000Z',
      }),
    );
  });

  it('does not show an alert it already showed', async () => {
    await AsyncStorage.setItem(
      'picky.notified-alerts.v1',
      JSON.stringify({ [`${RIPE.zoneId}:bilberry`]: '2026-08-15T07:00:00.000Z' }),
    );
    const { notifier } = fakeNotifier();
    const list = jest.fn(async () => [RIPE]);

    await render(
      <AlertNotifications notifier={notifier} now={NOW} onOpenZone={jest.fn()} source={{ list }} />,
    );

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(notifier.show).not.toHaveBeenCalled();
  });

  it('reads nothing while the platform does not allow notifications', async () => {
    const { notifier } = fakeNotifier({ allowed: false });
    const list = jest.fn(async () => [RIPE]);

    await render(
      <AlertNotifications notifier={notifier} now={NOW} onOpenZone={jest.fn()} source={{ list }} />,
    );

    await waitFor(() => expect(notifier.canNotify).toHaveBeenCalled());
    expect(list).not.toHaveBeenCalled();
    expect(notifier.show).not.toHaveBeenCalled();
  });

  it('opens the zone a tapped notification names, for its berry', async () => {
    const { notifier, tap } = fakeNotifier({ allowed: false });
    const onOpenZone = jest.fn();

    await render(
      <AlertNotifications
        notifier={notifier}
        now={NOW}
        onOpenZone={onOpenZone}
        source={{ list: jest.fn(async () => []) }}
      />,
    );

    tap({ zoneId: RIPE.zoneId, species: 'lingonberry', score: '82' });
    expect(onOpenZone).toHaveBeenCalledWith(RIPE.zoneId, 'lingonberry');

    tap({ species: 'bilberry' });
    expect(onOpenZone).toHaveBeenCalledTimes(1);
  });
});
