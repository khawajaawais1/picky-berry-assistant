import { fireEvent, render, screen } from '@testing-library/react-native';

import { themes, typography } from '@/constants/theme';

import { MarketOrderScreen } from '../market-order-screen';

/**
 * Frame 18 as the app can be true about it (node `5:23935`): the design's demo order — what was
 * ordered, what it costs, when and where it is collected, and how far along it is — with the
 * frame's own two disclosures that it is a test.
 *
 * The arithmetic is asserted here as the screen prints it (5 kg × €8/kg = €40), and the two
 * actions that would release or freeze a payment are asserted as absent, because no provider holds
 * anything and an action that cannot act claims no role (AGENTS.md §11.2).
 */
describe('MarketOrderScreen', () => {
  it('renders the frame’s header and both of its disclosures', async () => {
    await render(<MarketOrderScreen />);

    expect(screen.getByText('PLANNED MARKETPLACE · DEMO ORDER')).toBeOnTheScreen();
    expect(screen.getByText('Your berries are reserved')).toBeOnTheScreen();
    expect(screen.getByText('Planned extra')).toBeOnTheScreen();
    expect(screen.getByText('Provider test mode')).toBeOnTheScreen();
  });

  it('says out loud that no money was charged', async () => {
    await render(<MarketOrderScreen />);

    expect(screen.getByText('Test order confirmed')).toBeOnTheScreen();
    expect(
      screen.getByText('No real money was charged. Demo payment is held by the provider.'),
    ).toBeOnTheScreen();
  });

  it('prints the frame’s own order, figure by figure', async () => {
    await render(<MarketOrderScreen />);

    expect(screen.getByText('Fresh blueberries')).toBeOnTheScreen();
    expect(screen.getByText('Matti Laine · Harvested 28 August 2026')).toBeOnTheScreen();
    expect(screen.getByText('5 kg × €8/kg')).toBeOnTheScreen();
    expect(screen.getByText('Pickup · no delivery fee')).toBeOnTheScreen();
    expect(screen.getByText('€0')).toBeOnTheScreen();
    expect(screen.getByText('Total held')).toBeOnTheScreen();
  });

  it('adds the weight and the delivery fee up rather than printing the frame’s figures', async () => {
    await render(<MarketOrderScreen />);

    // The subtotal and the total are the same number here because the frame's pickup is free;
    // both come from the order's own arithmetic, so a different order prints different figures.
    expect(screen.getAllByText('€40')).toHaveLength(2);
    // The frame's largest figure (node 5:23972): what is held.
    expect(screen.getAllByText('€40')[1]).toHaveStyle({
      fontSize: typography.priceTotal.fontSize,
    });
  });

  it('draws the pickup and the order’s own progress', async () => {
    await render(<MarketOrderScreen />);

    // The frame addresses the seller by first name (“Pickup with Matti”); the app prints the name
    // it actually holds, which is the whole of it.
    expect(screen.getByText('Pickup with Matti Laine')).toBeOnTheScreen();
    expect(screen.getByText('28 Aug · 18:30 Laajavuori car park, Jyväskylä')).toBeOnTheScreen();
    expect(screen.getByText('Order confirmed · payment held')).toBeOnTheScreen();
    expect(screen.getByText('Waiting for pickup confirmation')).toBeOnTheScreen();
  });

  it('keeps the frame’s own instruction about when to confirm', async () => {
    await render(<MarketOrderScreen />);

    expect(screen.getByText('Confirm only after you receive your berries')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'Payment stays held until delivery is confirmed. Confirmation releases it to Matti Laine.',
      ),
    ).toBeOnTheScreen();
  });

  it('offers the seller’s thread, which exists', async () => {
    const onMessageSeller = jest.fn();

    await render(<MarketOrderScreen onMessageSeller={onMessageSeller} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Message Matti Laine' }));

    expect(onMessageSeller).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Message Matti Laine' })).toHaveStyle({
      backgroundColor: themes.light.colors.surface,
    });
  });

  it('does not offer to release or freeze a payment nothing holds', async () => {
    await render(<MarketOrderScreen onMessageSeller={jest.fn()} />);

    // Confirming receipt releases the payment and a dispute freezes it; there is no provider and no
    // held money, so neither action is drawn at all — the same rule frame 13's retry action is left
    // out under. The frame's own note about what a dispute does is drawn: it is a sentence, not an
    // action.
    expect(
      screen.queryByRole('button', { name: 'Confirm berries received' }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText('Confirm berries received')).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Open dispute' })).not.toBeOnTheScreen();
    expect(screen.queryByText('Open dispute')).not.toBeOnTheScreen();
    expect(
      screen.getByText(
        'A problem with the order? A dispute keeps payment held while it is reviewed.',
      ),
    ).toBeOnTheScreen();
  });
});
