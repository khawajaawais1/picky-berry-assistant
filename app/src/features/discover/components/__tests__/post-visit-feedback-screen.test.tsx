import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { PostVisitFeedbackScreen } from '../post-visit-feedback-screen';

/**
 * Frame 10 as the app can be true about it today (node `5:23259`): the exit summary, the
 * species row and the third chip that reveals the rest of the vocabulary, the five-cell rating
 * it draws with “Good” chosen, the optional harvest field, the offline note and the frame's two
 * ways on.
 *
 * One part of the frame is deliberately absent and asserted as absent: “Add a berry photo” (the
 * owner deferred the image picker on 2026-10-09).
 *
 * The visit the summary describes is the design's own sample — its window and its date — so the
 * header carries the “SEASON DEMO” disclosure the season screens use. What the picker answers
 * below it is their own data and is saved on the device.
 */
describe('PostVisitFeedbackScreen', () => {
  it('renders the frame’s header and the visit it reports on', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByText('CORE PICKER · QUICK REPORT · SEASON DEMO')).toBeOnTheScreen();
    expect(screen.getByText('How was the picking?')).toBeOnTheScreen();
    expect(screen.getByText('Exit detected · visit complete')).toBeOnTheScreen();
    // The frame's own summary line (node 5:23277), with the duration read off its window.
    expect(screen.getByText('Zone 14 · 28 Aug · 10:03–10:55 · 52 min')).toBeOnTheScreen();
  });

  it('keeps the frame’s promise and its own caveat in the same voice', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByText('A small report. A fresher map.')).toBeOnTheScreen();
    expect(
      screen.getByText('Rate the berries you found, not just the amount you brought home.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Offline · ready to queue')).toBeOnTheScreen();
    expect(
      screen.getByText('Your visit and report stay on this phone and sync when you’re online.'),
    ).toBeOnTheScreen();
  });

  it('draws the offline note in the frame’s warning tint, not the success one', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByTestId('report-offline-note')).toHaveStyle({
      backgroundColor: themes.light.colors.warningMuted,
    });
    expect(screen.getByTestId('report-exit-note')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
    });
  });

  it('offers the two species the design names, and starts on the first', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByLabelText('Species of this report')).toBeOnTheScreen();
    expect(
      screen.getByRole('radio', { name: 'Lingonberry' }).props.accessibilityState,
    ).toMatchObject({ checked: true });
    expect(screen.getByRole('radio', { name: 'Bilberry' }).props.accessibilityState).toMatchObject({
      checked: false,
    });
    // The frame's third chip is not a species; the vocabulary behind it is not on the row yet.
    expect(screen.queryByRole('radio', { name: 'Cloudberry' })).not.toBeOnTheScreen();
  });

  it('reveals the rest of the species vocabulary with the frame’s third chip', async () => {
    await render(<PostVisitFeedbackScreen />);

    // The chip says what the frame says, and names the action for assistive technology.
    const more = screen.getByRole('button', { name: 'Show all species' });
    expect(more).toHaveTextContent('More');
    expect(more.props.accessibilityState).toMatchObject({ expanded: false });

    await fireEvent.press(more);

    // The third berry the app can name, which frame 06's filter chips also offer.
    expect(
      screen.getByRole('radio', { name: 'Cloudberry' }).props.accessibilityState,
    ).toMatchObject({ checked: false });
    expect(screen.getByRole('radio', { name: 'Lingonberry' })).toBeOnTheScreen();
    // Nothing is left to reveal, so the disclosure is gone rather than claiming another press.
    expect(screen.queryByRole('button', { name: 'Show all species' })).not.toBeOnTheScreen();
  });

  it('reports the species the picker revealed', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(<PostVisitFeedbackScreen onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show all species' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Cloudberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ speciesId: 'cloudberry' }));
  });

  it('does not draw the frame’s photo row', async () => {
    await render(<PostVisitFeedbackScreen />);

    // Evidence media is the owner's deferred decision (PROJECT.md); the frame's row would claim
    // an action the app cannot take.
    expect(screen.queryByText('Add a berry photo')).not.toBeOnTheScreen();
  });

  it('lets the picker choose the species the report is about', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(<PostVisitFeedbackScreen onSave={onSave} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Bilberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ speciesId: 'bilberry' }));
  });

  it('draws the frame’s five rating options, with “Good” chosen', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByText('How plentiful were the berries?')).toBeOnTheScreen();
    for (const meaning of ['None', 'Few', 'Fair', 'Good', 'Lots']) {
      expect(screen.getByRole('radio', { name: meaning })).toBeOnTheScreen();
    }

    expect(screen.getByRole('radio', { name: 'Good' }).props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByTestId('yield-rating-4')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('yield-rating-1')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
    });
  });

  it('keeps the frame’s cell metrics, as a floor the row can grow from', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByTestId('yield-rating-1')).toHaveStyle({
      minHeight: layout.ratingCellHeight,
    });
    expect(screen.getByTestId('yield-rating-1')).toHaveStyle({
      borderRadius: radii.control,
    });
    expect(typography.rating.fontSize).toBe(24);
    expect(typography.ratingLabel.fontSize).toBe(11);
  });

  it('hands the picker’s own answers to the queue, in one report', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(<PostVisitFeedbackScreen onSave={onSave} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Lots' }));
    await fireEvent.changeText(screen.getByLabelText('Harvested amount · optional'), ' 1.3 kg ');
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      amountText: '1.3 kg',
      minutes: 52,
      recordedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      speciesId: 'lingonberry',
      yieldRating: 5,
      zoneId: 'Z14',
    });
  });

  it('says so when the report could not be kept, rather than claiming it was', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('device storage is full'));

    await render(<PostVisitFeedbackScreen onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(screen.getByText('Your report could not be saved.')).toBeOnTheScreen();
  });

  it('offers the frame’s two ways on only when the route can take them', async () => {
    const { rerender } = await render(<PostVisitFeedbackScreen />);

    expect(screen.queryByRole('button', { name: 'Save report offline' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Skip report for now' })).not.toBeOnTheScreen();

    const onSkip = jest.fn();
    await rerender(<PostVisitFeedbackScreen onSkip={onSkip} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip report for now' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not offer the frame’s photo row while the app has no image picker', async () => {
    await render(<PostVisitFeedbackScreen onSave={jest.fn()} />);

    // Evidence media needs the picker, the camera permission and its own rules; the owner
    // deferred it, so the row is not drawn rather than drawn and inert (PROJECT.md).
    expect(screen.queryByText('Add a berry photo')).not.toBeOnTheScreen();
    expect(screen.queryByText('Optional · helps check ripeness')).not.toBeOnTheScreen();
  });
});
