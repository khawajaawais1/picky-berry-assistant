import { formatEuros } from '../money';

/**
 * Money on screens 15–18 is cents in the data and a formatted string on the screen, and the two
 * languages write the decimal mark differently (“€8.50” against “8,50 €”). Formatted here, in one
 * pure function, so a price printed twice cannot print two ways.
 */
describe('formatEuros', () => {
  it('prints a whole number of euros without decimals', () => {
    expect(formatEuros(800, 'en')).toBe('8');
    expect(formatEuros(600, 'en')).toBe('6');
    expect(formatEuros(0, 'en')).toBe('0');
  });

  it('prints the design’s own order total', () => {
    // Frame 18's “Total held €40”, from 5 kg at €8/kg.
    expect(formatEuros(4000, 'en')).toBe('40');
  });

  it('keeps the cents when a price has them', () => {
    expect(formatEuros(850, 'en')).toBe('8.50');
    expect(formatEuros(1205, 'en')).toBe('12.05');
  });

  it('writes the decimal mark the language writes', () => {
    expect(formatEuros(850, 'fi')).toBe('8,50');
    expect(formatEuros(1205, 'fi')).toBe('12,05');
  });

  it('refuses a price that is not a whole number of cents', () => {
    // Money is an integer here. A float reaching this function is a bug upstream, and printing
    // it would hide the bug behind a plausible-looking price.
    expect(() => formatEuros(8.5, 'en')).toThrow(RangeError);
    expect(() => formatEuros(-1, 'en')).toThrow(RangeError);
  });
});
