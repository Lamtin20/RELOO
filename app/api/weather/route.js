import { parseForecast } from "@/lib/weather";
import { errorResponse, HttpError, rateLimit } from "@/lib/server/http";
const forecasts = new Map();
export async function GET(request) {
  try {
    rateLimit(request, "weather", 40);
    const url = new URL(request.url);
    const lat = Number(url.searchParams.get("lat") || 10.78), lon = Number(url.searchParams.get("lon") || 106.7);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < 8 || lat > 24 || lon < 102 || lon > 110) throw new HttpError(400, "Khu vực thời tiết không hợp lệ.");
    const key = `${lat.toFixed(1)},${lon.toFixed(1)}`, cached = forecasts.get(key);
    if (cached?.expires > Date.now()) return Response.json({ ok: true, ...cached.result });
    if (!process.env.WINDY_API_KEY) throw new HttpError(503, "Chưa có dữ liệu thời tiết.", "WEATHER_UNAVAILABLE");
    const response = await fetch("https://api.windy.com/api/point-forecast/v2", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10000),
      body: JSON.stringify({ lat: Number(lat.toFixed(1)), lon: Number(lon.toFixed(1)), model: "gfs", parameters: ["temp", "precip", "lclouds", "mclouds", "hclouds", "ptype"], levels: ["surface"], key: process.env.WINDY_API_KEY }),
    });
    if (!response.ok) throw new HttpError(503, "Chưa tải được dự báo thời tiết.", "WEATHER_UNAVAILABLE");
    const result = parseForecast(await response.json());
    if (forecasts.size > 200) forecasts.clear();
    forecasts.set(key, { result, expires: Date.now() + 1800000 });
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) { return errorResponse(error); }
}
