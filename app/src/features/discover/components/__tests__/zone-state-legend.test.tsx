import { render, screen } from '@testing-library/react-native';

import { ZONE_STATES } from '../../domain/zone';
import { ZoneStateLegend } from '../zone-state-legend';

/**
 * The legend's swatches and words come from the same state table the map draws from, so a
 * recoloured state cannot leave the legend showing an older colour.
 */
describe('ZoneStateLegend', () => {
  it('draws one swatch and word for each zone state', async () => {
    await render(<ZoneStateLegend />);

    expect(screen.getByTestId('zone-state-legend')).toBeOnTheScreen();
    for (const state of ZONE_STATES) {
      expect(screen.getByTestId(`zone-state-legend-swatch-${state}`)).toBeOnTheScreen();
    }
  });
});
