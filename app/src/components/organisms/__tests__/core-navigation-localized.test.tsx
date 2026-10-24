import { render, screen } from '@testing-library/react-native';

/**
 * A device set to Finnish. The bar is on every screen of the app's shell, so its four labels are
 * the copy a user reads most often — and the frames name them in English only. What this holds
 * them to is the same thing every other screen's copy test does: the words come from the
 * catalogue, so the bar cannot ship in one language.
 */
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
  useLocales: () => [{ languageCode: 'fi', languageTag: 'fi-FI' }],
}));

// eslint-disable-next-line import/first
import { CORE_NAV_KEYS, CoreNavigation } from '../core-navigation';

describe('the core navigation on a Finnish device', () => {
  it('names all four destinations, and the bar itself, in Finnish', async () => {
    await render(<CoreNavigation activeKey="discover" onSelect={() => {}} />);

    expect(screen.getByLabelText('Päävalikko')).toBeOnTheScreen();
    expect(screen.getByRole('tab', { name: 'Löydä', selected: true })).toBeOnTheScreen();
    expect(screen.getByText('Käynnit')).toBeOnTheScreen();
    expect(screen.getByText('Hälytykset')).toBeOnTheScreen();
    expect(screen.getByText('Profiili')).toBeOnTheScreen();

    for (const label of ['Discover', 'Visits', 'Alerts', 'Profile', 'Main navigation']) {
      expect(screen.queryByText(label)).not.toBeOnTheScreen();
      expect(screen.queryByLabelText(label)).not.toBeOnTheScreen();
    }
  });

  it('translates every destination it draws, so none falls back to the source language', async () => {
    await render(<CoreNavigation activeKey="profile" onSelect={() => {}} />);

    // One tab per key in the set the component declares: a destination added without a
    // translation would leave the count below short.
    expect(CORE_NAV_KEYS).toHaveLength(screen.getAllByRole('tab').length);
  });
});
