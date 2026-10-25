import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { DEMO_THREAD } from '../../domain/chat';
import { MarketChatScreen } from '../market-chat-screen';

/**
 * Frame 17 as the app can be true about it (node `5:23883`): the design's own thread with one
 * seller, the listing it is about, the day stamped over it, and the frame's two controls below.
 *
 * Two things are asserted as they are rather than as they look: the composer is drawn and claims
 * **no input role** (nothing delivers a message anywhere), and the thread's own authors are
 * programmatically determinable (a bubble's side is a position, and a position is not something a
 * screen reader hears).
 */
describe('MarketChatScreen', () => {
  it('renders the frame’s header, its disclosure and the thread’s listing', async () => {
    await render(<MarketChatScreen />);

    expect(screen.getByText('PLANNED MARKETPLACE · SELLER CHAT')).toBeOnTheScreen();
    expect(screen.getByText('Matti Laine')).toBeOnTheScreen();
    expect(screen.getByText('Planned extra')).toBeOnTheScreen();
    expect(screen.getByText('Verified seller')).toBeOnTheScreen();
    expect(screen.getByText('Fresh blueberries · €8/kg')).toBeOnTheScreen();
    expect(screen.getByText('20 kg available · Laajavuori')).toBeOnTheScreen();
  });

  it('stamps the listing’s own day over the thread', async () => {
    await render(<MarketChatScreen />);

    // The frame draws it upper case (node 5:23908); the style does the casing, so both languages
    // keep their own date form.
    const stamp = screen.getByText('28 August 2026');

    expect(stamp).toBeOnTheScreen();
    expect(stamp).toHaveStyle({ textTransform: 'uppercase' });
  });

  it('draws the frame’s four messages, each with its own time', async () => {
    await render(<MarketChatScreen />);

    for (const message of DEMO_THREAD) {
      expect(screen.getByTestId(`market-chat-${message.id}`)).toBeOnTheScreen();
    }

    expect(screen.getByText('Hi Matti! Could I get 5 kg of blueberries this evening?')).toHaveStyle(
      {
        fontSize: typography.message.fontSize,
      },
    );
    expect(
      screen.getByText('Of course! That’s €40. Pickup is at Laajavuori car park, 17:00–19:00.'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Perfect. I’ll be there at 18:30.')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Great, I’ll pack 5 kg for you. Please order in Picky so payment is held safely.',
      ),
    ).toBeOnTheScreen();
  });

  it('prints a receipt under the picker’s own messages and none under the seller’s', async () => {
    await render(<MarketChatScreen />);

    // The frame's own two receipts (nodes 5:23912 and 5:23920): the app can know that its own
    // messages were read, and cannot know it of someone else's.
    expect(screen.getAllByText('14:02 · Read')).toHaveLength(1);
    expect(screen.getAllByText('14:05 · Read')).toHaveLength(1);
    expect(screen.getByText('14:04')).toBeOnTheScreen();
    expect(screen.getByText('14:06')).toBeOnTheScreen();
  });

  it('says who wrote each message, rather than leaving it to alignment', async () => {
    await render(<MarketChatScreen />);

    expect(
      screen.getByLabelText('You: Hi Matti! Could I get 5 kg of blueberries this evening?'),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText(
        'Seller: Of course! That’s €40. Pickup is at Laajavuori car park, 17:00–19:00.',
      ),
    ).toBeOnTheScreen();
  });

  it('paints the picker’s own bubbles in the accent and the seller’s on the surface', async () => {
    await render(<MarketChatScreen />);

    expect(screen.getByTestId('market-chat-ask')).toBeOnTheScreen();
    expect(
      screen.getByLabelText('You: Hi Matti! Could I get 5 kg of blueberries this evening?'),
    ).toHaveStyle({ backgroundColor: themes.light.colors.accent });
    expect(
      screen.getByLabelText(
        'Seller: Of course! That’s €40. Pickup is at Laajavuori car park, 17:00–19:00.',
      ),
    ).toHaveStyle({ backgroundColor: themes.light.colors.surface });
  });

  it('offers the frame’s order summary, with the order’s own total in it', async () => {
    const onOpenOrder = jest.fn();

    await render(<MarketChatScreen onOpenOrder={onOpenOrder} />);

    const summary = screen.getByRole('button', { name: 'View order summary · €40' });

    await fireEvent.press(summary);

    expect(onOpenOrder).toHaveBeenCalledTimes(1);
  });

  it('draws the frame’s composer without making it a field nothing can send from', async () => {
    await render(<MarketChatScreen />);

    expect(screen.getByTestId('market-chat-composer')).toBeOnTheScreen();
    expect(screen.getByText('Write a message…')).toBeOnTheScreen();

    // No transport exists, so the row is drawn and inert: a field that swallowed what a picker
    // typed, with a send control that delivered it nowhere, would be the worse answer.
    expect(screen.queryByRole('textbox')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Write a message…' })).not.toBeOnTheScreen();
  });

  it('draws no order summary when the route has no order to open', async () => {
    await render(<MarketChatScreen />);

    expect(screen.queryByText('View order summary · €40')).not.toBeOnTheScreen();
  });
});
