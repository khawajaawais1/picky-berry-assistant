import {
  bearingDegrees,
  compassPoint,
  distanceMeters,
  formatDistance,
  ringCentre,
  walkingDirectionsUrl,
  walkingMinutes,
  type LngLat,
} from '../route';

const JYVASKYLA: LngLat = [25.7473, 62.2426];

describe('the way to a zone', () => {
  it('finds a ring’s middle without counting its closing vertex twice', () => {
    expect(
      ringCentre([
        [25, 62],
        [26, 62],
        [26, 63],
        [25, 63],
        [25, 62],
      ]),
    ).toEqual([25.5, 62.5]);
  });

  it('measures great-circle distance in metres', () => {
    // One degree of latitude is about 111.2 km anywhere.
    expect(distanceMeters([25, 62], [25, 63])).toBeCloseTo(111_195, -2);
    expect(distanceMeters(JYVASKYLA, JYVASKYLA)).toBe(0);
  });

  it('names the heading on an eight-point compass', () => {
    expect(compassPoint(bearingDegrees([25, 62], [25, 63]))).toBe('n');
    expect(compassPoint(bearingDegrees([25, 62], [26, 62]))).toBe('e');
    expect(compassPoint(bearingDegrees([25, 63], [25, 62]))).toBe('s');
    expect(compassPoint(350)).toBe('n');
    expect(compassPoint(225)).toBe('sw');
  });

  it('estimates the walk at 4 km/h, never less than a minute', () => {
    expect(walkingMinutes(2000)).toBe(30);
    expect(walkingMinutes(10)).toBe(1);
  });

  it('hands walking directions to the maps app with the destination as lat,lng', () => {
    expect(walkingDirectionsUrl(JYVASKYLA)).toBe(
      'https://www.google.com/maps/dir/?api=1&travelmode=walking&destination=62.242600,25.747300',
    );
  });
});

describe('formatDistance', () => {
  it('writes metres while the walk is short', () => {
    expect(formatDistance(180, 'en')).toBe('180 m');
  });

  it('writes kilometres at one decimal from a kilometre up, in the language’s decimal mark', () => {
    expect(formatDistance(1400, 'en')).toBe('1.4 km');
    expect(formatDistance(1400, 'fi')).toBe('1,4 km');
  });

  it('refuses a distance that is not one', () => {
    expect(() => formatDistance(-1, 'en')).toThrow(RangeError);
    expect(() => formatDistance(Number.NaN, 'en')).toThrow(RangeError);
  });
});
