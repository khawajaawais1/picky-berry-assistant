import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { NearQueryDto } from './near-query.dto';

describe('NearQueryDto', () => {
  it('accepts fractional radii and transforms numeric query parameters', () => {
    const query = plainToInstance(NearQueryDto, {
      lat: '62.2',
      lng: '25.7',
      species: 'bilberry',
      radius_km: '1.5',
      limit: '10',
    });
    expect(validateSync(query)).toHaveLength(0);
    expect(query.radius_km).toBe(1.5);
    expect(query.limit).toBe(10);
  });

  it('rejects empty numeric query parameters', () => {
    const query = plainToInstance(NearQueryDto, {
      lat: '',
      lng: '25.7',
      species: 'bilberry',
    });
    expect(validateSync(query).length).toBeGreaterThan(0);
  });

  it('allows score-free geofence lookup and defaults to 20 zones', () => {
    const query = plainToInstance(NearQueryDto, {
      lat: '62.2',
      lng: '25.7',
      sort: 'distance',
    });
    expect(validateSync(query)).toHaveLength(0);
    expect(query.species).toBeUndefined();
    expect(query.effectiveLimit).toBe(20);
  });

  it('still requires species when using score sorting', () => {
    const query = plainToInstance(NearQueryDto, {
      lat: '62.2',
      lng: '25.7',
    });
    expect(validateSync(query).length).toBeGreaterThan(0);
  });
});
