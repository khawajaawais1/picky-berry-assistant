import { render, screen } from '@testing-library/react-native';

import { ZoneMap } from '../zone-map';
import type { Zone } from '../../domain/zone-source';

/**
 * Expo Go has no MapLibre native binary, and the package asks for its camera module as soon
 * as its JavaScript entry loads. The Discover feature is reached from the root layout, so an
 * unguarded import takes the whole app down before any screen renders. The map must state
 * that it needs a development build instead.
 *
 * The factory throws the exact failure Expo Go produces; this file is separate from
 * `zone-map.test.tsx` because that suite renders the real (mocked) MapLibre components.
 */
jest.mock('@maplibre/maplibre-react-native', () => {
  throw new Error(
    "TurboModuleRegistry.getEnforcing(...): 'MLRNCameraModule' could not be found. " +
      'Verify that a module by this name is registered in the native binary.',
  );
});

function zone(): Zone {
  return {
    id: 'cc0e7929-de9f-516a-9049-7a25a1a6d092',
    h3: '8811250e25fffff',
    name: 'Laajavuori 1',
    score: 53,
    confidence: 'medium',
    ripeness: 'past',
    scores: {},
    ring: [
      [25.689711, 62.25623],
      [25.69564, 62.253184],
      [25.703822, 62.254551],
      [25.689711, 62.25623],
    ],
  };
}

describe('ZoneMap without MapLibre', () => {
  it('states that the map needs a development build instead of crashing the app', async () => {
    await render(<ZoneMap status="ready" zones={[zone()]} />);

    expect(screen.getByTestId('zone-map-unavailable')).toHaveTextContent(
      'The map isn’t available in this build. Use a development build to see it.',
    );
    expect(screen.queryByTestId('zone-map-drawing')).not.toBeOnTheScreen();
    expect(screen.getByText('1 zone · test data')).toBeOnTheScreen();
  });
});
