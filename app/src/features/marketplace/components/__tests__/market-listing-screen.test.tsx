import { fireEvent, render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { parseListing } from '../../domain/listing';
import { API_LISTING } from '../../domain/test-fixtures';
import { MarketListingScreen } from '../market-listing-screen';

const LISTING = parseListing(API_LISTING)!;

function renderListing(props: Partial<Parameters<typeof MarketListingScreen>[0]> = {}) {
  return render(
    <MarketListingScreen listingId="l1" marketApi={{ listing: async () => LISTING }} {...props} />,
    { wrapper: QueryProvider },
  );
}

describe('MarketListingScreen', () => {
  it('draws the listing the API serves: price, stock, harvest, pickup and seller', async () => {
    await renderListing();

    expect(await screen.findByText('Fresh bilberries')).toBeOnTheScreen();
    expect(screen.getByText('€8/kg')).toBeOnTheScreen();
    expect(screen.getByText('Bilberry · 20 kg available')).toBeOnTheScreen();
    expect(screen.getByText('Harvested 28 August 2026')).toBeOnTheScreen();
    expect(screen.getByText('Pickup · Laajavuori car park 17:00–19:00')).toBeOnTheScreen();
    expect(screen.getByText('Matti L.')).toBeOnTheScreen();
    expect(screen.getByText('Verified seller · no reviews yet')).toBeOnTheScreen();
  });

  it('opens the seller thread and the order form for this listing', async () => {
    const onContactSeller = jest.fn();
    const onOpenOrder = jest.fn();
    await renderListing({ onContactSeller, onOpenOrder });

    await fireEvent.press(await screen.findByRole('button', { name: 'Contact Matti L.' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Order berries' }));

    expect(onContactSeller).toHaveBeenCalledWith('l1');
    expect(onOpenOrder).toHaveBeenCalledWith('l1');
  });

  it('offers no order on a sold-out listing', async () => {
    await renderListing({
      marketApi: { listing: async () => ({ ...LISTING, availableKg: 0, status: 'sold' }) },
      onOpenOrder: jest.fn(),
    });

    expect(await screen.findByText('Sold out')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Order berries' })).not.toBeOnTheScreen();
  });

  it('says it cannot find a listing it was not given', async () => {
    await renderListing({ listingId: undefined });

    expect(screen.getByText('This listing could not be found.')).toBeOnTheScreen();
  });
});
