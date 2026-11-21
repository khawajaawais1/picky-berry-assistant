import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { spacing, typography } from '@/constants/theme';

import { ActiveVisitScreen } from '../active-visit-screen';

/**
 * Screen 09 as it reads the tracker: a running visit, an arrival that has not met the visit
 * policy's dwell yet, and the honest state when neither exists. The timer is the one part that
 * moves, so it is driven through the same fake clock the production code reads.
 */
const NOW = new Date(2026, 7, 28, 10, 45, 17).getTime();
const OPENED_AT = NOW - (42 * 60_000 + 17_000);
const ZONE = 'Laajavuori 1';
const VISIT = {
  endedAt: null,
  openedAt: OPENED_AT,
  visitId: 'visit-1',
  zoneId: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
  zoneName: ZONE,
};

function useFixedClock() {
  jest.useFakeTimers();
  jest.setSystemTime(NOW);
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('ActiveVisitScreen', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('says no visit is running when the tracker has no visit and no candidate', async () => {
    await render(<ActiveVisitScreen />);

    expect(screen.getByText('CORE PICKER · ACTIVE VISIT')).toBeOnTheScreen();
    expect(screen.getByText('No visit is running')).toBeOnTheScreen();
    expect(
      screen.getByText('A visit starts when you stay in a berry zone with the app open.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('visit-timer')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'End visit' })).not.toBeOnTheScreen();
  });

  it('draws an arrival that has not met the dwell minimum without calling it a visit', async () => {
    useFixedClock();

    await render(
      <ActiveVisitScreen candidate={{ enteredAt: OPENED_AT, zoneId: 'zone-1', zoneName: ZONE }} />,
    );

    expect(screen.getByText('Arriving in Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('Arrival noted')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'You entered the zone at 10:03. The visit starts once you have stayed a little longer.',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('ARRIVING · VISIT NOT STARTED')).toBeOnTheScreen();
    expect(screen.getByLabelText('00:42:17')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'End visit' })).not.toBeOnTheScreen();
  });

  it('draws the running visit from the app’s own reading', async () => {
    useFixedClock();

    await render(<ActiveVisitScreen visit={VISIT} />);

    expect(screen.getByText('CORE PICKER · VISIT IN PROGRESS')).toBeOnTheScreen();
    expect(screen.getByText('Picking in Zone Laajavuori 1')).toBeOnTheScreen();
    expect(screen.getByText('Arrival noted')).toBeOnTheScreen();
    expect(
      screen.getByText('You entered the zone at 10:03. Timing runs while the app is open.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('ACTIVE VISIT')).toBeOnTheScreen();
    expect(screen.getByText('Time in zone · no signal needed')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Only you can see your track. Others see zone status, never your exact GPS trail.',
      ),
    ).toBeOnTheScreen();
    // The map and the pause action belong to the design's sample, not to a tracked visit.
    expect(screen.queryByTestId('zone-map')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pause visit' })).not.toBeOnTheScreen();
  });

  it('prints one elapsed reading, at the frame’s type metrics', async () => {
    useFixedClock();

    await render(<ActiveVisitScreen visit={VISIT} />);

    expect(screen.getByLabelText('00:42:17')).toBeOnTheScreen();
    expect(screen.getByTestId('visit-timer').props.accessibilityRole).toBe('text');
    expect(screen.getByText('00')).toBeOnTheScreen();
    expect(screen.getByText(':42')).toBeOnTheScreen();
    expect(screen.getByText(':17')).toBeOnTheScreen();
    expect(screen.getByText(':42')).toHaveStyle({
      fontSize: typography.timer.fontSize,
      lineHeight: typography.timer.lineHeight,
      fontWeight: typography.timer.fontWeight,
    });
  });

  it('counts the visit up while it is running', async () => {
    useFixedClock();

    await render(<ActiveVisitScreen visit={VISIT} />);

    await advance(1_000);
    expect(screen.getByLabelText('00:42:18')).toBeOnTheScreen();

    await advance(59 * 60_000);
    expect(screen.getByLabelText('01:41:18')).toBeOnTheScreen();
  });

  it('offers “End visit” only when the route can end it', async () => {
    useFixedClock();
    const onEnd = jest.fn();

    const { rerender } = await render(<ActiveVisitScreen visit={VISIT} />);
    expect(screen.queryByRole('button', { name: 'End visit' })).not.toBeOnTheScreen();

    await rerender(<ActiveVisitScreen onEnd={onEnd} visit={VISIT} />);
    await fireEvent.press(screen.getByRole('button', { name: 'End visit' }));

    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('keeps the timer card’s frame metrics', async () => {
    useFixedClock();

    await render(<ActiveVisitScreen visit={VISIT} />);

    expect(screen.getByTestId('visit-timer-card')).toHaveStyle({
      gap: spacing.setting,
      padding: spacing.cardInset,
    });
  });

  it('offers the back control only when there is somewhere to go back to', async () => {
    useFixedClock();
    const onBack = jest.fn();
    const { rerender } = await render(<ActiveVisitScreen onBack={onBack} visit={VISIT} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    await rerender(<ActiveVisitScreen visit={VISIT} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });
});
