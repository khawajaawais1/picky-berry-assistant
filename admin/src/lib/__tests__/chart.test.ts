import { describe, expect, it } from 'vitest';
import { chartWidth, CHART_MIN_WIDTH, CHART_MAX_WIDTH } from '../chart';

describe('chartWidth', () => {
  it('falls back to the max width before the container is measured', () => {
    expect(chartWidth(0)).toBe(CHART_MAX_WIDTH);
    expect(chartWidth(-10)).toBe(CHART_MAX_WIDTH);
    expect(chartWidth(Number.NaN)).toBe(CHART_MAX_WIDTH);
  });

  it('clamps to the supported range', () => {
    expect(chartWidth(200)).toBe(CHART_MIN_WIDTH);
    expect(chartWidth(390)).toBe(390);
    expect(chartWidth(1200)).toBe(CHART_MAX_WIDTH);
  });
});
