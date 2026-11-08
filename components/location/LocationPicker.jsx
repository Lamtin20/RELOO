"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MapPin, Search, Navigation, Loader2, Check, X } from "lucide-react";
import { fetchProvinces, fetchWards } from "@/lib/vn-address";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import {useLocale} from '@/components/settings/LocaleProvider';
import {locationPickerCopy} from '@/lib/i18n/mobile-experience';
import './location-label.css';
import {googleMapsLocation} from '@/lib/location-tools';
import {locationLabel} from '@/lib/location-label';
import {LocationMap} from './LocationMap';

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
  label:labelInput,
  geoLabel:geoInput,
  streetLabel:streetInput,
  hint = "",
  compact = false,
  invalidProvince=false,invalidWard=false,
}) {
  const {locale}=useLocale(),t=locationPickerCopy[locale]||locationPickerCopy['vi-VN'],uid=useId(),label=labelInput??t.area,geoLabel=geoInput??t.geo,streetLabel=streetInput??t.street;
  const [provinces, setProvinces] = useState([]);
  const [loadingProv, setLoadingProv] = useState(true),[provError,setProvError]=useState(false),[provRetry,setProvRetry]=useState(0),[wardError,setWardError]=useState(false),[wardRetry,setWardRetry]=useState(0);
  const [wards, setWards] = useState([]),[wardSource,setWardSource]=useState(null);
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
    fetchProvinces()
      .then((data) => {
        if (alive) {setProvinces(data);setProvError(false);}
      })
      .catch(() => {if(alive)setProvError(true);})
      .finally(() => alive && setLoadingProv(false));
    return () => {
      alive = false;
    };
  }, [provRetry]);

  useEffect(() => {
    if (!value?.province?.code) {
      const timer=setTimeout(()=>setWards([]),0);
      return ()=>clearTimeout(timer);
    }
    let alive = true;
    Promise.resolve().then(()=>{if(alive)setLoadingWards(true);});
    fetchWards(value.province.code)
      .then((data) => {
        if (alive) {setWards(data);setWardSource(value.province.code);setWardError(false);}
      })
      .catch(() => {if(alive)setWardError(true);})
      .finally(() => alive && setLoadingWards(false));
    return () => {
      alive = false;
    };
  }, [value?.province?.code,wardRetry]);

  useEffect(() => {
    function onDoc(e) {
      if (provRef.current && !provRef.current.contains(e.target)) setOpenProv(false);
      if (wardRef.current && !wardRef.current.contains(e.target)) setOpenWard(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(()=>{function escape(event){if(event.key!=='Escape'||!openProv&&!openWard)return;event.preventDefault();if(openWard){setOpenWard(false);wardRef.current?.querySelector('button')?.focus();}else{setOpenProv(false);provRef.current?.querySelector('button')?.focus();}}document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[openProv,openWard]);
  const filteredProv = useMemo(() => {
    const q = provQ.trim().toLowerCase();
    if (!q) return provinces;
    return provinces.filter((p) =>
      [p.name, p.codename].some((s) => s?.toLowerCase().includes(q))
    );
  }, [provinces, provQ]);

  const filteredWards = useMemo(() => {
    if(wardSource!==value?.province?.code)return [];
    const q = wardQ.trim().toLowerCase();
    if (!q) return wards;
    return wards.filter((w) =>
      [w.name, w.codename].some((s) => s?.toLowerCase().includes(q))
    );
  }, [wards,wardQ,wardSource,value?.province?.code]);

  function pickProvince(p) {
    setWardError(false);
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
              <Loader2 size={14} className="spin" /> {t.locating}
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
          <span>{t.located}</span><details><summary>{t.details}</summary>{Number.isFinite(value.coords.accuracy)&&<p>{t.accuracy(Math.round(value.coords.accuracy))}</p>}<p>{t.share}</p></details>
          {googleMapsLocation(value.coords)&&<a href={googleMapsLocation(value.coords)} target="_blank" rel="noopener noreferrer">{t.map}</a>}
        </div>
      )}

      <div className="loc-picker__row">
        <div className="loc-picker__field" ref={provRef}>
          <label className="loc-picker__caption">{t.province}</label>
          <button
            type="button"
            className="loc-picker__select" role="combobox" aria-label={t.province} aria-expanded={openProv} aria-haspopup="dialog" aria-controls={openProv?uid+'-province':undefined} aria-invalid={invalidProvince}
            onClick={() => setOpenProv((v) => !v)}
          >
            <MapPin size={14} />
            <span className="loc-picker__select-text">
              {locationLabel(value?.province?.name) || (loadingProv ? t.loading : t.chooseProvince)}
            </span>
          </button>

          {openProv && (
            <div className="loc-picker__dropdown" id={uid+'-province'} role="dialog" aria-label={t.chooseProvince}>
              <div className="loc-picker__search">
                <Search size={14} />
                <input
                  autoFocus
                  value={provQ}
                  onChange={(e) => setProvQ(e.target.value)}
                  placeholder={t.searchProvince}
                />
                {provQ && (
                  <button type="button" onClick={() => setProvQ("")} className="loc-picker__clear">
                    <X size={12} />
                  </button>
                )}
              </div>
              <ul className="loc-picker__list">
                {provError&&<li className="loc-picker__load-error" role="status"><span>{t.unavailable}</span><button type="button" disabled={loadingProv} onClick={()=>{setProvError(false);setLoadingProv(true);setProvRetry(n=>n+1);}}>{t.retry}</button></li>}
                {filteredProv.map((p) => (
                  <li key={p.code}>
                    <button type="button" onClick={() => pickProvince(p)}>
                      <span>{locationLabel(p.name)}</span>
                      {value?.province?.code === p.code && <Check size={14} />}
                    </button>
                  </li>
                ))}
                {filteredProv.length === 0 && !provError && (
                  <li className="loc-picker__empty">Không tìm thấy</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="loc-picker__field" ref={wardRef}>
          <label className="loc-picker__caption">{t.ward}</label>
          <button
            type="button"
            className="loc-picker__select" role="combobox" aria-label={t.ward} aria-expanded={openWard} aria-haspopup="dialog" aria-controls={openWard?uid+'-ward':undefined} aria-invalid={invalidWard}
            onClick={() => value?.province && setOpenWard((v) => !v)}
            disabled={!value?.province}
          >
            <MapPin size={14} />
            <span className="loc-picker__select-text">
              {locationLabel(value?.ward?.name) ||
                (!value?.province
                  ? "Chọn tỉnh trước"
                  : loadingWards
                  ? t.loading
                  : t.chooseWard)}
            </span>
          </button>

          {openWard && (
            <div className="loc-picker__dropdown" id={uid+'-ward'} role="dialog" aria-label={t.chooseWard}>
              <div className="loc-picker__search">
                <Search size={14} />
                <input
                  autoFocus
                  value={wardQ}
                  onChange={(e) => setWardQ(e.target.value)}
                  placeholder={t.searchWard}
                />
                {wardQ && (
                  <button type="button" onClick={() => setWardQ("")} className="loc-picker__clear">
                    <X size={12} />
                  </button>
                )}
              </div>
              <ul className="loc-picker__list">
                {wardError&&<li className="loc-picker__load-error" role="status"><span>{t.unavailable}</span><button type="button" disabled={loadingWards} onClick={()=>{setWardError(false);setLoadingWards(true);setWardRetry(n=>n+1);}}>{t.retry}</button></li>}
                {filteredWards.map((w) => (
                  <li key={w.code}>
                    <button type="button" onClick={() => pickWard(w)}>
                      <span>
                        <strong>{locationLabel(w.name)}</strong>
                        <em className="loc-picker__list-sub">{w.division_type}</em>
                      </span>
                      {value?.ward?.code === w.code && <Check size={14} />}
                    </button>
                  </li>
                ))}
                {filteredWards.length === 0 && !wardError && (
                  <li className="loc-picker__empty">
                    {loadingWards ? t.loading : "Không tìm thấy"}
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {(value?.coords||value?.province)&&<LocationMap coords={value.coords} address={[value.ward?.name,value.province?.name].filter(Boolean).join(', ')} approximate={!value.coords}/>}
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
