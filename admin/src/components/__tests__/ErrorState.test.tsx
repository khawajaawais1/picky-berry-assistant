import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ApiError, isApiUnavailable } from '../../api/client';
import { ErrorState } from '../ui';

describe('ErrorState', () => {
  it('says the API is not reachable when the request never got an answer', () => {
    render(
      <ErrorState
        error={
          new ApiError(0, 'API_UNREACHABLE', 'The API could not be reached.')
        }
      />,
    );

    expect(screen.getByText('API not available')).toBeInTheDocument();
    expect(screen.getByText('The API is not reachable')).toBeInTheDocument();
  });

  it('says the view is not integrated when the server does not serve the route', () => {
    render(
      <ErrorState
        error={new ApiError(404, 'ROUTE_NOT_FOUND', 'Not available.', 'req-1')}
      />,
    );

    expect(
      screen.getByText('This view is not integrated with the API yet'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('ROUTE_NOT_FOUND · request req-1'),
    ).toBeInTheDocument();
  });

  it('keeps an ordinary error for a missing record', () => {
    render(
      <ErrorState error={new ApiError(404, 'NOT_FOUND', 'Zone not found.')} />,
    );

    expect(screen.getByText('Could not load this view')).toBeInTheDocument();
    expect(screen.queryByText('API not available')).not.toBeInTheDocument();
  });

  it('treats an older API that lacks the route as not integrated', () => {
    render(
      <ErrorState
        error={
          new ApiError(404, 'NOT_FOUND', 'Not found.', 'req-2', null, '/api/v1/admin/overview')
        }
      />,
    );

    expect(screen.getByText('API not available')).toBeInTheDocument();
    expect(
      screen.getByText('This view is not integrated with the API yet'),
    ).toBeInTheDocument();
  });
});

describe('isApiUnavailable', () => {
  it.each([
    [new ApiError(0, 'API_UNREACHABLE', ''), true],
    [new ApiError(404, 'ROUTE_NOT_FOUND', ''), true],
    [new ApiError(503, 'INTERNAL', ''), true],
    [new ApiError(404, 'NOT_FOUND', ''), false],
    // An older API answers a route it does not have with plain NOT_FOUND.
    [new ApiError(404, 'NOT_FOUND', '', null, null, '/api/v1/admin/overview'), true],
    [new ApiError(404, 'NOT_FOUND', '', null, null, '/api/v1/admin/map'), true],
    // A missing record on a route that exists stays an ordinary error.
    [
      new ApiError(404, 'NOT_FOUND', '', null, null, '/api/v1/admin/zones/41d28714-df79-4218-bb99-308bca35cd6c'),
      false,
    ],
    [new ApiError(404, 'NOT_FOUND', '', null, null, '/api/v1/admin/jobs/999/retry'), false],
    [
      new ApiError(404, 'NOT_FOUND', '', null, null, '/api/v1/admin/users/00000000-0000-4000-8000-0000000000b1/role'),
      false,
    ],
    [new ApiError(500, 'INTERNAL', ''), false],
    [new Error('boom'), false],
  ])('classifies %o as %s', (error, expected) => {
    expect(isApiUnavailable(error)).toBe(expected);
  });
});
