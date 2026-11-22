import { fireEvent, render, screen } from '@testing-library/react-native';

import { useDevicePosition } from '@/hooks/use-device-position';
import { QueryProvider } from '@/services/query-client';

import { liveZoneSource } from '../../test-fixtures';
import { RouteToZoneScreen } from '../route-to-zone-screen';

jest.mock('@/hooks/use-device-position', () => ({ useDevicePosition: jest.fn() }));

const position = jest.mocked(useDevicePosition);
// About 1.4 km south of the test zone's middle.
const FIX = { latitude: 62.2422, longitude: 25.6964, accuracyMeters: 10, at: 0 };

function renderRoute(props: Partial<Parameters<typeof RouteToZoneScreen>[0]> = {}) {
  return render(<RouteToZoneScreen zoneId="zone-a" zoneSource={liveZoneSource()} {...props} />, {
    wrapper: QueryProvider,
  });
}

beforeEach(() => {
  position.mockReturnValue({ fix: FIX, status: 'tracking' });
});

describe('RouteToZoneScreen', () => {
  it('leads to the zone the picker opened, measured from the phone', async () => {
    await renderRoute();

    expect(await screen.findByText('To Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByTestId('route-distance')).toHaveTextContent('1.4 km');
    expect(screen.getByText('Straight-line distance')).toBeOnTheScreen();
    expect(screen.getByText('21 min')).toBeOnTheScreen();
    expect(screen.getByTestId('route-heading')).toHaveTextContent(
      'North, 1.4 km as the crow flies',
    );
  });

  it('says it needs the position instead of guessing a distance', async () => {
    position.mockReturnValue({ fix: null, status: 'off' });

    await renderRoute();

    expect(await screen.findByTestId('route-no-position')).toHaveTextContent(
      'Allow location to see how far the zone is from you.',
    );
    expect(screen.queryByTestId('route-distance')).not.toBeOnTheScreen();
  });

  it('opens walking directions to the zone’s middle in the maps app', async () => {
    const openUrl = jest.fn().mockResolvedValue(undefined);

    await renderRoute({ openUrl });
    await fireEvent.press(await screen.findByRole('button', { name: 'Directions in Maps' }));

    expect(openUrl).toHaveBeenCalledWith(
      expect.stringMatching(
        /^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&travelmode=walking&destination=62\.25/,
      ),
    );
  });

  it('starts the walk and cancels the route', async () => {
    const onStart = jest.fn();
    const onCancel = jest.fn();

    await renderRoute({ onCancel, onStart });
    await fireEvent.press(await screen.findByRole('button', { name: 'Start walking' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel route' }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('says so when no zone was named, and still lets the picker leave', async () => {
    const onCancel = jest.fn();

    await renderRoute({ onCancel, zoneId: undefined });

    expect(
      await screen.findByText('This zone is not among the pilot zones this phone can read.'),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel route' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
