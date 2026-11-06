function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Object.fromEntries(parts.filter((p) => p.type !== "literal").map((p) => [p.type, Number(p.value)])) as Record<string, number>;
}

function localMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  let guess = Date.UTC(year, month - 1, day, 0, 0, 0);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = partsInZone(new Date(guess), timeZone);
    const representedUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour % 24, local.minute, local.second);
    const targetUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
    const correction = targetUtc - representedUtc;
    if (!correction) break;
    guess += correction;
  }
  return new Date(guess);
}

/** Returns the organization's local calendar-day window without using server timezone. */
export function dayWindowInZone(now: Date, timeZone: string) {
  const local = partsInZone(now, timeZone);
  const start = localMidnightUtc(local.year, local.month, local.day, timeZone);
  const nextDate = new Date(Date.UTC(local.year, local.month - 1, local.day + 1));
  const end = localMidnightUtc(nextDate.getUTCFullYear(), nextDate.getUTCMonth() + 1, nextDate.getUTCDate(), timeZone);
  return { start, end };
}
