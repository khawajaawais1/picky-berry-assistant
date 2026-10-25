import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { enqueueReport } from '@/services/report-queue';

import { useReportQueue } from '../use-report-queue';

/**
 * What screen 11 reads: the reports this device is holding.
 *
 * The hook's job is the two things a screen cannot guess — whether the queue is still being read,
 * and whether the device refused to let it be read at all.
 */
const REPORT = {
  amountText: '1.3 kg',
  minutes: 52,
  recordedAt: '2026-08-28T10:55:00.000Z',
  speciesId: 'lingonberry',
  yieldRating: 4,
  zoneId: 'Z14',
} as const;

function Probe() {
  const { error, loading, reports } = useReportQueue();

  return (
    <>
      <Text>{loading ? 'reading' : 'read'}</Text>
      <Text>{error ? 'failed' : 'ok'}</Text>
      <Text>{`queued: ${reports.length}`}</Text>
    </>
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useReportQueue', () => {
  it('reads the queue and says what is in it', async () => {
    await enqueueReport(REPORT);

    await render(<Probe />);

    expect(await screen.findByText('queued: 1')).toBeOnTheScreen();
    expect(screen.getByText('read')).toBeOnTheScreen();
    expect(screen.getByText('ok')).toBeOnTheScreen();
  });

  it('says so when the device will not let the queue be read, rather than calling it empty', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('device storage is unreadable'));

    await render(<Probe />);

    expect(await screen.findByText('failed')).toBeOnTheScreen();
    expect(screen.getByText('read')).toBeOnTheScreen();

    jest.restoreAllMocks();
  });
});
