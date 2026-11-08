export function rentalDays(value) {
  if (!/^[1-9][0-9]{0,2}$/.test(String(value ?? ""))) return 0;
  const days = Number(value);
  return days <= 365 ? days : 0;
}
