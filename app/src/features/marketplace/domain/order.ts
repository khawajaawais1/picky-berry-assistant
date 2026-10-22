import { DEMO_LISTING_ID, type MarketListing } from './listing';

/**
 * The order frames 16–18 tell one story about: the picker's request in frame 17's chat (“Could I
 * get 5 kg of blueberries this evening?”), the seller's answer (“That's €40”), the summary frame
 * 17's action opens and the total frame 18 prints.
 *
 * It is the **design's own order** — 5 kg at €8/kg, pickup, no delivery fee — and it is a demo in
 * every part that matters: nothing charges a card, nothing holds money and nothing confirms a
 * handover, which the frame's own chips (“Provider test mode”) and status message (“No real money
 * was charged”) say on the screen. Recording the order is what the app *does* here: it is the state
 * a screen draws, not a payment.
 *
 * The arithmetic is here rather than in a component because it is the one part of this feature that
 * can be wrong without looking wrong: a subtotal that lost a cent would still render.
 */

export type MarketOrder = {
  listingId: string;
  kilograms: number;
  /** Delivery in cents. Pickup is free, which is the frame's own “no delivery fee”. */
  deliveryCents: number;
  /**
   * When the picker agreed to collect it, as the thread's own words say (“I'll be there at
   * 18:30”) and frame 18's pickup row prints. It is the order's own state rather than the
   * listing's pickup window (frame 16 draws that as “17:00–19:00”): the window is when the seller
   * is there, and this is when the two of them agreed on.
   */
  pickupTime: string;
};

/** Frame 18's order: “5 kg × €8 / kg”, pickup, “€40” held, collected at 18:30. */
export const DEMO_ORDER: MarketOrder = {
  // The listing frames 16–18 are all about, so an order and the card it came from cannot drift.
  listingId: DEMO_LISTING_ID,
  kilograms: 5,
  deliveryCents: 0,
  pickupTime: '18:30',
};

/** What the berries cost, before anything is added to them. */
export function orderSubtotalCents(order: MarketOrder, listing: MarketListing): number {
  return order.kilograms * listing.pricePerKgCents;
}

/** What the picker would pay: the subtotal plus the delivery fee. */
export function orderTotalCents(order: MarketOrder, listing: MarketListing): number {
  return orderSubtotalCents(order, listing) + order.deliveryCents;
}
