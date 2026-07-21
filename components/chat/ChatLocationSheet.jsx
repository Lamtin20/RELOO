"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X, Search, Crosshair, Loader2, MapPin } from "lucide-react";

const DEFAULT_CENTER = { lat: 10.7769, lng: 106.7009 };

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

async function searchPlaces(query, lat, lng) {
  if (!query.trim()) return [];
  try {
    const bias = lat && lng ? `&viewbox=${lng - 0.05},${lat + 0.05},${lng + 0.05},${lat - 0.05}&bounded=0` : "";
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=8&countrycodes=vn&accept-language=vi${bias}`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export function ChatLocationSheet({ open, onClose, onShare, initialAddress = "" }) {
  const [coords, setCoords] = useState(DEFAULT_CENTER);
  const [address, setAddress] = useState(initialAddress);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState("current");

  const loadCurrentLocation = useCallback(async () => {
    setLoading(true);
    setSelectedId("current");

    const finish = async (lat, lng, fallbackLabel) => {
      setCoords({ lat, lng });
      const label = (await reverseGeocode(lat, lng)) || fallbackLabel;
      setAddress(label);
      setLoading(false);
    };

    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos.coords.latitude, pos.coords.longitude, "Vị trí hiện tại"),
        () => finish(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, "Hồ Chí Minh, Việt Nam"),
        { enableHighAccuracy: true, timeout: 10000 }
      );
      return;
    }

    await finish(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng, "Hồ Chí Minh, Việt Nam");
  }, []);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPlaces([]);
    loadCurrentLocation();
  }, [open, loadCurrentLocation]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setPlaces([]);
        return;
      }
      setSearching(true);
      const results = await searchPlaces(search, coords.lat, coords.lng);
      setPlaces(results);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, open, coords.lat, coords.lng]);

  const mapSrc = useMemo(() => {
    const { lat, lng } = coords;
    return `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
  }, [coords]);

  function handleSelectPlace(place) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    setCoords({ lat, lng });
    setAddress(place.display_name);
    setSelectedId(String(place.place_id ?? place.osm_id ?? place.display_name));
  }

  function handleShare() {
    onShare?.({
      lat: coords.lat,
      lng: coords.lng,
      address,
      label: "Vị trí hiện tại",
    });
    onClose?.();
  }

  if (!open) return null;

  const listItems =
    places.length > 0
      ? places
      : address
        ? [{ place_id: "current", display_name: address, lat: coords.lat, lon: coords.lng }]
        : [];

  return (
    <div className="chat-loc-sheet" role="dialog" aria-modal="true" aria-label="Chọn địa điểm">
      <header className="chat-loc-sheet__header">
        <button type="button" className="chat-loc-sheet__icon-btn" onClick={onClose} aria-label="Đóng">
          <X size={22} />
        </button>
        <h2>Địa điểm</h2>
        <button type="button" className="chat-loc-sheet__share" onClick={handleShare} disabled={loading}>
          Chia sẻ
        </button>
      </header>

      <div className="chat-loc-sheet__map-wrap">
        {loading ? (
          <div className="chat-loc-sheet__map-loading">
            <Loader2 size={28} className="spin" />
            <span>Đang lấy vị trí...</span>
          </div>
        ) : (
          <>
            <iframe
              title="Bản đồ vị trí"
              src={mapSrc}
              className="chat-loc-sheet__map"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="chat-loc-sheet__pin-tooltip">{address}</div>
            <button
              type="button"
              className="chat-loc-sheet__recenter"
              onClick={loadCurrentLocation}
              aria-label="Về vị trí hiện tại"
            >
              <Crosshair size={20} />
            </button>
          </>
        )}
      </div>

      <div className="chat-loc-sheet__panel">
        <div className="chat-loc-sheet__search">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm"
          />
          {searching && <Loader2 size={16} className="spin" />}
        </div>

        <ul className="chat-loc-sheet__list">
          {listItems.map((place) => {
            const id = String(place.place_id ?? place.osm_id ?? place.display_name);
            const name = place.name || place.display_name?.split(",")[0] || "Địa điểm";
            const sub = place.display_name;
            return (
              <li key={id}>
                <button
                  type="button"
                  className={`chat-loc-sheet__place ${selectedId === id ? "is-selected" : ""}`}
                  onClick={() => handleSelectPlace(place)}
                >
                  <MapPin size={16} />
                  <div>
                    <strong>{name}</strong>
                    <span>{sub}</span>
                  </div>
                </button>
              </li>
            );
          })}
          {!loading && listItems.length === 0 && (
            <li className="chat-loc-sheet__empty">Không tìm thấy địa điểm</li>
          )}
        </ul>
      </div>
    </div>
  );
}
