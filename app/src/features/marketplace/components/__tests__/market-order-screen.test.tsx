import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { parseListing } from '../../domain/listing';
import { parseOrder } from '../../domain/order';
import { API_LISTING, API_ORDER } from '../../domain/test-fixtures';
import { MarketOrderScreen } from '../market-order-screen';

const LISTING = parseListing(API_LISTING)!;
const ORDER = parseOrder(API_ORDER)!;

function api() {
  return {
    listing: async () => LISTING,
    placeOrder: jest.fn(async () => ORDER),
    order: async () => ORDER,
  };
}

describe('MarketOrderScreen, ordering', () => {
  it('reserves the kilograms the picker typed, at the pickup time they chose', async () => {
    const market = api();
    const onPlaced = jest.fn();
    await render(<MarketOrderScreen listingId="l1" marketApi={market} onPlaced={onPlaced} />, {
      wrapper: QueryProvider,
    });

    await fireEvent.changeText(await screen.findByLabelText('How many kilograms?'), '2');
    expect(screen.getByTestId('market-order-preview-total')).toHaveTextContent('€16');
    // The window's first time is the default pickup.
    await fireEvent.changeText(screen.getByLabelText('Pickup time (17:00–19:00)'), '18:30');
    await fireEvent.press(screen.getByRole('button', { name: 'Reserve berries' }));

    await waitFor(() => expect(market.placeOrder).toHaveBeenCalledWith('l1', 2, '18:30'));
    await waitFor(() => expect(onPlaced).toHaveBeenCalledWith('o1'));
  });

  it('refuses more kilograms than the listing has', async () => {
    await render(<MarketOrderScreen listingId="l1" marketApi={api()} />, {
      wrapper: QueryProvider,
    });

    await fireEvent.changeText(await screen.findByLabelText('How many kilograms?'), '25');

    expect(screen.getByText('Enter between 0.1 and 20 kg.')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'Reserve berries' }).props.accessibilityState,
    ).toMatchObject({ disabled: true });
  });
});

describe('MarketOrderScreen, an order', () => {
  it('shows the order the API holds, with its total and pickup', async () => {
    const onMessageSeller = jest.fn();
    await render(
      <MarketOrderScreen marketApi={api()} onMessageSeller={onMessageSeller} orderId="o1" />,
      { wrapper: QueryProvider },
    );

    expect(await screen.findByText('Reserved · waiting for the seller')).toBeOnTheScreen();
    expect(screen.getByText('2 kg × €8/kg')).toBeOnTheScreen();
    expect(screen.getByTestId('market-order-total')).toHaveTextContent('€16');
    expect(screen.getByText('18:30 · Laajavuori car park, Jyväskylä')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Message Matti L.' }));
    expect(onMessageSeller).toHaveBeenCalledWith('l1');
  });
});
