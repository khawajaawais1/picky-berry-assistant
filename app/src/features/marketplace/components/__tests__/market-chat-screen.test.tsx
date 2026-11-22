import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import { parseThread } from '../../domain/chat';
import { parseListing } from '../../domain/listing';
import { API_LISTING, API_THREAD } from '../../domain/test-fixtures';
import { MarketChatScreen } from '../market-chat-screen';

const LISTING = parseListing(API_LISTING)!;
const THREAD = parseThread(API_THREAD)!;

function api(overrides = {}) {
  return {
    listing: async () => LISTING,
    thread: jest.fn(async () => THREAD),
    send: jest.fn(async (_id: string, body: string) => ({
      ...THREAD,
      messages: [
        ...THREAD.messages,
        {
          id: 'm3',
          author: 'buyer' as const,
          mine: true,
          body,
          read: false,
          sentAt: '2026-08-28T14:06:00.000Z',
        },
      ],
    })),
    ...overrides,
  };
}

describe('MarketChatScreen', () => {
  it('draws the thread with the seller, each bubble named by its author', async () => {
    await render(<MarketChatScreen listingId="l1" marketApi={api()} />, { wrapper: QueryProvider });

    expect(await screen.findByLabelText('You: Still available?')).toBeOnTheScreen();
    expect(screen.getByLabelText('Seller: Yes!')).toBeOnTheScreen();
    expect(screen.getByText('Matti L.')).toBeOnTheScreen();
  });

  it('sends what the picker types, and shows it in the thread', async () => {
    const market = api();
    await render(<MarketChatScreen listingId="l1" marketApi={market} />, {
      wrapper: QueryProvider,
    });
    await screen.findByLabelText('You: Still available?');

    const send = screen.getByRole('button', { name: 'Send message' });
    expect(send.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByTestId('market-chat-input'), 'I will come at 18:30');
    await fireEvent.press(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() => expect(market.send).toHaveBeenCalledWith('l1', 'I will come at 18:30'));
    expect(await screen.findByLabelText('You: I will come at 18:30')).toBeOnTheScreen();
  });

  it('says when the thread is empty', async () => {
    await render(
      <MarketChatScreen
        listingId="l1"
        marketApi={api({ thread: async () => ({ ...THREAD, messages: [] }) })}
      />,
      { wrapper: QueryProvider },
    );

    expect(
      await screen.findByText('No messages yet. Ask the seller about the berries or the pickup.'),
    ).toBeOnTheScreen();
  });
});
