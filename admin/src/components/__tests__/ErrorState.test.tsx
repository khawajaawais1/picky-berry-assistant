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
});

describe('isApiUnavailable', () => {
  it.each([
    [new ApiError(0, 'API_UNREACHABLE', ''), true],
    [new ApiError(404, 'ROUTE_NOT_FOUND', ''), true],
    [new ApiError(503, 'INTERNAL', ''), true],
    [new ApiError(404, 'NOT_FOUND', ''), false],
    [new ApiError(500, 'INTERNAL', ''), false],
    [new Error('boom'), false],
  ])('classifies %o as %s', (error, expected) => {
    expect(isApiUnavailable(error)).toBe(expected);
  });
});
