"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  Navigation,
  Search,
  X,
} from "lucide-react";
import { fetchProvinces, fetchWards, formatAddressString } from "@/lib/vn-address";
import { formatProvinceFilterLabel } from "@/lib/listing-location";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import {locationLabel} from '@/lib/location-label';
import {LocationMap} from './LocationMap';

const DEFAULT_RADIUS = 20;

function wardPickerLabel(wards) {
  if (!wards?.length) return "Tất cả phường/xã";
  if (wards.length === 1) return wards[0].name;
  return `${wards.length} phường/xã đã chọn`;
}

/**
 * Sheet chọn khu vực tìm kiếm (Chợ Tốt style)
 * mode: current → có bán kính | province → lọc theo tỉnh + phường/xã (multi)
 */
export function ExploreLocationSheet({open,...props}){return open?<ExploreLocationContent open {...props}/>:null;}
function ExploreLocationContent({
  open,
  onClose,
  value,
  onApply,
  radius = DEFAULT_RADIUS,
}) {
  const root = useRef(null), close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current?.querySelector('button')?.focus({preventScroll:true});
    function keydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current?.(); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...(root.current?.querySelectorAll('button,input,select,a[href],[tabindex="0"]') || [])].filter(node => !node.disabled && node.getClientRects().length);
      const first=nodes[0], last=nodes.at(-1);
      if (event.shiftKey && document.activeElement===first) {event.preventDefault();last?.focus();}
      else if (!event.shiftKey && document.activeElement===last) {event.preventDefault();first?.focus();}
    }
    document.addEventListener('keydown',keydown,true);
    return () => {document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown,true);if(previous?.isConnected)previous.focus({preventScroll:true});};
  }, [open]);
  const [view, setView] = useState("main");
  const [mode, setMode] = useState(value?.mode || "current");
  const [location, setLocation] = useState(value?.location || null);
  const [localRadius, setLocalRadius] = useState(radius);
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProv, setLoadingProv] = useState(true);
  const [loadingWards, setLoadingWards] = useState(false);
  const [provQ, setProvQ] = useState("");
  const [wardQ, setWardQ] = useState("");
  const geo = useGeolocation();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetchProvinces()
      .then((data) => alive && setProvinces(data))
      .catch(() => {})
      .finally(() => alive && setLoadingProv(false));
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || mode !== "province" || !location?.province?.code) {
      const reset=setTimeout(()=>setWards([]),0);
      return()=>clearTimeout(reset);
    }
    let alive = true;
    Promise.resolve().then(()=>{if(alive)setLoadingWards(true);});
    fetchWards(location.province.code)
      .then((data) => alive && setWards(data))
      .catch(() => alive && setWards([]))
      .finally(() => alive && setLoadingWards(false));
    return () => {
      alive = false;
    };
  }, [open, mode, location?.province?.code]);

  useEffect(() => {
    if (!open || mode !== "current" || location?.province) return;
    if (geo.status === "idle") {
      geo.request().then((nearest) => {
        if (nearest) setLocation({ province: nearest, ward: null, wards: null });
      });
    }
  }, [open, mode, location?.province, geo]);

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

  const selectedWardCodes = useMemo(
    () => new Set((location?.wards || []).map((w) => w.code)),
    [location?.wards]
  );

  const isAllWards = !location?.wards?.length;

  const currentLabel = useMemo(() => {
    if (location?.ward?.name && location?.province?.name) {
      return `${location.ward.name}, ${location.province.name}`;
    }
    if (location?.province?.name) return location.province.name;
    if (geo.status === "requesting") return "Đang xác định vị trí...";
    return "Vị trí hiện tại của bạn";
  }, [location, geo.status]);

  function selectCurrent() {
    setMode("current");
    if (!location?.province && geo.nearestProvince) {
      setLocation({ province: geo.nearestProvince, ward: null, wards: null });
    }
  }

  function selectProvince(p) {
    setMode("province");
    setLocation({ province: p, ward: null, wards: null });
    setView("main");
    setProvQ("");
  }

  function selectAllWards() {
    setLocation((prev) => ({ ...prev, wards: null }));
  }

  function toggleWard(w) {
    setLocation((prev) => {
      const current = prev?.wards || [];
      const exists = current.some((x) => x.code === w.code);
      if (exists) {
        const next = current.filter((x) => x.code !== w.code);
        return { ...prev, wards: next.length ? next : null };
      }
      return { ...prev, wards: [...current, w] };
    });
  }

  async function refreshGps() {
    const nearest = await geo.request();
    if (nearest) {
      setMode("current");
      setLocation({ province: nearest, ward: null, wards: null });
    }
  }

  function handleApply() {
    onApply?.({
      mode,
      location,
      radius: mode === "current" ? localRadius : null,
      address:
        mode === "current"
          ? formatAddressString(location || {}) || currentLabel
          : formatProvinceFilterLabel(location?.province, location?.wards),
    });
    onClose?.();
  }

  function handleClear() {
    onApply?.({
      mode: "current",
      location: null,
      radius: DEFAULT_RADIUS,
      address: "",
    });
    onClose?.();
  }

  if (!open) return null;

  return (
    <div ref={root} className="explore-loc-sheet" role="dialog" aria-modal="true" aria-labelledby="explore-location-title">
      <div className="explore-loc-sheet__backdrop" onClick={onClose} />

      {view === "main" ? (
        <div className="explore-loc-sheet__panel">
          <div className="explore-loc-sheet__head">
            <h3 id="explore-location-title">Khu vực</h3>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Đóng">
              <X size={18} />
            </button>
          </div>

          <div className="explore-loc-sheet__body">
            <button
              type="button"
              className={`explore-loc-sheet__option ${mode === "current" ? "is-active" : ""}`}
              onClick={selectCurrent}
            >
              <span className="explore-loc-sheet__option-icon explore-loc-sheet__option-icon--gps">
                <Navigation size={18} />
              </span>
              <span className="explore-loc-sheet__option-text">
                <strong>Vị trí hiện tại</strong>
                <em>{locationLabel(currentLabel)}</em>
              </span>
              {mode === "current" && <Check size={18} className="explore-loc-sheet__check" />}
            </button>

            <button
              type="button"
              className="explore-loc-sheet__refresh"
              onClick={refreshGps}
              disabled={geo.status === "requesting"}
            >
              {geo.status === "requesting" ? (
                <>
                  <Loader2 size={14} className="spin" /> Đang cập nhật GPS...
                </>
              ) : (
                <>Cập nhật vị trí GPS</>
              )}
            </button>

            <div className="explore-loc-sheet__divider">
              <span>hoặc chọn tỉnh thành</span>
            </div>

            <button
              type="button"
              className={`explore-loc-sheet__province-btn ${mode === "province" ? "is-active" : ""}`}
              onClick={() => setView("provinces")}
            >
              <MapPin size={16} />
              <span>
                {location?.province?.name && mode === "province"
                  ? locationLabel(location.province.name)
                  : "Chọn tỉnh thành"}
              </span>
              <ChevronDown size={16} />
            </button>

            {mode === "province" && location?.province && (
              <button
                type="button"
                className="explore-loc-sheet__province-btn explore-loc-sheet__ward-btn"
                onClick={() => setView("wards")}
              >
                <MapPin size={16} />
                <span>{wardPickerLabel(location.wards)}</span>
                <ChevronDown size={16} />
              </button>
            )}

            {(location?.coords||location?.province)&&<LocationMap coords={mode==='current'?location.coords:null} address={[location?.ward?.name,location?.province?.name].filter(Boolean).join(', ')} approximate={mode!=='current'||!location?.coords}/>}
            {mode === "current" && (
              <div className="explore-loc-sheet__radius">
                <div className="explore-loc-sheet__radius-head">
                  <strong>Tìm kiếm gần bạn</strong>
                  <span className="explore-radius-badge">{localRadius} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={localRadius}
                  onChange={(e) => setLocalRadius(Number(e.target.value))}
                  className="explore-radius-slider"
                  style={{ "--radius-pct": `${((localRadius - 1) / 49) * 100}%` }}
                />
                <div className="explore-radius-scale">
                  <span>1 km</span>
                  <span>50 km</span>
                </div>
              </div>
            )}
          </div>

          <div className="explore-loc-sheet__foot">
            <button type="button" className="btn btn-ghost" onClick={handleClear}>
              Xóa lọc
            </button>
            <button type="button" className="btn btn-ct" onClick={handleApply}>
              Áp dụng
            </button>
          </div>
        </div>
      ) : view === "provinces" ? (
        <div className="explore-loc-sheet__panel explore-loc-sheet__panel--full">
          <div className="explore-loc-sheet__head">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setView("main")}
              aria-label="Quay lại"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 id="explore-location-title">Tỉnh thành</h3>
            <span className="explore-loc-sheet__head-spacer" />
          </div>

          <div className="explore-loc-sheet__search">
            <Search size={16} />
            <input
              value={provQ}
              onChange={(e) => setProvQ(e.target.value)}
              placeholder="Tìm tỉnh thành"
              autoFocus
            />
          </div>

          <ul className="explore-loc-sheet__prov-list">
            {loadingProv && (
              <li className="explore-loc-sheet__prov-empty">
                <Loader2 size={16} className="spin" /> Đang tải...
              </li>
            )}
            {!loadingProv &&
              filteredProv.map((p) => (
                <li key={p.code}>
                  <button type="button" onClick={() => selectProvince(p)}>
                    <span>{locationLabel(p.name)}</span>
                    <span
                      className={`explore-loc-sheet__radio ${
                        mode === "province" && location?.province?.code === p.code ? "is-on" : ""
                      }`}
                    />
                  </button>
                </li>
              ))}
            {!loadingProv && filteredProv.length === 0 && (
              <li className="explore-loc-sheet__prov-empty">Không tìm thấy tỉnh thành</li>
            )}
          </ul>
        </div>
      ) : (
        <div className="explore-loc-sheet__panel explore-loc-sheet__panel--full">
          <div className="explore-loc-sheet__head">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setView("main")}
              aria-label="Quay lại"
            >
              <ArrowLeft size={20} />
            </button>
            <h3 id="explore-location-title">Phường / Xã</h3>
            <span className="explore-loc-sheet__head-spacer" />
          </div>

          <p className="explore-loc-sheet__ward-hint">
            {location?.province?.name} — chọn một hoặc nhiều phường/xã
          </p>

          <div className="explore-loc-sheet__search">
            <Search size={16} />
            <input
              value={wardQ}
              onChange={(e) => setWardQ(e.target.value)}
              placeholder="Tìm phường/xã"
              autoFocus
            />
          </div>

          <ul className="explore-loc-sheet__prov-list">
            <li>
              <button type="button" onClick={selectAllWards}>
                <span>
                  <strong>Tất cả phường/xã</strong>
                  <em className="explore-loc-sheet__ward-sub">Mặc định — hiển thị toàn tỉnh</em>
                </span>
                <span className={`explore-loc-sheet__check-box ${isAllWards ? "is-on" : ""}`}>
                  {isAllWards && <Check size={12} strokeWidth={3} />}
                </span>
              </button>
            </li>

            {loadingWards && (
              <li className="explore-loc-sheet__prov-empty">
                <Loader2 size={16} className="spin" /> Đang tải phường/xã...
              </li>
            )}

            {!loadingWards &&
              filteredWards.map((w) => {
                const checked = selectedWardCodes.has(w.code);
                return (
                  <li key={w.code}>
                    <button type="button" onClick={() => toggleWard(w)}>
                      <span>
                        <strong>{locationLabel(w.name)}</strong>
                        {w.division_type && (
                          <em className="explore-loc-sheet__ward-sub">{w.division_type}</em>
                        )}
                      </span>
                      <span className={`explore-loc-sheet__check-box ${checked ? "is-on" : ""}`}>
                        {checked && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  </li>
                );
              })}

            {!loadingWards && filteredWards.length === 0 && (
              <li className="explore-loc-sheet__prov-empty">Không tìm thấy phường/xã</li>
            )}
          </ul>

          <div className="explore-loc-sheet__foot">
            <button type="button" className="btn btn-ct" onClick={() => setView("main")}>
              Xong
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_RADIUS as EXPLORE_DEFAULT_RADIUS };
