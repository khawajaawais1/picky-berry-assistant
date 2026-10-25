import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { MarketBrowseScreen } from '../market-browse-screen';

/**
 * Frame 15 as the app can be true about it (node `5:23780`): the frame's own header and disclosure,
 * its two listing cards, its search field — and the one control on the screen that really does
 * something.
 *
 * The search is asserted by what it *does*, because that is the difference between a field that
 * filters and a field that is decoration (AGENTS.md §11.2). Three things are asserted as
 * deliberately absent or inert, and PROJECT.md records each: the frame's **three filter chips**
 * (drawn in the frame's own states, claiming no role, because both of the app's listings survive
 * each of them), its **sliders glyph** (a filter sheet the app does not have) and the frame's
 * **“Browse 12 local listings”** as a control (there is no listing index behind it).
 */
describe('MarketBrowseScreen', () => {
  it('renders the frame’s header, its disclosure and its layout', async () => {
    await render(<MarketBrowseScreen />);

    expect(screen.getByText('PLANNED MARKETPLACE · OUTSIDE CORE')).toBeOnTheScreen();
    expect(screen.getByText('The local harvest')).toBeOnTheScreen();
    expect(screen.getByText('Planned extra')).toBeOnTheScreen();
    expect(screen.getByText('Buyer mode · Preview')).toBeOnTheScreen();
    expect(screen.getByTestId('market-search-field')).toBeOnTheScreen();
    expect(screen.getByTestId('market-filters')).toBeOnTheScreen();
  });

  it('draws the frame’s own two listings, with their prices and their sellers', async () => {
    await render(<MarketBrowseScreen />);

    expect(screen.getByText('Fresh blueberries')).toBeOnTheScreen();
    expect(screen.getByText('Wild lingonberries')).toBeOnTheScreen();

    // “€8 / kg” at the frame's own 18/21.78 slot (node 5:23812).
    expect(screen.getByText('€8 / kg')).toHaveStyle({
      fontSize: typography.price.fontSize,
    });
    expect(screen.getByText('€6 / kg')).toBeOnTheScreen();

    // One card is described by its town and the other by how far away it is, which is what the
    // frame draws in each case — and the distance is formatted, not glued in.
    expect(screen.getByText('20 kg available · Laajavuori, Jyväskylä')).toBeOnTheScreen();
    expect(screen.getByText('8 kg available · Palokka, 4.2 km away')).toBeOnTheScreen();

    expect(screen.getByText('Matti Laine · 4.9 · 24 reviews')).toBeOnTheScreen();
    expect(screen.getByText('Liisa Niemi · 4.8 · 18 reviews')).toBeOnTheScreen();
  });

  it('searches: the list narrows to the listing the words name', async () => {
    await render(<MarketBrowseScreen />);

    await fireEvent.changeText(screen.getByLabelText('Berries near Jyväskylä'), 'lingon');

    expect(screen.queryByText('Fresh blueberries')).not.toBeOnTheScreen();
    expect(screen.getByText('Wild lingonberries')).toBeOnTheScreen();
  });

  it('searches the seller too, because the card prints the seller', async () => {
    await render(<MarketBrowseScreen />);

    await fireEvent.changeText(screen.getByLabelText('Berries near Jyväskylä'), 'matti');

    expect(screen.queryByText('Wild lingonberries')).not.toBeOnTheScreen();
    expect(screen.getByText('Fresh blueberries')).toBeOnTheScreen();
  });

  it('says how many listings it is showing, and says when it found none', async () => {
    await render(<MarketBrowseScreen />);

    // The frame's own line (node 5:23828) with the number the app can answer for, painted as a
    // reading rather than a link: there is no listing index behind it (frontend review, 2026-10-25).
    expect(screen.getByText('Browse 2 local listings')).toBeOnTheScreen();
    expect(screen.getByTestId('market-browse-count')).toHaveStyle({
      color: themes.light.colors.textMuted,
    });

    await fireEvent.changeText(screen.getByLabelText('Berries near Jyväskylä'), 'lingon');

    expect(screen.getByText('Browse 1 local listing')).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText('Berries near Jyväskylä'), 'cloudberries');

    // The state the frame does not draw and a picker still needs: an empty search must never look
    // like a search that did not run.
    expect(screen.getByText('No listings match that search.')).toBeOnTheScreen();
  });

  it('opens the one listing the app has a screen behind, and only that one', async () => {
    const onOpenListing = jest.fn();

    await render(<MarketBrowseScreen onOpenListing={onOpenListing} />);

    // The frame draws a chevron on both cards; only the listing frames 16–18 tell a story about
    // has a destination, so only that card draws one and claims a role.
    expect(screen.getByTestId('market-listing-blueberries-chevron')).toBeOnTheScreen();
    expect(screen.queryByTestId('market-listing-lingonberries-chevron')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByLabelText('Open Fresh blueberries'));

    expect(onOpenListing).toHaveBeenCalledTimes(1);

    // The other card is drawn and searched, but pressing it is not offered as an action.
    expect(screen.queryByLabelText('Open Wild lingonberries')).not.toBeOnTheScreen();
  });

  it('draws the frame’s filter chips without claiming they filter', async () => {
    await render(<MarketBrowseScreen />);

    // The frame paints its first chip as chosen and the other two on the surface; the app draws
    // the same three states.
    expect(screen.getByTestId('market-filter-all')).toHaveStyle({
      backgroundColor: themes.light.colors.accent,
    });
    expect(screen.getByTestId('market-filter-pickup')).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
    });
    expect(screen.getByText('Pickup')).toBeOnTheScreen();
    expect(screen.getByText('Within 10 km')).toBeOnTheScreen();

    // Both of the app's listings are a pickup within ten kilometres, so neither chip could change
    // anything; a chip that announced itself as choosable would be a filter nothing can observe.
    expect(screen.queryByRole('radio')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Pickup' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Within 10 km' })).not.toBeOnTheScreen();
  });

  it('draws the frame’s text action without a role, because nothing opens', async () => {
    await render(<MarketBrowseScreen />);

    expect(screen.getByTestId('market-browse-count')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Browse 2 local listings' })).not.toBeOnTheScreen();
  });
});
