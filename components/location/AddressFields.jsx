"use client";
import {PreciseLocationField} from './PreciseLocationField';
import { LocationPicker } from "./LocationPicker";
export function AddressFields({
  value = {},
  onChange,
  label = "Địa chỉ",
}) {
  return (
    <div className="structured-address">
      <LocationPicker
        value={value}
        onChange={(part) => onChange({ ...value, ...part })}
        label={label}
        autoGeo={false}
      />
      <label>
        Tên đường
        <input
          className="input"
          required value={value.street || ""}
          onChange={(e) => onChange({ ...value, street: e.target.value })}
          placeholder="Nhập tên đường"
          maxLength={300}
          autoComplete="address-line1"
        />
      </label>
      <label>
        Số nhà / địa chỉ nhận biết
        <input
          className="input"
          required value={value.house || ""}
          onChange={(e) => onChange({ ...value, house: e.target.value })}
          placeholder="Nhập số nhà"
          maxLength={100}
        />
      </label>
      <PreciseLocationField autoUseDefault={false} value={value.preciseLocation} onChange={preciseLocation=>onChange({...value,preciseLocation})} onUseAddress={address=>onChange({...value,...address})}/>
    </div>
  );
}
