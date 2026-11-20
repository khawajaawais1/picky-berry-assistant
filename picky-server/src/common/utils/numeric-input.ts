export function parseNumericInput(value: unknown): number {
  if (typeof value === 'string' && value.trim() === '') return Number.NaN;
  return Number(value);
}
