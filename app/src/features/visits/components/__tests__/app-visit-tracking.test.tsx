import { render } from '@testing-library/react-native';

import { QueryProvider } from '@/services/query-client';

import type { VisitsApi } from '../../services/visits-api';
import { AppVisitTracking } from '../app-visit-tracking';

/**
 * The tracker as the app shell mounts it (ADR-066): over the zone service's zones, sending to the
 * visits service, and nothing at all in a build that has no visits service.
 */
let mockApi: VisitsApi | undefined;
const mockTracker = jest.fn((_props: unknown) => null);

jest.mock('../../services/app-visits-api', () => ({
  get appVisitsApi() {
    return mockApi;
  },
}));
jest.mock('../visit-tracker', () => ({
  VisitTracker: (props: unknown) => mockTracker(props),
}));

beforeEach(() => {
  mockTracker.mockClear();
});

describe('AppVisitTracking', () => {
  it('mounts nothing in a build with no visits service', async () => {
    mockApi = undefined;

    await render(<AppVisitTracking />, { wrapper: QueryProvider });

    expect(mockTracker).not.toHaveBeenCalled();
  });

  it('mounts the tracker over the zone service’s zones with the visits service', async () => {
    mockApi = { send: jest.fn(), submit: jest.fn(), list: jest.fn() };

    await render(<AppVisitTracking />, { wrapper: QueryProvider });

    expect(mockTracker).toHaveBeenCalledWith(expect.objectContaining({ api: mockApi, zones: [] }));
  });
});
