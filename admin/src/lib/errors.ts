import { ApiError } from '../api/client';

export function errorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    return cause.requestId
      ? `${cause.message} (request ${cause.requestId})`
      : cause.message;
  }
  return cause instanceof Error ? cause.message : 'Something went wrong.';
}
