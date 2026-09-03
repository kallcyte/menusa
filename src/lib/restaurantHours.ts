export type RestaurantHoursStatusKind = "open" | "closingSoon" | "openingSoon" | "closed" | "unknown";

export type RestaurantHoursStatus = {
  kind: RestaurantHoursStatusKind;
  closingAt?: number;
  openingAt?: number;
  openingDay?: number;
};

type DaySchedule = { open: number; close: number };

const DAY_ALIASES: Array<[string, number]> = [
  ["minggu", 0], ["min", 0], ["sun", 0], ["sunday", 0],
  ["senin", 1], ["sen", 1], ["mon", 1], ["monday", 1],
  ["selasa", 2], ["sel", 2], ["tue", 2], ["tuesday", 2],
  ["rabu", 3], ["rab", 3], ["wed", 3], ["wednesday", 3],
  ["kamis", 4], ["kam", 4], ["thu", 4], ["thursday", 4],
  ["jumat", 5], ["jum", 5], ["fri", 5], ["friday", 5],
  ["sabtu", 6], ["sab", 6], ["sat", 6], ["saturday", 6],
];

const DAY_PATTERN = new RegExp(`\\b(${DAY_ALIASES.map(([name]) => name).join("|")})\\b`, "gi");
const TIME_TOKEN = String.raw`\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)?`;
const TIME_RANGE_PATTERN = new RegExp(`(${TIME_TOKEN})\\s*(?:-|–|—|to)\\s*(${TIME_TOKEN})`, "i");

function parseDayIndexes(prefix: string): number[] {
  const matches = [...prefix.matchAll(DAY_PATTERN)].map((match) => {
    const value = match[1].toLowerCase();
    return DAY_ALIASES.find(([name]) => name === value)?.[1];
  }).filter((day): day is number => day !== undefined);
  if (!matches.length) return [0, 1, 2, 3, 4, 5, 6];
  if (matches.length < 2 || !/(?:-|–|—|to|sampai)/i.test(prefix)) return [...new Set(matches)];
  const days: number[] = [];
  for (let day = matches[0];; day = (day + 1) % 7) {
    days.push(day);
    if (day === matches[1]) break;
    if (days.length === 7) break;
  }
  return days;
}

function meridiemOf(value: string): "am" | "pm" | undefined {
  const match = value.match(/(a\.?m\.?|p\.?m\.?)$/i);
  if (!match) return undefined;
  return match[1].toLowerCase().startsWith("a") ? "am" : "pm";
}

function parseClock(value: string, inferredMeridiem?: "am" | "pm"): number | undefined {
  const match = value.match(/\d{1,2}(?::\d{2})?/);
  if (!match) return undefined;
  const [hourText, minuteText = "00"] = match[0].split(":");
  let hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour > 23 || minute > 59) return undefined;
  const meridiem = meridiemOf(value) ?? inferredMeridiem;
  if (meridiem) {
    if (hour > 12 || hour === 0) return undefined;
    if (meridiem === "am" && hour === 12) hour = 0;
    if (meridiem === "pm" && hour < 12) hour += 12;
  }
  return hour * 60 + minute;
}

function inferOpeningMeridiem(opening: string, closing: string): "am" | "pm" | undefined {
  if (meridiemOf(opening)) return undefined;
  const closingMeridiem = meridiemOf(closing);
  if (!closingMeridiem) return undefined;
  const hour = Number(opening.match(/\d{1,2}/)?.[0]);
  if (!Number.isFinite(hour)) return undefined;
  if (closingMeridiem === "pm" && hour <= 6) return "pm";
  return "am";
}

function parseRange(segment: string): { days: number[]; schedule: DaySchedule } | undefined {
  const match = segment.match(TIME_RANGE_PATTERN);
  if (!match || match.index === undefined) return undefined;
  const openingMeridiem = inferOpeningMeridiem(match[1], match[2]);
  const open = parseClock(match[1], openingMeridiem);
  const closeValue = parseClock(match[2]);
  if (open === undefined || closeValue === undefined) return undefined;
  const close = closeValue <= open ? closeValue + 24 * 60 : closeValue;
  return {
    days: parseDayIndexes(segment.slice(0, match.index)),
    schedule: { open, close },
  };
}

function parseSchedule(hours?: string, hoursDetail?: string): DaySchedule[] | undefined {
  const detailSegments = (hoursDetail ?? "").split(/[·•|;]/).map((segment) => segment.trim()).filter(Boolean);
  const detailRanges = detailSegments.map((segment) => parseRange(segment)).filter((range): range is NonNullable<typeof range> => Boolean(range));
  const ranges = detailRanges.length ? detailRanges : (hours ? [parseRange(hours)].filter((range): range is NonNullable<typeof range> => Boolean(range)) : []);
  if (!ranges.length) return undefined;
  const schedule: DaySchedule[] = [];
  for (const range of ranges) {
    for (const day of range.days) schedule[day] = range.schedule;
  }
  return schedule;
}

export function getRestaurantHoursStatus(hours?: string, hoursDetail?: string, now = new Date()): RestaurantHoursStatus {
  const schedule = parseSchedule(hours, hoursDetail);
  if (!schedule) return { kind: "unknown" };

  const currentDay = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const today = schedule[currentDay];
  if (today && currentMinutes >= today.open && currentMinutes < today.close) {
    const minutesUntilClose = today.close - currentMinutes;
    return {
      kind: minutesUntilClose <= 60 ? "closingSoon" : "open",
      closingAt: today.close % (24 * 60),
    };
  }

  const previousDay = schedule[(currentDay + 6) % 7];
  if (previousDay && previousDay.close > 24 * 60 && currentMinutes < previousDay.close - 24 * 60) {
    const minutesUntilClose = previousDay.close - 24 * 60 - currentMinutes;
    return {
      kind: minutesUntilClose <= 60 ? "closingSoon" : "open",
      closingAt: previousDay.close % (24 * 60),
    };
  }

  for (let dayOffset = 0; dayOffset <= 7; dayOffset += 1) {
    const day = (currentDay + dayOffset) % 7;
    const next = schedule[day];
    if (!next) continue;
    const minutesUntilOpen = dayOffset * 24 * 60 + next.open - currentMinutes;
    if (minutesUntilOpen <= 0) continue;
    return {
      kind: minutesUntilOpen <= 60 ? "openingSoon" : "closed",
      openingAt: next.open % (24 * 60),
      openingDay: day,
    };
  }

  return { kind: "unknown" };
}
