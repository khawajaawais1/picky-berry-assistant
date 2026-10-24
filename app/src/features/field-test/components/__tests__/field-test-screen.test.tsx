import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { useDevicePosition } from '@/hooks/use-device-position';
import { shareText } from '@/services/share-text';

import { FieldTestScreen } from '../field-test-screen';

jest.mock('expo-keep-awake', () => ({ useKeepAwake: jest.fn() }));

jest.mock('expo-battery', () => ({
  BatteryState: { CHARGING: 2, FULL: 3, NOT_CHARGING: 4, UNKNOWN: 0, UNPLUGGED: 1 },
  getPowerStateAsync: jest.fn(),
}));

jest.mock('@/hooks/use-device-position', () => ({ useDevicePosition: jest.fn() }));

jest.mock('@/services/share-text', () => ({ shareText: jest.fn() }));

const position = jest.mocked(useDevicePosition);
const share = jest.mocked(shareText);
const NOW = 1_700_000_000_000;

const reading = {
  level: 0.8,
  lowPowerMode: false,
  power: 'battery' as const,
};

function fix(at: number): {
  accuracyMeters: number;
  at: number;
  latitude: number;
  longitude: number;
} {
  return { accuracyMeters: 9, at, latitude: 62.240123, longitude: 25.760456 };
}

describe('the location field test', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(NOW);
    position.mockReturnValue({ fix: null, status: 'tracking' });
    share.mockResolvedValue('shared');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('starts the real watch, counts a fix and keeps the coordinate out of the screen', async () => {
    await render(<FieldTestScreen readBattery={jest.fn().mockResolvedValue(reading)} />);

    await fireEvent.press(screen.getByTestId('field-test-start-watch'));
    await screen.findByText('Watch run in progress');

    const onFix = position.mock.calls.at(-1)?.[0]?.onFix;
    expect(onFix).toBeDefined();

    await act(async () => {
      onFix?.(fix(NOW + 10_000));
    });
    expect(screen.getByTestId('field-test-fixes').props.children).toBe('1');
    expect(screen.queryByText(/62\.24/)).toBeNull();
    expect(screen.queryByText(/25\.76/)).toBeNull();
  });

  it('stops the watch, reads the end battery and offers a shareable summary', async () => {
    await render(<FieldTestScreen readBattery={jest.fn().mockResolvedValue(reading)} />);

    await fireEvent.press(screen.getByTestId('field-test-start-watch'));
    await screen.findByText('Watch run in progress');

    const onFix = position.mock.calls.at(-1)?.[0]?.onFix;
    await act(async () => {
      onFix?.(fix(NOW + 10_000));
    });

    await fireEvent.press(screen.getByTestId('field-test-stop'));

    await screen.findByTestId('field-test-summary');
    expect(screen.getByTestId('field-test-summary-text').props.children).toContain(
      'Location watch field test — watch run',
    );

    await fireEvent.press(screen.getByTestId('field-test-share'));
    await screen.findByText('The summary was handed to the share sheet.');
    expect(share).toHaveBeenCalledWith(expect.stringContaining('Fixes: 1'), expect.any(String));
  });

  it('runs a control without mounting the watch or inventing watch readings', async () => {
    await render(<FieldTestScreen readBattery={jest.fn().mockResolvedValue(reading)} />);

    await fireEvent.press(screen.getByTestId('field-test-start-control'));
    await screen.findByText('Control run in progress');

    expect(position).not.toHaveBeenCalled();
    expect(screen.getByTestId('field-test-fixes').props.children).toBe('—');

    await fireEvent.press(screen.getByTestId('field-test-stop'));
    await screen.findByTestId('field-test-summary');
    expect(screen.getByTestId('field-test-summary-text').props.children).toContain(
      'control run (watch off)',
    );
  });

  it('refuses to start a battery measurement while the phone is plugged in', async () => {
    await render(
      <FieldTestScreen
        readBattery={jest.fn().mockResolvedValue({ ...reading, power: 'external' })}
      />,
    );

    await fireEvent.press(screen.getByTestId('field-test-start-watch'));

    expect(
      await screen.findByText('The phone is plugged in. Unplug it and start again.'),
    ).toBeVisible();
    expect(screen.queryByText('Watch run in progress')).toBeNull();
    expect(position).not.toHaveBeenCalled();
  });

  it('refuses Low Power Mode, which changes the cadence being measured', async () => {
    await render(
      <FieldTestScreen
        readBattery={jest.fn().mockResolvedValue({ ...reading, lowPowerMode: true })}
      />,
    );

    await fireEvent.press(screen.getByTestId('field-test-start-control'));

    expect(
      await screen.findByText('Low Power Mode is on. Turn it off and start again.'),
    ).toBeVisible();
    expect(screen.queryByText('Control run in progress')).toBeNull();
  });

  it('says a battery half is invalid when the phone is plugged in during a run', async () => {
    const readBattery = jest
      .fn()
      .mockResolvedValueOnce(reading)
      .mockResolvedValue({ ...reading, power: 'external' });

    await render(<FieldTestScreen readBattery={readBattery} />);

    await fireEvent.press(screen.getByTestId('field-test-start-watch'));
    await screen.findByText('Watch run in progress');

    // The first poll after mount is the second read and answers “external”.
    await waitFor(() =>
      expect(
        screen.getByText(/Battery cost is not valid for this run: the phone was plugged in/),
      ).toBeVisible(),
    );
  });
});
