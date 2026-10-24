import { fireEvent, render, screen } from '@testing-library/react-native';

import { layout, radii, spacing, themes, typography } from '@/constants/theme';

import { CORE_NAV_KEYS, CoreNavigation, type CoreNavKey } from '../core-navigation';

/**
 * Frames 06–14's “Core navigation” (node `5:23012`): a 78 px bar above the device's home
 * area, a hairline along its top, four equal destinations, and the one the screen belongs
 * to drawn with a 60x32 tinted pill behind its glyph and a semibold accent label.
 *
 * The bar is the shell those nine screens live in, so what it must never do is the same
 * thing on every one of them: show two destinations as current, or claim a destination it
 * cannot reach. The second is why `onSelect` is required rather than optional.
 */
describe('CoreNavigation', () => {
  it('draws the frame’s four destinations, in the frame’s order', async () => {
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.props.accessibilityLabel)).toEqual([
      'Discover',
      'Visits',
      'Alerts',
      'Profile',
    ]);
  });

  it('exposes the bar as one tab list, so the destinations are announced as a set', async () => {
    await render(<CoreNavigation activeKey="visits" onSelect={() => {}} />);

    // The frame gives the bar no name, and a set of tabs without one is announced as four
    // unrelated destinations, so the app names it (`navigation.label`). The role is read off the
    // node rather than queried: this library's role queries do not know `tablist`, though the
    // host platform does (it is `role="tablist"` in the built web export, which the browser
    // harness checks).
    const bar = screen.getByLabelText('Main navigation');

    expect(bar.props.accessibilityRole).toBe('tablist');
  });

  it.each(CORE_NAV_KEYS)(
    'marks the tab the screen belongs to as the only current one (%s)',
    async (activeKey: CoreNavKey) => {
      await render(<CoreNavigation activeKey={activeKey} onSelect={() => {}} />);

      for (const key of CORE_NAV_KEYS) {
        const tab = screen.getByTestId(`core-navigation-item-${key}`);

        if (key === activeKey) expect(tab).toBeSelected();
        else expect(tab).not.toBeSelected();
      }
    },
  );

  it('states the current destination to the platform, and the web spelling to the web', async () => {
    // `react-native-web` writes no `aria-selected` from that state — the browser harness found the
    // built export announcing the current destination in colour alone — so the component states it
    // twice, like the consent checkbox's checked state. Only the platform half is visible here:
    // React Native folds `aria-*` into its own accessibility state before a host element exists, so
    // `e2e/accessibility.spec.ts` is where the web half is measured, in the export that ships.
    await render(<CoreNavigation activeKey="alerts" onSelect={() => {}} />);

    expect(screen.getByTestId('core-navigation-item-alerts').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(screen.getByTestId('core-navigation-item-visits').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('wraps rather than cutting a destination off at the largest text size', async () => {
    // An item is a quarter of the bar; at 200 % “Discover” is wider than that and cannot break,
    // so without wrapping the label is cut off (the harness measured exactly that).
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    expect(screen.getByTestId('core-navigation')).toHaveStyle({ flexWrap: 'wrap' });
  });

  it('reports the chosen destination to its caller, which owns the routes', async () => {
    const onSelect = jest.fn();

    await render(<CoreNavigation activeKey="discover" onSelect={onSelect} />);

    fireEvent.press(screen.getByRole('tab', { name: 'Alerts' }));

    expect(onSelect).toHaveBeenCalledWith('alerts');
  });

  it('lays the bar out as the frame draws it', async () => {
    await render(<CoreNavigation activeKey="profile" onSelect={() => {}} />);

    expect(screen.getByTestId('core-navigation')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
      borderTopColor: themes.light.colors.border,
      // The frame's hairline along the top of the bar (1 px, node 5:23012).
      borderTopWidth: 1,
      minHeight: layout.navHeight,
      paddingBottom: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      paddingTop: spacing.cardGap,
    });
  });

  it('gives every destination the frame’s item box, which is also a touch target', async () => {
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    for (const key of CORE_NAV_KEYS) {
      expect(screen.getByTestId(`core-navigation-item-${key}`)).toHaveStyle({
        minHeight: layout.navItemHeight,
      });
    }

    expect(layout.navItemHeight).toBeGreaterThanOrEqual(layout.minTouchTarget);
  });

  it('tints the current destination and leaves the others on the bar’s own surface', async () => {
    await render(<CoreNavigation activeKey="alerts" onSelect={() => {}} />);

    expect(screen.getByTestId('core-navigation-indicator-alerts')).toHaveStyle({
      backgroundColor: themes.light.colors.accentMuted,
      borderRadius: radii.pill,
      height: layout.navIndicatorHeight,
      width: layout.navIndicatorWidth,
    });

    // The frame fills an unselected indicator white on a white bar: the app leaves it
    // unpainted rather than drawing a white pill nobody can see.
    expect(screen.getByTestId('core-navigation-indicator-visits')).toHaveStyle({
      backgroundColor: 'transparent',
    });
  });

  it('sets the current destination’s label in the design’s semibold accent, the rest muted', async () => {
    await render(<CoreNavigation activeKey="visits" onSelect={() => {}} />);

    expect(screen.getByText('Visits')).toHaveStyle({
      color: themes.light.colors.accent,
      fontSize: typography.navLabel.fontSize,
      fontWeight: '600',
    });
    expect(screen.getByText('Alerts')).toHaveStyle({
      color: themes.light.colors.textMuted,
      fontSize: typography.navLabel.fontSize,
      fontWeight: '400',
    });
  });

  it('keeps the four destinations equal, so no tab is wider than the design drew it', async () => {
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    for (const key of CORE_NAV_KEYS) {
      expect(screen.getByTestId(`core-navigation-item-${key}`)).toHaveStyle({ flexGrow: 1 });
    }
  });

  it('floors a destination at a touch target, never at a share of the bar', async () => {
    // A percentage floor is the one thing that must not be here: four of them are added up
    // against the bar's own width, and a target that resolves percentages against a slightly
    // larger box than CSS does (Yoga, on the installed Android build) then has to wrap its fourth
    // destination onto a second row at the design's text size — measured on a phone whose font
    // size is at its default. The bar divides into quarters because the items grow into the space
    // they are given (`flexGrow`), so the floor only has to be the smallest a destination may get.
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    for (const key of CORE_NAV_KEYS) {
      expect(screen.getByTestId(`core-navigation-item-${key}`)).toHaveStyle({
        minWidth: layout.minTouchTarget,
      });
    }

    expect(layout.minTouchTarget).toBeGreaterThanOrEqual(44);
  });
});
