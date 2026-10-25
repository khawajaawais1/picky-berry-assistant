import { DEMO_LISTINGS } from '../listing';
import { DEMO_ORDER, orderSubtotalCents, orderTotalCents } from '../order';

/**
 * The order frames 16–18 tell one story about: 5 kg of the design's blueberries at €8/kg, held by
 * the provider until the picker confirms. Nothing charges anything — the frames say so themselves
 * — so what is worth pinning down is the arithmetic and the tie between the story's own numbers.
 */
describe('DEMO_ORDER', () => {
  it('orders the listing the detail, chat and order screens are all about', () => {
    expect(DEMO_LISTINGS.map((listing) => listing.id)).toContain(DEMO_ORDER.listingId);
  });

  it('is the frame’s own order', () => {
    // “5 kg × €8 / kg” and “Pickup · no delivery fee” (frame 18, nodes 5:23964 and 5:23967).
    expect(DEMO_ORDER.kilograms).toBe(5);
    expect(DEMO_ORDER.deliveryCents).toBe(0);
  });

  it('is collected at the time the thread agreed on', () => {
    // The chat's own third message (“I'll be there at 18:30”) and frame 18's pickup row
    // (“… · 18:30 Laajavuori car park, Jyväskylä”) print one time, so the order holds it once.
    expect(DEMO_ORDER.pickupTime).toBe('18:30');
  });
});

describe('orderSubtotalCents', () => {
  it('multiplies the weight by the price per kilogram', () => {
    const blueberries = DEMO_LISTINGS[0];

    expect(orderSubtotalCents(DEMO_ORDER, blueberries)).toBe(4000);
  });

  it('is exact for a price with cents', () => {
    const blueberries = DEMO_LISTINGS[0];

    // 5 kg at €8.55 is €42.75, not 42.749999: the arithmetic stays in cents.
    expect(orderSubtotalCents(DEMO_ORDER, { ...blueberries, pricePerKgCents: 855 })).toBe(4275);
  });
});

describe('orderTotalCents', () => {
  it('adds the delivery fee to the subtotal', () => {
    const blueberries = DEMO_LISTINGS[0];

    expect(orderTotalCents(DEMO_ORDER, blueberries)).toBe(4000);
    expect(orderTotalCents({ ...DEMO_ORDER, deliveryCents: 250 }, blueberries)).toBe(4250);
  });
});
