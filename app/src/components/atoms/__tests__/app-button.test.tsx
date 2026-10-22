import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { layout, radii, themes } from '@/constants/theme';

import { AppButton } from '../app-button';

describe('AppButton', () => {
  it('renders its label', async () => {
    await render(<AppButton label="Save" onPress={() => {}} />);

    expect(screen.getByText('Save')).toBeOnTheScreen();
  });

  it('exposes the button role with an accessible name', async () => {
    await render(<AppButton label="Save" onPress={() => {}} />);

    expect(screen.getByRole('button', { name: 'Save' })).toBeOnTheScreen();
  });

  it('lets the accessible name say more than the one-line label', async () => {
    await render(
      <AppButton accessibilityLabel="Contact Matti Laine" label="Contact" onPress={() => {}} />,
    );

    // The design's half-width action holds a short word; whom the action reaches belongs in the
    // name a screen reader hears, not in a label that would wrap to two lines.
    expect(screen.getByRole('button', { name: 'Contact Matti Laine' })).toBeOnTheScreen();
    expect(screen.getByText('Contact')).toBeOnTheScreen();
  });

  it('invokes onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Save" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('forwards press-in and press-out, and dims while the action is held', async () => {
    // The press feedback is the action's own contract: a caller that needs the touch-down
    // (the screen 10 save, which starts a timer for its in-flight reading) gets it from here,
    // and the opacity is what tells a sighted reader the press landed.
    const onPressIn = jest.fn();
    const onPressOut = jest.fn();
    await render(
      <AppButton label="Save" onPress={() => {}} onPressIn={onPressIn} onPressOut={onPressOut} />,
    );

    const button = screen.getByRole('button', { name: 'Save' });

    await fireEvent(button, 'pressIn');
    expect(onPressIn).toHaveBeenCalledTimes(1);
    expect(button).toHaveStyle({ opacity: 0.85 });

    await fireEvent(button, 'pressOut');
    expect(onPressOut).toHaveBeenCalledTimes(1);
    expect(button).toHaveStyle({ opacity: 1 });
  });

  it('reports a disabled state and ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Save" disabled onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('uses the design’s action metrics: 54 px tall, 10 px radius, accent fill', async () => {
    await render(<AppButton label="Save" onPress={() => {}} />);

    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({
      // A floor rather than a fixed box: at the largest system text size a long label
      // wraps, and the action has to grow around it (ADR-019 — found by measuring the
      // frame's own “Continue to location settings” on screen 05).
      minHeight: layout.actionHeight,
      borderRadius: radii.control,
      backgroundColor: themes.light.colors.accent,
    });
  });

  it('lets a long label wrap instead of running out of the action', async () => {
    await render(<AppButton label="Continue to location settings" onPress={() => {}} />);

    // The action is a row, and a row does not shrink its children by default: without
    // this the label would keep its own width and be cut off by the action's edges.
    expect(screen.getByText('Continue to location settings')).toHaveStyle({ flexShrink: 1 });
  });

  it('renders a leading icon before the label when given one', async () => {
    await render(
      <AppButton
        label="Get started"
        icon={<Text testID="leading-icon">→</Text>}
        onPress={() => {}}
      />,
    );

    expect(screen.getByTestId('leading-icon')).toBeOnTheScreen();
  });

  it('reports a busy state and blocks interaction while busy', async () => {
    const onPress = jest.fn();
    await render(<AppButton label="Save" busy onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    // The label is replaced by a progress indicator while the action runs.
    expect(screen.queryByText('Save')).not.toBeOnTheScreen();

    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('keeps the progress drawing out of the accessibility tree', async () => {
    // Found by the in-flight reading of screen 10, and fixed with the busy state above: the spinner
    // the label is replaced by is `ActivityIndicator`, which a browser announces as an image with
    // no name. The action's busy state is the content; the drawing is decoration (the answer
    // screen 13's code cells take). Read off the tree, since a child element carries no query of
    // its own (`zone-map`'s tests read the drawing the same way).
    const busy = await render(<AppButton label="Save" busy onPress={() => {}} />);
    expect(JSON.stringify(busy.toJSON())).toContain('"aria-hidden":true');

    const settled = await render(<AppButton label="Save" onPress={() => {}} />);
    expect(JSON.stringify(settled.toJSON())).not.toContain('aria-hidden');
  });

  it('claims no role, no name and no tab stop when its caller gave it no handler', async () => {
    // The rule every other primitive follows (AGENTS.md §11.2, known issue 34): an action that
    // cannot act is the design's drawing of one — it claims no role and offers no name, exactly as
    // `TextAction` does without a handler. The one caller shape that can reach this is a screen
    // drawing the frame's action where the app has nothing to open.
    await render(<AppButton label="Save zone" testID="inert-action" />);

    expect(screen.queryByRole('button', { name: 'Save zone' })).not.toBeOnTheScreen();
    expect(screen.getByText('Save zone')).toBeOnTheScreen();

    const drawn = screen.getByTestId('inert-action');
    // `react-native-web` gives every `Pressable` `tabIndex = disabled ? -1 : 0`, so without this
    // the drawing would still be a keyboard stop that leads nowhere — the defect the
    // accessibility-tree walk found on frame 15's count line.
    expect(drawn.props.tabIndex).toBe(-1);
    // The state is not asserted here: `Pressable` normalises `accessibilityState` onto the host
    // element whether or not one was passed, so the honest reading of “declares nothing” is the
    // role and the name above. What a state reaches a browser as is the walk's reading.
  });

  it('still announces itself while a handler is there and the action cannot act', async () => {
    // The other half of the rule, and the half a fix must not break: an action that is waiting on a
    // state is still an action, so it keeps its role, its name and a `disabled` state for a screen
    // reader (screen 03's verify action, the marketplace bookmark while the record is read).
    await render(<AppButton disabled label="Save zone" onPress={() => {}} />);

    const button = screen.getByRole('button', { name: 'Save zone' });
    expect(button).toBeDisabled();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });
  });
});
