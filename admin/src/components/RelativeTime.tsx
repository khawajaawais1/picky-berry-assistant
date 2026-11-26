import { useEffect, useState } from 'react';
import { formatRelative, formatDate } from '../lib/format';

export function RelativeTime({
  value,
}: {
  value: string | null | undefined;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((tick) => tick + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <time dateTime={value ?? undefined} title={value ? formatDate(value) : undefined}>
      {formatRelative(value)}
    </time>
  );
}
