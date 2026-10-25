import type { ReactNode } from 'react';
import { View } from 'react-native';

/**
 * MapLibre React Native is a native module: importing the real one in Jest reaches for a
 * TurboModule that does not exist. Each component becomes a plain `View` carrying its props,
 * which is what the map's tests assert on — the GeoJSON handed to the source, the style, the
 * gesture flags — without pretending to render tiles.
 *
 * A root `__mocks__` for a node module is picked up automatically; there is no `jest.mock`
 * call for it in `jest.setup.ts`, because a factory there is hoisted above the CSS-interop
 * runtime this project's setup registers first.
 */
function mockComponent(name: string) {
  const Component = ({
    children,
    ...props
  }: { children?: ReactNode } & Record<string, unknown>) => <View {...props}>{children}</View>;
  Component.displayName = name;
  return Component;
}

export const Camera = mockComponent('Camera');
export const GeoJSONSource = mockComponent('GeoJSONSource');
export const Layer = mockComponent('Layer');
export const Map = mockComponent('Map');
