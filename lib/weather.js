export function parseForecast(data, now = Date.now()) {
  if (!Array.isArray(data.ts) || !data.ts.length) throw new Error("Forecast timestamps missing");
  const index = data.ts.reduce((best, timestamp, i) => Math.abs(timestamp - now) < Math.abs(data.ts[best] - now) ? i : best, 0);
  const value = data["temp-surface"]?.[index];
  if (!Number.isFinite(value)) throw new Error("Forecast temperature missing");
  const unit = data.units?.["temp-surface"];
  const celsius = unit === "K" ? value - 273.15 : unit === "°C" || unit === "C" ? value : null;
  if (celsius === null) throw new Error("Forecast temperature unit unknown");
  const cloud = Math.max(...["lclouds", "mclouds", "hclouds"].map((name) => data[`${name}-surface`]?.[index] ?? 0));
  const precipitation = data["past3hprecip-surface"]?.[index] ?? 0;
  const ptype = data["ptype-surface"]?.[index];
  const condition = ptype === 5 || ptype === 7 ? "snow" : precipitation > 0.1 || [1, 3, 8].includes(ptype) ? "rain" : cloud > 65 ? "cloud" : cloud > 25 ? "partly-cloudy" : "sun";
  return { temperature: Math.round(celsius), condition, forecastAt: new Date(data.ts[index]).toISOString(), source: "Windy", model: "gfs" };
}
