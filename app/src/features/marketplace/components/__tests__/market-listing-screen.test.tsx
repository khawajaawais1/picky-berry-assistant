import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { MarketListingScreen } from '../market-listing-screen';

/**
 * Frame 16 as the app can be true about it (node `5:23832`): the design's own listing, its price,
 * its harvest day and pickup window, its seller, its escrow note, and the two actions the frame
 * draws.
 *
 * What the screen repeats rather than knows is asserted as the frame's sample, and what the
 * screen's own decisions are — the species named in the app's own vocabulary, the pickup line
 * without the frame's “Today” — are asserted as the app draws them.
 */
describe('MarketListingScreen', () => {
  it('renders the frame’s header and the listing it is about', async () => {
    await render(<MarketListingScreen />);

    expect(screen.getByText('PLANNED MARKETPLACE · LISTING')).toBeOnTheScreen();
    expect(screen.getByText('Fresh blueberries')).toBeOnTheScreen();
    expect(screen.getByText('Planned extra')).toBeOnTheScreen();
    expect(screen.getByText('Laajavuori · Jyväskylä')).toBeOnTheScreen();
    expect(screen.getByTestId('market-listing-photo')).toBeOnTheScreen();
  });

  it('sets the frame’s own headline, price and stock line', async () => {
    await render(<MarketListingScreen />);

    expect(screen.getByText('Forest to your table.')).toHaveStyle({
      fontSize: typography.listingHeading.fontSize,
    });
    // “€8/kg” at the frame's 23/27.8 slot (node 5:23854).
    expect(screen.getByText('€8/kg')).toHaveStyle({
      fontSize: typography.priceLarge.fontSize,
    });
    // The frame writes “Wild bilberries”; the app names the species it knows, from its one
    // vocabulary of three berries.
    expect(screen.getByText('Bilberry · 20 kg available')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Hand-picked today, sorted and kept cool. Finnish wild blueberries, full of forest flavour.',
      ),
    ).toBeOnTheScreen();
  });

  it('draws the frame’s pickup card, without claiming the day is today', async () => {
    await render(<MarketListingScreen />);

    expect(screen.getByText('Harvested 28 August 2026')).toBeOnTheScreen();
    // The frame prints “Today” before the window; the demo's day is the design's own 28 August,
    // and a screen may not claim that a date is the day the picker is holding the phone.
    expect(screen.getByText('Pickup · Laajavuori car park 17:00–19:00')).toBeOnTheScreen();
    expect(screen.getByText('Local delivery by agreement in chat')).toBeOnTheScreen();
  });

  it('names the seller and says the app has verified them', async () => {
    await render(<MarketListingScreen />);

    expect(screen.getByText('Matti Laine')).toBeOnTheScreen();
    expect(screen.getByText('Verified seller · 4.9 / 5 · 24 reviews')).toBeOnTheScreen();
  });

  it('keeps the frame’s own escrow note, which is a plan rather than a fact', async () => {
    await render(<MarketListingScreen />);

    expect(
      screen.getByText('Planned provider escrow protects payment until you confirm delivery.'),
    ).toBeOnTheScreen();
  });

  it('offers both of the frame’s actions when the route has somewhere to send them', async () => {
    const onContactSeller = jest.fn();
    const onOpenOrder = jest.fn();

    await render(
      <MarketListingScreen onContactSeller={onContactSeller} onOpenOrder={onOpenOrder} />,
    );

    // The frame's action holds a short word inside its 104 px label (“Contact Matti”); the app
    // prints the design's word and names the seller it reaches in the accessible name, because the
    // whole name it holds would wrap there.
    const contact = screen.getByRole('button', { name: 'Contact Matti Laine' });

    expect(screen.getByText('Contact')).toBeOnTheScreen();
    const order = screen.getByRole('button', { name: 'Order berries' });

    // The frame's own pair: a secondary action and the primary one the screen leads with.
    expect(contact).toHaveStyle({ backgroundColor: themes.light.colors.surface });
    expect(order).toHaveStyle({ backgroundColor: themes.light.colors.accent });

    await fireEvent.press(contact);
    await fireEvent.press(order);

    expect(onContactSeller).toHaveBeenCalledTimes(1);
    expect(onOpenOrder).toHaveBeenCalledTimes(1);
  });

  it('draws no action the route cannot send anywhere', async () => {
    await render(<MarketListingScreen />);

    expect(screen.queryByRole('button')).not.toBeOnTheScreen();
    expect(screen.queryByText('Contact')).not.toBeOnTheScreen();
    expect(screen.queryByText('Order berries')).not.toBeOnTheScreen();
  });
});
