export const CHART_MIN_WIDTH = 280;
export const CHART_MAX_WIDTH = 720;

export function chartWidth(measured: number): number {
  if (!Number.isFinite(measured) || measured <= 0) return CHART_MAX_WIDTH;
  return Math.min(CHART_MAX_WIDTH, Math.max(CHART_MIN_WIDTH, Math.round(measured)));
}
