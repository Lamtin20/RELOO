"use client";

import {useLocale} from '@/components/settings/LocaleProvider';
import {mobileExperienceCopy} from '@/lib/i18n/mobile-experience';
import { LocationPicker } from "@/components/location/LocationPicker";
import {PreciseLocationField} from '@/components/location/PreciseLocationField';

/**
 * Địa chỉ cho thuê — tỉnh/thành, phường/xã, chi tiết + định vị GPS
 */
export function ListingAddressForm({ value, onChange, errors = {} }) {
  const {locale}=useLocale(),t=mobileExperienceCopy[locale]||mobileExperienceCopy['vi-VN'];
  const pickerValue = {
    province: value?.province ?? null,
    ward: value?.ward ?? null,
    coords: value?.coords ?? null,
  };

  return (
    <div className="listing-address-form">
      <LocationPicker
        label={t.locationTitle}
        invalidProvince={!!errors.province} invalidWard={!!errors.ward}
        value={pickerValue}
        onChange={(loc) =>
          onChange?.({
            ...value,
            province: loc.province,
            ward: loc.ward,
            coords: loc.coords ?? null,
          })
        }
        geoLabel={t.geo}
        autoGeo={false}
        hint={t.locationHint}
      />
      <PreciseLocationField value={value?.preciseLocation} onChange={preciseLocation=>onChange?.({...value,preciseLocation,coords:preciseLocation.coords})} onUseAddress={a=>onChange?.({...value,...a,addressDetail:[a.house,a.street].filter(Boolean).join(' '),coords:a.preciseLocation?.coords})}/>
      <label className="profile-field">
        {t.street}
        <input
          className="input"
          required aria-invalid={!!errors.addressDetail} autoComplete="address-line1"
          maxLength={300}
          value={value?.street ?? value?.addressDetail ?? ""}
          placeholder={t.streetHint}
          onChange={(e) =>
            onChange?.({
              ...value,
              street: e.target.value,
              addressDetail: [value?.house, e.target.value]
                .filter(Boolean)
                .join(" "),
            })
          }
        />
      </label>
      <label className="profile-field">
        {locale==='en-US'?'House number / recognizable address':'Số nhà / địa chỉ nhận biết'}
        <input
          className="input"
          required maxLength={100}
          value={value?.house ?? ""}
          placeholder={t.houseHint}
          onChange={(e) =>
            onChange?.({
              ...value,
              house: e.target.value,
              street: value?.street ?? value?.addressDetail ?? "",
              addressDetail: [
                e.target.value,
                value?.street ?? value?.addressDetail,
              ]
                .filter(Boolean)
                .join(" "),
            })
          }
        />
      </label>

      {errors.province && (
        <span className="text-xs text-danger">{errors.province}</span>
      )}
      {errors.ward && (
        <span className="text-xs text-danger">{errors.ward}</span>
      )}
      {errors.addressDetail && (
        <span className="text-xs text-danger">{errors.addressDetail}</span>
      )}
      {errors.house&&<span className="text-xs text-danger">{locale==='en-US'?'Enter a house number or recognizable address.':'Nhập số nhà hoặc địa chỉ nhận biết.'}</span>}
    </div>
  );
}
