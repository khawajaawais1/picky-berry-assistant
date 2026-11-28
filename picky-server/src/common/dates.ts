const HELSINKI_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Helsinki',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInHelsinki(now = new Date()): string {
  const parts = Object.fromEntries(
    HELSINKI_DATE.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function helsinkiDayBounds(now = new Date()): {
  start: Date;
  end: Date;
} {
  const date = todayInHelsinki(now);
  const [year, month, day] = date.split('-').map(Number);
  const nextDay = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDate = `${nextDay.getUTCFullYear()}-${String(
    nextDay.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
  return {
    start: localMidnightAsUtc(date),
    end: localMidnightAsUtc(nextDate),
  };
}

export function helsinkiWindowBounds(
  days: number,
  now = new Date(),
): {
  fromDay: string;
  toDay: string;
  start: Date;
  end: Date;
} {
  const toDay = todayInHelsinki(now);
  const fromDay = shiftDate(toDay, 1 - days);
  return {
    fromDay,
    toDay,
    start: localMidnightAsUtc(fromDay),
    end: localMidnightAsUtc(shiftDate(toDay, 1)),
  };
}

function shiftDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return `${shifted.getUTCFullYear()}-${String(
    shifted.getUTCMonth() + 1,
  ).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function localMidnightAsUtc(date: string): Date {
  const noonUtc = new Date(`${date}T12:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Helsinki',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(noonUtc)
      .map(({ type, value }) => [type, value]),
  );
  const localAtUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  const offsetMs = localAtUtc - noonUtc.getTime();
  return new Date(Date.parse(`${date}T00:00:00Z`) - offsetMs);
}
