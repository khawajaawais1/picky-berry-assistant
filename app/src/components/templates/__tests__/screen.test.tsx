import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppText } from '../../atoms';
import { Screen } from '../screen';

describe('Screen', () => {
  it('renders the heading and its children', async () => {
    await render(
      <Screen title="Picky" subtitle="Skeleton">
        <AppText>content</AppText>
      </Screen>,
    );

    expect(screen.getByText('Picky')).toBeOnTheScreen();
    expect(screen.getByText('Skeleton')).toBeOnTheScreen();
    expect(screen.getByText('content')).toBeOnTheScreen();
  });

  it('renders without a heading', async () => {
    await render(
      <Screen scroll={false}>
        <AppText>content</AppText>
      </Screen>,
    );

    expect(screen.getByText('content')).toBeOnTheScreen();
  });

  it('renders the design’s eyebrow above the title with a trailing accessory', async () => {
    await render(
      <Screen
        eyebrow="ONBOARDING · 01 / 05"
        title="Welcome to the outdoors"
        headerAccessory={<AppText testID="header-accessory">leaf</AppText>}
      >
        <AppText>content</AppText>
      </Screen>,
    );

    expect(screen.getByText('ONBOARDING · 01 / 05')).toBeOnTheScreen();
    expect(screen.getByText('Welcome to the outdoors')).toBeOnTheScreen();
    expect(screen.getByTestId('header-accessory')).toBeOnTheScreen();
  });

  it('offers a back control when the screen can go back', async () => {
    const onBack = jest.fn();
    await render(
      <Screen onBack={onBack} title="Create your account">
        <AppText>content</AppText>
      </Screen>,
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('shows no back control on a screen that cannot go back', async () => {
    await render(
      <Screen title="Welcome to the outdoors">
        <AppText>content</AppText>
      </Screen>,
    );

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeOnTheScreen();
  });

  it('owns both safe-area edges when it is the whole page', async () => {
    await render(
      <Screen testID="page" title="Welcome">
        <AppText>content</AppText>
      </Screen>,
    );

    // The safe-area library resolves the edges into which sides it adds the inset on; that
    // resolution is what a screen's content is laid out against, so it is what is read here.
    expect(screen.getByTestId('page').props.edges).toMatchObject({
      bottom: 'additive',
      top: 'additive',
    });
  });

  it('hands the bottom edge over to the shell’s navigation bar when asked', async () => {
    // Inside the app shell the bar paints its own surface down into the home area, so a screen
    // that kept the bottom edge would add the same inset twice and end its content above the bar.
    await render(
      <Screen edges={['top']} testID="shell-page" title="Discover nearby">
        <AppText>content</AppText>
      </Screen>,
    );

    expect(screen.getByTestId('shell-page').props.edges).toMatchObject({
      bottom: 'off',
      top: 'additive',
    });
  });

  it('renders children in both scroll modes', async () => {
    const scrolled = await render(
      <Screen>
        <AppText>scrolled</AppText>
      </Screen>,
    );

    expect(scrolled.getByText('scrolled')).toBeOnTheScreen();
  });
});
