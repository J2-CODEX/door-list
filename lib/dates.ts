const timeZone = "America/Guayaquil";
export function formatEventDate(value: string, hourCycle?: "h23") {
  return new Intl.DateTimeFormat("es-EC", { timeZone, dateStyle: "long", timeStyle: "short", ...(hourCycle ? { hourCycle } : {}) }).format(new Date(value));
}
export function formatEventDay(value: string) { return new Intl.DateTimeFormat("es-EC", { timeZone, day: "2-digit" }).format(new Date(value)); }
export function formatEventMonth(value: string) { return new Intl.DateTimeFormat("es-EC", { timeZone, month: "short" }).format(new Date(value)); }
export function ecuadorDate(value: string | Date = new Date()) { return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(value)); }
export function formatLocalDate(value: string) { return new Date(value).toLocaleString("es-EC"); }
export function toLocalDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
