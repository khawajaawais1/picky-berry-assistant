/**
 * Fills the `{placeholders}` of a translated string with runtime values — an address, a
 * countdown. The sentence itself stays in the catalogue, in its own language, so a
 * component never builds grammar out of fragments.
 *
 * A placeholder with no value is left as written rather than replaced with `undefined`:
 * the mistake is then visible on the screen it breaks. The catalogue test keeps the
 * placeholders of every locale in step, so a missing value is a caller's bug, not a
 * translation one.
 *
 * This is a module of its own rather than part of the service's entry point because it is
 * pure: the layout harness measures the copy a screen renders, and it can import this
 * without dragging the localization runtime (and with it a native module) into a Node
 * process (e2e/layout.spec.ts).
 */
export function interpolate(copy: string, values: Record<string, string>): string {
  return copy.replace(/\{(\w+)\}/g, (placeholder, name: string) => values[name] ?? placeholder);
}
