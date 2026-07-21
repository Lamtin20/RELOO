"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Phone, User } from "lucide-react";

/**
 * Form địa chỉ theo mã Goship (tỉnh → quận → phường)
 */
export function GoshipAddressForm({
  title,
  subtitle,
  value,
  onChange,
  errors = {},
  readOnlyContact = false,
  disabled = false,
}) {
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoadingCities(true);
    fetch("/api/goship/cities")
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res.ok) setCities(res.data ?? []);
        else setLoadError(res.error || "Không tải được tỉnh/thành");
      })
      .catch(() => alive && setLoadError("Lỗi kết nối Goship"))
      .finally(() => alive && setLoadingCities(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!value?.city?.id) {
      setDistricts([]);
      setWards([]);
      return;
    }

    let alive = true;
    setLoadingDistricts(true);
    fetch(`/api/goship/cities/${encodeURIComponent(value.city.id)}/districts`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        setDistricts(res.ok ? (res.data ?? []) : []);
      })
      .finally(() => alive && setLoadingDistricts(false));

    return () => {
      alive = false;
    };
  }, [value?.city?.id]);

  useEffect(() => {
    if (!value?.district?.id) {
      setWards([]);
      return;
    }

    let alive = true;
    setLoadingWards(true);
    fetch(`/api/goship/districts/${encodeURIComponent(value.district.id)}/wards`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        setWards(res.ok ? (res.data ?? []) : []);
      })
      .finally(() => alive && setLoadingWards(false));

    return () => {
      alive = false;
    };
  }, [value?.district?.id]);

  function patch(partial) {
    onChange?.({ ...value, ...partial });
  }

  function handleCityChange(e) {
    const id = e.target.value;
    const city = cities.find((c) => String(c.id) === id) ?? null;
    patch({ city: city ? { id: city.id, name: city.name } : null, district: null, ward: null });
  }

  function handleDistrictChange(e) {
    const id = e.target.value;
    const district = districts.find((d) => String(d.id) === id) ?? null;
    patch({
      district: district ? { id: district.id, name: district.name } : null,
      ward: null,
    });
  }

  function handleWardChange(e) {
    const id = e.target.value;
    const ward = wards.find((w) => String(w.id) === id) ?? null;
    patch({ ward: ward ? { id: ward.id, name: ward.name } : null });
  }

  return (
    <div className="goship-address-form panel-inset">
      <div className="goship-address-form__head">
        <MapPin size={16} className="text-green" />
        <div>
          <h3>{title}</h3>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
      </div>

      {loadError && (
        <p className="goship-address-form__error" role="alert">
          {loadError}
        </p>
      )}

      <div className="goship-address-form__grid">
        <div className="input-group">
          <label className="input-label" htmlFor={`${title}-name`}>
            <User size={13} /> Họ tên liên hệ
          </label>
          <input
            id={`${title}-name`}
            className={`input ${errors.name ? "input-error" : ""}`}
            value={value?.name ?? ""}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Nguyễn Văn A"
            disabled={disabled || readOnlyContact}
          />
          {errors.name && <span className="input-error-msg">{errors.name}</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor={`${title}-phone`}>
            <Phone size={13} /> Số điện thoại
          </label>
          <input
            id={`${title}-phone`}
            className={`input ${errors.phone ? "input-error" : ""}`}
            value={value?.phone ?? ""}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="09xxxxxxxx"
            disabled={disabled || readOnlyContact}
          />
          {errors.phone && <span className="input-error-msg">{errors.phone}</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor={`${title}-city`}>
            Tỉnh / Thành phố
          </label>
          <select
            id={`${title}-city`}
            className={`select ${errors.city ? "input-error" : ""}`}
            value={value?.city?.id ?? ""}
            onChange={handleCityChange}
            disabled={disabled || loadingCities}
          >
            <option value="">{loadingCities ? "Đang tải…" : "Chọn tỉnh/thành"}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {errors.city && <span className="input-error-msg">{errors.city}</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor={`${title}-district`}>
            Quận / Huyện
          </label>
          <select
            id={`${title}-district`}
            className={`select ${errors.district ? "input-error" : ""}`}
            value={value?.district?.id ?? ""}
            onChange={handleDistrictChange}
            disabled={disabled || !value?.city || loadingDistricts}
          >
            <option value="">
              {loadingDistricts ? "Đang tải…" : "Chọn quận/huyện"}
            </option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {errors.district && <span className="input-error-msg">{errors.district}</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor={`${title}-ward`}>
            Phường / Xã
          </label>
          <select
            id={`${title}-ward`}
            className={`select ${errors.ward ? "input-error" : ""}`}
            value={value?.ward?.id ?? ""}
            onChange={handleWardChange}
            disabled={disabled || !value?.district || loadingWards}
          >
            <option value="">{loadingWards ? "Đang tải…" : "Chọn phường/xã"}</option>
            {wards.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          {errors.ward && <span className="input-error-msg">{errors.ward}</span>}
        </div>

        <div className="input-group goship-address-form__full">
          <label className="input-label" htmlFor={`${title}-street`}>
            Số nhà, tên đường
          </label>
          <input
            id={`${title}-street`}
            className={`input ${errors.street ? "input-error" : ""}`}
            value={value?.street ?? ""}
            onChange={(e) => patch({ street: e.target.value })}
            placeholder="Ví dụ: 51 Lê Đại Hành, tòa A"
            disabled={disabled}
          />
          {errors.street && <span className="input-error-msg">{errors.street}</span>}
        </div>
      </div>

      {(loadingDistricts || loadingWards) && (
        <p className="goship-address-form__loading text-muted text-sm">
          <Loader2 size={13} className="spin" /> Đang đồng bộ địa chỉ Goship…
        </p>
      )}
    </div>
  );
}
