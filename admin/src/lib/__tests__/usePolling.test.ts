import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { usePolling } from '../usePolling';

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('fires on the interval while enabled', () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000));
    expect(callback).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('does nothing while disabled', () => {
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000, false));
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(callback).not.toHaveBeenCalled();
  });

  it('stops while hidden and refreshes when visible again', () => {
    let state: 'visible' | 'hidden' = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => state,
    });
    const callback = vi.fn();
    renderHook(() => usePolling(callback, 5000));
    const before = callback.mock.calls.length;
    state = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(callback.mock.calls.length).toBe(before);
    state = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback.mock.calls.length).toBeGreaterThan(before);
  });
});
