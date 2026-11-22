import { fireEvent, render, screen } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { parseListing } from '../../domain/listing';
import { API_LISTING } from '../../domain/test-fixtures';
import { MarketBrowseScreen } from '../market-browse-screen';

const LISTINGS = [
  parseListing(API_LISTING)!,
  parseListing({
    ...API_LISTING,
    id: 'l2',
    title: 'Wild lingonberries',
    species: 'lingonberry',
    place: { area: 'Palokka', town: 'Jyväskylä', distance_km: 4.6 },
  })!,
];

function renderBrowse(props: Partial<Parameters<typeof MarketBrowseScreen>[0]> = {}) {
  return render(<MarketBrowseScreen marketApi={{ listings: async () => LISTINGS }} {...props} />, {
    wrapper: QueryProvider,
  });
}

describe('MarketBrowseScreen', () => {
  it('lists the API’s listings, nearest first, with price, stock and seller', async () => {
    await renderBrowse();

    expect(await screen.findByText('Fresh bilberries')).toBeOnTheScreen();
    expect(screen.getByText('Wild lingonberries')).toBeOnTheScreen();
    expect(screen.getAllByText('€8 / kg')).toHaveLength(2);
    expect(screen.getByText('20 kg available · Laajavuori, 800 m away')).toBeOnTheScreen();
    expect(screen.getAllByText('Matti L. · New seller')).toHaveLength(2);
    expect(screen.getByTestId('market-browse-count')).toHaveTextContent('Browse 2 local listings');
  });

  it('narrows the list with the search', async () => {
    await renderBrowse();
    await screen.findByText('Fresh bilberries');

    await fireEvent.changeText(screen.getByLabelText('Berries near Jyväskylä'), 'Palokka');

    expect(screen.queryByText('Fresh bilberries')).not.toBeOnTheScreen();
    expect(screen.getByText('Wild lingonberries')).toBeOnTheScreen();
  });

  it('opens the listing a card is about', async () => {
    const onOpenListing = jest.fn();
    await renderBrowse({ onOpenListing });

    await fireEvent.press(await screen.findByRole('button', { name: 'Open Wild lingonberries' }));

    expect(onOpenListing).toHaveBeenCalledWith('l2');
  });

  it('says the marketplace could not be read, and offers to try again', async () => {
    await renderBrowse({ marketApi: { listings: () => Promise.reject(new Error('offline')) } });

    expect(await screen.findByText('The marketplace could not be read.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });

  it('says when nothing is for sale', async () => {
    await renderBrowse({ marketApi: { listings: async () => [] } });

    expect(await screen.findByText('No berries are for sale right now.')).toBeOnTheScreen();
  });
});
