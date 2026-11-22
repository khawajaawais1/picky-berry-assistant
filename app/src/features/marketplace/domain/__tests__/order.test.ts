import { parseOrder, parseOrderKilograms, pickupStart } from '../order';
import { API_LISTING, API_ORDER } from '../test-fixtures';

describe('parseOrder', () => {
  it('reads the API’s order, with its listing', () => {
    expect(parseOrder(API_ORDER)).toMatchObject({
      id: 'o1',
      role: 'buyer',
      kilograms: 2,
      pricePerKgCents: 800,
      subtotalCents: 1600,
      totalCents: 1600,
      pickupTime: '18:30',
      status: 'pending',
      listing: { id: 'l1', name: 'Fresh bilberries' },
    });
  });

  it('refuses an order with money that is not whole cents, or an unknown status', () => {
    expect(parseOrder({ ...API_ORDER, total_cents: 16.5 })).toBeNull();
    expect(parseOrder({ ...API_ORDER, status: 'shipped' })).toBeNull();
    expect(parseOrder({ ...API_ORDER, listing: { ...API_LISTING, id: '' } })).toBeNull();
  });
});

describe('the order form’s rules', () => {
  it('reads kilograms in either decimal mark, within the stock', () => {
    expect(parseOrderKilograms('2', 20)).toBe(2);
    expect(parseOrderKilograms('1,5', 20)).toBe(1.5);
    expect(parseOrderKilograms('25', 20)).toBeNull();
    expect(parseOrderKilograms('0', 20)).toBeNull();
    expect(parseOrderKilograms('two', 20)).toBeNull();
  });

  it('starts the pickup at the window’s first time', () => {
    expect(pickupStart('17:00–19:00')).toBe('17:00');
    expect(pickupStart('by agreement')).toBeNull();
  });
});
