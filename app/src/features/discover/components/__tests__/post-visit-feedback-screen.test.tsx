import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, themes, typography } from '@/constants/theme';

import { PostVisitFeedbackScreen } from '../post-visit-feedback-screen';

/** The tracked visit the report describes: the real zone, and a window the fake clock can hold. */
const VISIT = {
  endedAt: new Date(2026, 7, 28, 10, 55).getTime(),
  openedAt: new Date(2026, 7, 28, 10, 3).getTime(),
  visitId: 'visit-1',
  zoneId: 'zone-laajavuori-1',
  zoneName: 'Laajavuori 1',
};

/**
 * Frame 10 as the app can be true about it today (node `5:23259`): the exit summary, the
 * species row and the third chip that reveals the rest of the vocabulary, the five-cell rating
 * it draws with “Good” chosen, the optional harvest field, the offline note and the frame's two
 * ways on.
 *
 * One part of the frame is deliberately absent and asserted as absent: “Add a berry photo” (the
 * owner deferred the image picker on 2026-10-09).
 *
 * The summary describes the visit handed to the screen, so the header carries no demo
 * disclosure: the zone, its window and its length are the tracker's own values.
 */
describe('PostVisitFeedbackScreen', () => {
  it('renders the frame’s header and the visit it reports on', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

    expect(screen.getByText('CORE PICKER · QUICK REPORT')).toBeOnTheScreen();
    expect(screen.getByText('How was the picking?')).toBeOnTheScreen();
    expect(screen.getByText('Visit complete')).toBeOnTheScreen();
    // The frame's own summary line (node 5:23277), with the duration read off the visit.
    expect(screen.getByText('Zone Laajavuori 1 · 10:03–10:55 · 52 min')).toBeOnTheScreen();
  });

  it('says no visit can be reported when none has ended', async () => {
    await render(<PostVisitFeedbackScreen />);

    expect(screen.getByText('CORE PICKER · QUICK REPORT')).toBeOnTheScreen();
    expect(screen.getByTestId('report-empty')).toBeOnTheScreen();
    expect(screen.getByText('No visit to report')).toBeOnTheScreen();
    expect(screen.getByText('A report starts when a tracked visit ends.')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Save report offline' })).not.toBeOnTheScreen();
  });

  it('keeps the frame’s promise and its own caveat in the same voice', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

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
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

    expect(screen.getByTestId('report-offline-note')).toHaveStyle({
      backgroundColor: themes.light.colors.warningMuted,
    });
    expect(screen.getByTestId('report-exit-note')).toHaveStyle({
      backgroundColor: themes.light.colors.successMuted,
    });
  });

  it('offers the two species the design names, and starts on the first', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

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

  it('reveals the rest of the species vocabulary, and closes again from the same chip', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

    // The chip says what the frame says, and names the action for assistive technology.
    const more = screen.getByRole('button', { name: 'Show all species' });
    expect(more).toHaveTextContent('More');
    expect(more.props.accessibilityState).toMatchObject({ expanded: false });

    await fireEvent.press(more);

    // The third berry the app can name, which frame 06's filter chips also offer.
    expect(
      screen.getByRole('radio', { name: 'Cloudberry' }).props.accessibilityState,
    ).toMatchObject({ checked: false });
    // The pilot's fourth berry is behind the same chip: the app can report on it too.
    expect(screen.getByRole('radio', { name: 'Crowberry' }).props.accessibilityState).toMatchObject(
      { checked: false },
    );
    expect(screen.getByRole('radio', { name: 'Lingonberry' })).toBeOnTheScreen();

    // The disclosure stays mounted and becomes the control that closes what it opened; a chip
    // that unmounts itself can never report `expanded: true` and drops web focus with it
    // (frontend review, 2026-10-25).
    const fewer = screen.getByRole('button', { name: 'Show fewer species' });
    expect(fewer).toHaveTextContent('Fewer');
    expect(fewer.props.accessibilityState).toMatchObject({ expanded: true });

    await fireEvent.press(fewer);

    expect(screen.queryByRole('radio', { name: 'Crowberry' })).not.toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Show all species' })).toHaveTextContent('More');
  });

  it('keeps the chosen berry on the row when the disclosure closes', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Show all species' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Cloudberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Show fewer species' }));

    // Collapsing may not hide the answer the row is carrying.
    expect(screen.getByRole('radio', { name: 'Cloudberry' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'Crowberry' })).not.toBeOnTheScreen();
  });

  it('reports the species the picker revealed', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(<PostVisitFeedbackScreen visit={VISIT} onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Show all species' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Cloudberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ speciesId: 'cloudberry' }));
  });

  it('does not draw the frame’s photo row', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

    // Evidence media is the owner's deferred decision (PROJECT.md); the frame's row would claim
    // an action the app cannot take.
    expect(screen.queryByText('Add a berry photo')).not.toBeOnTheScreen();
  });

  it('lets the picker choose the species the report is about', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);

    await render(<PostVisitFeedbackScreen visit={VISIT} onSave={onSave} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Bilberry' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ speciesId: 'bilberry' }));
  });

  it('draws the frame’s five rating options, with “Good” chosen', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

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
    await render(<PostVisitFeedbackScreen visit={VISIT} />);

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

    await render(<PostVisitFeedbackScreen visit={VISIT} onSave={onSave} />);
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
      zoneId: 'zone-laajavuori-1',
      visitId: 'visit-1',
      zoneName: 'Laajavuori 1',
    });
  });

  it('says so when the report could not be kept, rather than claiming it was', async () => {
    const onSave = jest.fn().mockRejectedValue(new Error('device storage is full'));

    await render(<PostVisitFeedbackScreen visit={VISIT} onSave={onSave} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Save report offline' }));

    expect(screen.getByText('Your report could not be saved.')).toBeOnTheScreen();
  });

  it('offers the frame’s two ways on only when the route can take them', async () => {
    const { rerender } = await render(<PostVisitFeedbackScreen visit={VISIT} />);

    expect(screen.queryByRole('button', { name: 'Save report offline' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Skip report for now' })).not.toBeOnTheScreen();

    const onSkip = jest.fn();
    await rerender(<PostVisitFeedbackScreen visit={VISIT} onSkip={onSkip} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Skip report for now' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('does not offer the frame’s photo row while the app has no image picker', async () => {
    await render(<PostVisitFeedbackScreen visit={VISIT} onSave={jest.fn()} />);

    // Evidence media needs the picker, the camera permission and its own rules; the owner
    // deferred it, so the row is not drawn rather than drawn and inert (PROJECT.md).
    expect(screen.queryByText('Add a berry photo')).not.toBeOnTheScreen();
    expect(screen.queryByText('Optional · helps check ripeness')).not.toBeOnTheScreen();
  });
});
