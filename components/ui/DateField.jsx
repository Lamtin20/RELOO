"use client";

// Keep the native date picker while showing a consistent, visible empty value.
export function DateField({ value, ...props }) {
  return <span className="date-field">
    <span aria-hidden="true">{value ? value.split("-").reverse().join("/") : "dd/mm/yyyy"}</span>
    <input {...props} type="date" value={value} />
  </span>;
}
