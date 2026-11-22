import { useCallback, useEffect, useState } from 'react';
import { ApiError, api } from '../api/client';

interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
}

export function useApi<T>(
  path: string | null,
): ApiState<T> & { reload: () => void } {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: path !== null,
  });

  useEffect(() => {
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    let active = true;
    setState((current) => ({
      data: current.data,
      error: null,
      loading: true,
    }));
    api<T>(path)
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setState({
          data: null,
          error:
            error instanceof ApiError
              ? error
              : new ApiError(
                  0,
                  'UNKNOWN',
                  error instanceof Error ? error.message : 'Request failed.',
                ),
          loading: false,
        });
      });
    return () => {
      active = false;
    };
  }, [path, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  return { ...state, reload };
}

export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
