import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';

import { ActiveVisitScreen } from '../active-visit-screen';

/**
 * Frame 09 as the app can be true about it today (node `5:23185`): the arrival note, the same
 * map at its third height, the timer card, the frame's privacy promise and its two actions.
 *
 * The timer is the one part that moves, so it is driven through the same fake clock the
 * production code reads: at the moment the frame was drawn, the reading is the frame's own
 * 00:42:17 and the picker arrived at 10:03. The visit being timed is the design's sample, so
 * the header carries the “SEASON DEMO” disclosure frames 06 and 11 use.
 */

const startedAtMs = new Date(2026, 7, 28, 10, 3, 0).getTime();
const FRAME_ELAPSED_MS = 42 * 60_000 + 17_000;

/** Starts the clock at the moment the frame draws, so every reading below is the frame's own. */
function useFrameClock() {
  jest.useFakeTimers();
  jest.setSystemTime(startedAtMs + FRAME_ELAPSED_MS);
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

  it('renders the frame’s header, its arrival note and the time it names', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    expect(screen.getByText('CORE PICKER · VISIT IN PROGRESS · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('Picking in Zone 14')).toBeOnTheScreen();
    expect(screen.getByText('Arrival detected automatically')).toBeOnTheScreen();
    // The frame's own 10:03 (node 5:23203), read back off the timer's start instant. The line's
    // second sentence is the app's own limit — the frame promised the background, which the app
    // does not do (ADR-045, ADR-047).
    expect(
      screen.getByText('You entered the zone at 10:03. Timing runs while the app is open.'),
    ).toBeOnTheScreen();
  });

  it('draws the same map as frames 06 and 08 at frame 09’s own height, without a route', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    expect(screen.getByTestId('zone-map')).toHaveStyle({ height: layout.visitMapHeight });
    expect(layout.visitMapHeight).toBe(210);
    // The walking route belongs to screen 08; a visit is not about getting there.
    expect(screen.queryByTestId('zone-map-route')).not.toBeOnTheScreen();
  });

  it('prints the frame’s own reading, at the frame’s own type metrics', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    // One reading, announced as one reading — and painted in three parts so the largest
    // system text size has something its card can hold (see `VisitReading`).
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
    expect(screen.getByText('ACTIVE · LINGONBERRY')).toBeOnTheScreen();
    expect(screen.getByText('Time in zone · no signal needed')).toBeOnTheScreen();
  });

  it('counts the visit up while it is running', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    await advance(1_000);
    expect(screen.getByLabelText('00:42:18')).toBeOnTheScreen();

    await advance(59 * 60_000);
    expect(screen.getByLabelText('01:41:18')).toBeOnTheScreen();
  });

  it('holds the timer when the visit is paused, and does not count the pause', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    await fireEvent.press(screen.getByRole('button', { name: 'Pause visit' }));
    await advance(10 * 60_000);

    // Ten minutes of paused time, and the reading is the frame's own: a pause is not time in
    // the zone (the visit policy counts dwell, not wall clock).
    expect(screen.getByLabelText('00:42:17')).toBeOnTheScreen();
    // The action now offers the way back out of the pause, so it never claims to pause a timer
    // that is already held.
    expect(screen.getByRole('button', { name: 'Resume visit' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Resume visit' }));
    await advance(2_000);

    expect(screen.getByLabelText('00:42:19')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Pause visit' })).toBeOnTheScreen();
  });

  it('keeps the frame’s promise that the track is private, and its own caveat', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    expect(
      screen.getByText(
        'Only you can see your track. Others see zone status, never your exact GPS trail.',
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Leaving the mapped area ends the visit automatically and prompts your quick report.',
      ),
    ).toBeOnTheScreen();
  });

  it('offers “End visit” only when the route can open the report behind it', async () => {
    useFrameClock();

    const { rerender } = await render(<ActiveVisitScreen />);
    expect(screen.queryByRole('button', { name: 'End visit' })).not.toBeOnTheScreen();

    const onEnd = jest.fn();
    await rerender(<ActiveVisitScreen onEnd={onEnd} />);
    await fireEvent.press(screen.getByRole('button', { name: 'End visit' }));

    // The feature imports no router: it reports the press and the route decides where it goes.
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('leaves the card the frame’s own inset, gap and radius, with its lines centred', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    // 20 px on all four sides, its three lines 6 px apart, and that is exactly the frame's
    // 150 px card (20 + 17 + 6 + 63 + 6 + 18 + 20, node 5:23224).
    expect(screen.getByTestId('visit-timer-card')).toHaveStyle({
      borderRadius: radii.lg,
      gap: spacing.setting,
      padding: spacing.cardInset,
    });
    expect(spacing.cardInset).toBe(20);
    expect(spacing.setting).toBe(6);
    // Centred by the text rather than by the card, so a long label wraps inside it instead of
    // widening its box (see the screen's `centred` style).
    expect(screen.getByText('ACTIVE · LINGONBERRY')).toHaveStyle({ textAlign: 'center' });
    expect(screen.getByText('Time in zone · no signal needed')).toHaveStyle({
      textAlign: 'center',
    });
  });

  it('offers the frame’s back control only when there is somewhere to go back to', async () => {
    useFrameClock();

    const onBack = jest.fn();
    const { rerender } = await render(<ActiveVisitScreen onBack={onBack} />);

    expect(screen.getByRole('button', { name: 'Back' })).toBeOnTheScreen();

    await rerender(<ActiveVisitScreen />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('keeps the demo arrival fixed, so the static page and the phone agree', async () => {
    // The line used to be the timer's start read back as a wall clock, computed at render: the
    // static export printed the build's time and the phone printed the load's, which is a
    // hydration mismatch as well as a false detection (frontend review, 2026-10-25).
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2027, 0, 1, 18, 0, 0));

    await render(<ActiveVisitScreen />);

    expect(
      screen.getByText('You entered the zone at 10:03. Timing runs while the app is open.'),
    ).toBeOnTheScreen();
  });

  it('paints the arrival note in the frame’s success tint', async () => {
    useFrameClock();

    await render(<ActiveVisitScreen />);

    expect(screen.getByTestId('visit-arrival-note')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
    });
  });
});
