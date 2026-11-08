export function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(+date)) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = (key) => parts.find((part) => part.type === key).value;
  return `${p("year")}-${p("month")}-${p("day")}T${p("hour")}:${p("minute")}`;
}
export function fromLocalDateTime(value) {
  return value ? new Date(`${value}:00+07:00`).toISOString() : "";
}
