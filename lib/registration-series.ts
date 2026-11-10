import type { EventRegistrationCounts, EventRegistrationSeries } from "./dashboard";
import { ecuadorDate, nextCalendarDate } from "./dates";

export function buildRegistrationSeries(counts: EventRegistrationCounts, now = new Date()): EventRegistrationSeries {
  const endDate = ecuadorDate(now);
  // Old events have no recorded publication timestamp. Never substitute creation.
  const firstDay = counts.publishedAt ?? counts.firstRegistrationAt;
  const startDate = firstDay ? ecuadorDate(firstDay) : null;
  const totals = new Map(counts.days.map(day => [day.date, day.count]));
  const days: EventRegistrationSeries["days"] = [];
  if (startDate) {
    for (let date = startDate; date <= endDate; date = nextCalendarDate(date)) {
      days.push({ date, count: totals.get(date) ?? 0 });
    }
  }
  return { eventId: counts.eventId, publishedAt: counts.publishedAt, startDate, endDate, days };
}
