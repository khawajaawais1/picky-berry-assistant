import { fireEvent, render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { REASONING_ALERTS } from '../../test-fixtures';
import { AlertsScreen } from '../alerts-screen';

function renderAlerts(props: Partial<Parameters<typeof AlertsScreen>[0]> = {}) {
  return render(<AlertsScreen alertsSource={{ list: async () => REASONING_ALERTS }} {...props} />, {
    wrapper: QueryProvider,
  });
}

describe('AlertsScreen', () => {
  it('draws each served alert: where, how good, how sure, and the rule’s own sentence', async () => {
    await renderAlerts();

    expect(await screen.findByText('Bilberry in Laajavuori 22')).toBeOnTheScreen();
    expect(screen.getByText('CORE PICKER · FORECAST REASONING')).toBeOnTheScreen();
    expect(screen.getByText('Alerts from the forest')).toBeOnTheScreen();
    expect(screen.getByText('71 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(
      screen.getByText('Ripe bilberry in zone Laajavuori 22 — yield score 71, high confidence.'),
    ).toBeOnTheScreen();
  });

  it('draws the twenty best alerts only, best first', async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...REASONING_ALERTS[0]!,
      zoneId: `zone-${i}`,
      zoneName: `Zone ${i}`,
      score: i,
    }));

    await renderAlerts({ alertsSource: { list: async () => many } });

    expect(await screen.findByText('Bilberry in Zone 29')).toBeOnTheScreen();
    expect(screen.getByText('Bilberry in Zone 10')).toBeOnTheScreen();
    expect(screen.queryByText('Bilberry in Zone 9')).not.toBeOnTheScreen();
  });

  it('opens the alert’s zone for the berry it is about', async () => {
    const onOpenZone = jest.fn();
    await renderAlerts({ onOpenZone });

    await fireEvent.press(await screen.findByRole('button', { name: 'Open Laajavuori 22' }));

    expect(onOpenZone).toHaveBeenCalledWith('zone-a', 'bilberry');
  });

  it('says when there is nothing to alert about', async () => {
    await renderAlerts({ alertsSource: { list: async () => [] } });

    expect(await screen.findByTestId('alerts-empty')).toBeOnTheScreen();
  });

  it('says the alerts could not be read, rather than drawing none', async () => {
    await renderAlerts({ alertsSource: { list: () => Promise.reject(new Error('offline')) } });

    expect(await screen.findByText('Alerts could not be read.')).toBeOnTheScreen();
  });
});
