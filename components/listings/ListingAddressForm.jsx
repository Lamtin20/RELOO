"use client";

import { LocationPicker } from "@/components/location/LocationPicker";

/**
 * Địa chỉ cho thuê — tỉnh/thành, phường/xã, chi tiết + định vị GPS
 */
export function ListingAddressForm({ value, onChange, errors = {} }) {
  const pickerValue = {
    province: value?.province ?? null,
    ward: value?.ward ?? null,
    coords: value?.coords ?? null,
  };

  return (
    <div className="listing-address-form">
      <LocationPicker
        label="Khu vực cho thuê"
        value={pickerValue}
        onChange={(loc) =>
          onChange?.({
            ...value,
            province: loc.province,
            ward: loc.ward,
            coords: loc.coords ?? null,
          })
        }
        includeStreet
        streetLabel="Chi tiết địa chỉ"
        streetValue={value?.addressDetail ?? ""}
        onStreetChange={(addressDetail) => onChange?.({ ...value, addressDetail })}
        geoLabel="Lấy vị trí hiện tại"
        autoGeo
        hint="Người thuê sẽ biết khu vực bạn ở để sắp xếp nhận/trả đồ thuận tiện. Địa chỉ chi tiết chỉ hiển thị sau khi đặt thuê thành công."
      />

      {errors.province && <span className="text-xs text-danger">{errors.province}</span>}
      {errors.ward && <span className="text-xs text-danger">{errors.ward}</span>}
      {errors.addressDetail && (
        <span className="text-xs text-danger">{errors.addressDetail}</span>
      )}
    </div>
  );
}
