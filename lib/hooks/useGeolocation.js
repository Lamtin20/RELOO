"use client";

import { useCallback, useState } from "react";
import { fetchProvinces, getProvinceCoords } from "@/lib/vn-address";
import {currentLocation} from '@/lib/mobile/location';

/**
 * Hook lấy vị trí GPS của khách rồi ánh xạ về tỉnh gần nhất (dựa trên toạ độ trung tâm).
 * Không gọi reverse-geocoding external (tiết kiệm dependency, tránh cần API key).
 */
export function useGeolocation() {
  const [status, setStatus] = useState("idle"); // idle | requesting | success | error | denied
  const [coords, setCoords] = useState(null);
  const [nearestProvince, setNearestProvince] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const request = useCallback(async () => {
    setStatus("requesting");
    setErrorMsg("");

    if (typeof navigator === "undefined") {
      setStatus("error");
      setErrorMsg("Trình duyệt không hỗ trợ định vị.");
      return null;
    }

    return new Promise((resolve) => {
      const locate=(success,failure)=>currentLocation().then(coords=>success({coords})).catch(failure);
      locate(
        async (pos) => {
          const c = { lat: pos.coords.latitude, lng: pos.coords.longitude,accuracy:pos.coords.accuracy };
          setCoords(c);

          try {
            const provinces = await fetchProvinces();
            let best = null;
            let bestDist = Infinity;
            for (const p of provinces) {
              const pc = getProvinceCoords(p.codename);
              if (!pc) continue;
              const d = haversine(c, pc);
              if (d < bestDist) {
                bestDist = d;
                best = { ...p, distance: d };
              }
            }
            const result = best ? { ...best, coords: c } : null;
            setNearestProvince(result);
            setStatus("success");
            resolve(result);
          } catch (err) {
            setStatus("error");
            setErrorMsg("Không tải được danh sách tỉnh/thành.");
            resolve(null);
          }
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setStatus("denied");
            setErrorMsg("Bạn đã từ chối chia sẻ vị trí.");
          } else {
            setStatus("error");
            setErrorMsg("Không lấy được vị trí. Vui lòng chọn thủ công.");
          }
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, []);

  return { status, coords, nearestProvince, errorMsg, request };
}

function haversine(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
