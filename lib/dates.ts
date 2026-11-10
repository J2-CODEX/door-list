const timeZone = "America/Guayaquil";
export function formatEventDate(value: string, hourCycle?: "h23") {
  return new Intl.DateTimeFormat("es-EC", { timeZone, dateStyle: "long", timeStyle: "short", ...(hourCycle ? { hourCycle } : {}) }).format(new Date(value));
}
export function formatEventDay(value: string) { return new Intl.DateTimeFormat("es-EC", { timeZone, day: "2-digit" }).format(new Date(value)); }
export function formatEventMonth(value: string) { return new Intl.DateTimeFormat("es-EC", { timeZone, month: "short" }).format(new Date(value)); }
export function ecuadorDate(value: string | Date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(value)); }
// A date-only value belongs to Ecuador's calendar; UTC prevents shifting its day.
export function formatCalendarDate(value: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("es-EC", { timeZone: "UTC", day: "numeric", month: style, ...(style === "long" ? { year: "numeric" } : {}) }).format(new Date(`${value}T00:00:00Z`));
}
export function nextCalendarDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function formatLocalDate(value: string) { return new Date(value).toLocaleString("es-EC"); }
export function toLocalDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
