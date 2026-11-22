import { fireEvent, render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { ALERT_FEED } from '../../test-fixtures';
import { AlertsScreen } from '../alerts-screen';

function renderAlerts(props: Partial<Parameters<typeof AlertsScreen>[0]> = {}) {
  return render(<AlertsScreen alertsSource={{ list: async () => ALERT_FEED }} {...props} />, {
    wrapper: QueryProvider,
  });
}

describe('AlertsScreen', () => {
  it('draws each served alert: where, how good, how sure and how fresh', async () => {
    await renderAlerts();

    expect(await screen.findByText('Bilberry 1.8 km away')).toBeOnTheScreen();
    expect(screen.getByText('CORE PICKER · FORECAST REASONING')).toBeOnTheScreen();
    expect(screen.getByText('Alerts from the forest')).toBeOnTheScreen();
    expect(screen.getByText('71 / 100 yield')).toBeOnTheScreen();
    expect(screen.getByText('High confidence')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 22 · Latest report 28 Aug')).toBeOnTheScreen();
  });

  it('names the zone instead of a distance when the phone has no position', async () => {
    const feed = {
      ...ALERT_FEED,
      alerts: [{ ...ALERT_FEED.alerts[0]!, distanceMeters: null, latestReportAt: null }],
    };

    await renderAlerts({ alertsSource: { list: async () => feed } });

    expect(await screen.findByText('Bilberry in Laajavuori 22')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori 22 · No reports yet')).toBeOnTheScreen();
  });

  it('opens the alert’s zone for the berry it is about', async () => {
    const onOpenZone = jest.fn();
    await renderAlerts({ onOpenZone });

    await fireEvent.press(await screen.findByRole('button', { name: 'Open Laajavuori 22' }));

    expect(onOpenZone).toHaveBeenCalledWith('zone-a', 'bilberry');
  });

  it('says when there is nothing to alert about', async () => {
    await renderAlerts({ alertsSource: { list: async () => ({ radiusKm: 10, alerts: [] }) } });

    expect(await screen.findByTestId('alerts-empty')).toBeOnTheScreen();
  });

  it('says the alerts could not be read, rather than drawing none', async () => {
    await renderAlerts({ alertsSource: { list: () => Promise.reject(new Error('offline')) } });

    expect(await screen.findByText('Alerts could not be read.')).toBeOnTheScreen();
  });
});
