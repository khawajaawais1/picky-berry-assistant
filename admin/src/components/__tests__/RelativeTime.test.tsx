import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { RelativeTime } from '../RelativeTime';

describe('RelativeTime', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders the relative label and keeps the absolute timestamp', () => {
    vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));
    const { container } = render(
      <RelativeTime value="2026-11-26T11:59:50Z" />,
    );
    expect(screen.getByText('just now')).toBeInTheDocument();
    expect(container.querySelector('time')?.getAttribute('dateTime')).toBe(
      '2026-11-26T11:59:50Z',
    );
  });

  it('re-renders after the 30 second tick', () => {
    vi.setSystemTime(new Date('2026-11-26T12:00:00Z'));
    render(<RelativeTime value="2026-11-26T11:58:00Z" />);
    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    vi.setSystemTime(new Date('2026-11-26T12:01:00Z'));
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByText('3 minutes ago')).toBeInTheDocument();
  });
});
