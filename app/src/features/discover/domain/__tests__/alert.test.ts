import { ALERT_CONFIDENCE, confidenceLabelKey } from '../alert';

describe('confidenceLabelKey', () => {
  it('names a confidence the way the zone screen names it', () => {
    expect(ALERT_CONFIDENCE.map(confidenceLabelKey)).toEqual([
      'discover.details.confidence.high',
      'discover.details.confidence.medium',
      'discover.details.confidence.low',
    ]);
  });
});
