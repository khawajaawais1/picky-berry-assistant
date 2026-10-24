/**
 * Public API of the development-only field-test instrument.
 *
 * This is not a product feature: it exists to measure ADR-063's foreground watch budget on real
 * phones (`src/app/field-test.tsx`), and its route redirects away in a production build. The
 * accumulator and its tests live under `domain/`; only the screen is reachable from a route.
 */
export { FieldTestScreen, type FieldTestScreenProps } from './components/field-test-screen';
