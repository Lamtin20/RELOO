"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Search, Navigation, Loader2, Check, X } from "lucide-react";
import { fetchProvinces, fetchWards } from "@/lib/vn-address";
import { useGeolocation } from "@/lib/hooks/useGeolocation";

/**
 * LocationPicker - chọn Tỉnh/Thành + Phường/Xã.
 *
 * Props:
 *  - value:       { province, ward }
 *  - onChange:    (value) => void
 *  - mode:        "inline" | "modal" (mặc định inline)
 *  - includeStreet: boolean - thêm ô nhập số nhà/đường
 *  - streetValue, onStreetChange
 *  - autoGeo:     boolean - tự đề nghị dùng GPS
 *  - label:       string
 *  - geoLabel:    string - nhãn nút định vị
 *  - streetLabel: string - nhãn ô chi tiết địa chỉ
 *  - hint:        string - gợi ý dưới picker
 */
export function LocationPicker({
  value,
  onChange,
  includeStreet = false,
  streetValue = "",
  onStreetChange,
  autoGeo = true,
  label = "Khu vực",
  geoLabel = "Dùng vị trí hiện tại của tôi",
  streetLabel = "Số nhà, tên đường",
  hint = "",
  compact = false,
}) {
  const [provinces, setProvinces] = useState([]);
  const [loadingProv, setLoadingProv] = useState(false);
  const [wards, setWards] = useState([]);
  const [loadingWards, setLoadingWards] = useState(false);
  const [openProv, setOpenProv] = useState(false);
  const [openWard, setOpenWard] = useState(false);
  const [provQ, setProvQ] = useState("");
  const [wardQ, setWardQ] = useState("");

  const provRef = useRef(null);
  const wardRef = useRef(null);
  const geo = useGeolocation();

  useEffect(() => {
    let alive = true;
    setLoadingProv(true);
    fetchProvinces()
      .then((data) => {
        if (alive) setProvinces(data);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingProv(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!value?.province?.code) {
      setWards([]);
      return;
    }
    let alive = true;
    setLoadingWards(true);
    fetchWards(value.province.code)
      .then((data) => {
        if (alive) setWards(data);
      })
      .catch(() => {})
      .finally(() => alive && setLoadingWards(false));
    return () => {
      alive = false;
    };
  }, [value?.province?.code]);

  useEffect(() => {
    function onDoc(e) {
      if (provRef.current && !provRef.current.contains(e.target)) setOpenProv(false);
      if (wardRef.current && !wardRef.current.contains(e.target)) setOpenWard(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filteredProv = useMemo(() => {
    const q = provQ.trim().toLowerCase();
    if (!q) return provinces;
    return provinces.filter((p) =>
      [p.name, p.codename].some((s) => s?.toLowerCase().includes(q))
    );
  }, [provinces, provQ]);

  const filteredWards = useMemo(() => {
    const q = wardQ.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) =>
      [w.name, w.codename].some((s) => s?.toLowerCase().includes(q))
    );
  }, [wards, wardQ]);

  function pickProvince(p) {
    onChange?.({ province: p, ward: null, coords: null });
    setOpenProv(false);
    setProvQ("");
    setWardQ("");
  }

  function pickWard(w) {
    onChange?.({ ...value, ward: w });
    setOpenWard(false);
    setWardQ("");
  }

  async function useMyLocation() {
    const nearest = await geo.request();
    if (nearest) {
      const match = provinces.find((p) => p.code === nearest.code) || nearest;
      onChange?.({
        province: match,
        ward: null,
        coords: nearest.coords ?? null,
      });
    }
  }

  return (
    <div className={`loc-picker ${compact ? "loc-picker--compact" : ""}`}>
      {label && <div className="loc-picker__label">{label}</div>}

      {autoGeo && (
        <button
          type="button"
          onClick={useMyLocation}
          className="loc-picker__geo"
          disabled={geo.status === "requesting"}
        >
          {geo.status === "requesting" ? (
            <>
              <Loader2 size={14} className="spin" /> Đang xác định vị trí...
            </>
          ) : (
            <>
              <Navigation size={14} /> {geoLabel}
            </>
          )}
        </button>
      )}

      {geo.errorMsg && <div className="loc-picker__hint loc-picker__hint--warn">{geo.errorMsg}</div>}

      {value?.coords && (
        <div className="loc-picker__hint loc-picker__hint--ok">
          Đã định vị GPS ({value.coords.lat.toFixed(5)}, {value.coords.lng.toFixed(5)})
        </div>
      )}

      <div className="loc-picker__row">
        <div className="loc-picker__field" ref={provRef}>
          <label className="loc-picker__caption">Tỉnh / Thành phố</label>
          <button
            type="button"
            className="loc-picker__select"
            onClick={() => setOpenProv((v) => !v)}
          >
            <MapPin size={14} />
            <span className="loc-picker__select-text">
              {value?.province?.name || (loadingProv ? "Đang tải..." : "Chọn tỉnh/thành")}
            </span>
          </button>

          {openProv && (
            <div className="loc-picker__dropdown">
              <div className="loc-picker__search">
                <Search size={14} />
                <input
                  autoFocus
                  value={provQ}
                  onChange={(e) => setProvQ(e.target.value)}
                  placeholder="Tìm tỉnh/thành..."
                />
                {provQ && (
                  <button type="button" onClick={() => setProvQ("")} className="loc-picker__clear">
                    <X size={12} />
                  </button>
                )}
              </div>
              <ul className="loc-picker__list">
                {filteredProv.map((p) => (
                  <li key={p.code}>
                    <button type="button" onClick={() => pickProvince(p)}>
                      <span>{p.name}</span>
                      {value?.province?.code === p.code && <Check size={14} />}
                    </button>
                  </li>
                ))}
                {filteredProv.length === 0 && (
                  <li className="loc-picker__empty">Không tìm thấy</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="loc-picker__field" ref={wardRef}>
          <label className="loc-picker__caption">Phường / Xã</label>
          <button
            type="button"
            className="loc-picker__select"
            onClick={() => value?.province && setOpenWard((v) => !v)}
            disabled={!value?.province}
          >
            <MapPin size={14} />
            <span className="loc-picker__select-text">
              {value?.ward?.name ||
                (!value?.province
                  ? "Chọn tỉnh trước"
                  : loadingWards
                  ? "Đang tải..."
                  : "Chọn phường/xã")}
            </span>
          </button>

          {openWard && (
            <div className="loc-picker__dropdown">
              <div className="loc-picker__search">
                <Search size={14} />
                <input
                  autoFocus
                  value={wardQ}
                  onChange={(e) => setWardQ(e.target.value)}
                  placeholder="Tìm phường/xã..."
                />
                {wardQ && (
                  <button type="button" onClick={() => setWardQ("")} className="loc-picker__clear">
                    <X size={12} />
                  </button>
                )}
              </div>
              <ul className="loc-picker__list">
                {filteredWards.map((w) => (
                  <li key={w.code}>
                    <button type="button" onClick={() => pickWard(w)}>
                      <span>
                        <strong>{w.name}</strong>
                        <em className="loc-picker__list-sub">{w.division_type}</em>
                      </span>
                      {value?.ward?.code === w.code && <Check size={14} />}
                    </button>
                  </li>
                ))}
                {filteredWards.length === 0 && (
                  <li className="loc-picker__empty">
                    {loadingWards ? "Đang tải..." : "Không tìm thấy"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {includeStreet && (
        <div className="loc-picker__street">
          <label className="loc-picker__caption">{streetLabel}</label>
          <input
            className="loc-picker__street-input"
            value={streetValue}
            onChange={(e) => onStreetChange?.(e.target.value)}
            placeholder="VD: Tòa S1.01 Vinhomes Grand Park, 123 Nguyễn Xiển"
          />
        </div>
      )}

      {hint && <div className="loc-picker__hint">{hint}</div>}
    </div>
  );
}
