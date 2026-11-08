"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { useAuth, useListings } from "@/lib/store";
import { CATEGORIES, LISTING_CONDITIONS, LISTING_STATUS } from "@/lib/constants";
import { buildEmptySpecs, normalizeSpecs, validateSpecs } from "@/lib/category-specs";
import {RentalDetailsForm} from '@/components/listings/RentalDetailsForm';
import {normalizeRentalDetails} from '@/lib/listing-rental-details';
import { CategorySpecForm } from "@/components/listings/CategorySpecFields";
import { ListingImageUpload } from "@/components/listings/ListingImageUpload";
import { ListingAddressForm } from "@/components/listings/ListingAddressForm";
import { PlatformFeePanel } from "@/components/listings/PlatformFeePanel";
import { shortHash } from "@/lib/utils";
import { EmptyState } from "@/components/ui";
import {
  buildListingLocationPayload,
  listingAddressToForm,
  validateListingAddress,
} from "@/lib/listing-location";

import {useLocale} from '@/components/settings/LocaleProvider';
import {rentalDetailsCopy} from '@/lib/i18n/rental-details';
import {mobileExperienceCopy} from '@/lib/i18n/mobile-experience';
import {RelooLoading} from '@/components/ui/RelooLoading';
export default function EditAssetPage(){const {id}=useParams(),{user}=useAuth(),{locale}=useLocale(),t=mobileExperienceCopy[locale]||mobileExperienceCopy['vi-VN'],{getListingById,dbLoading,dbError,retryListings}=useListings(),listing=getListingById(id);if(dbLoading&&(!listing||listing.ownerId===user?.id&&listing.ownerDetailsAvailable===false))return <RelooLoading/>;if(dbError&&!listing||listing?.ownerId===user?.id&&listing.ownerDetailsAvailable===false)return <EmptyState title={t.privateRefresh} action={<button className="btn btn-primary" onClick={retryListings}>{t.retry}</button>}/>;return <EditAssetForm key={(user?.id||'guest')+':'+id} initialListing={listing}/>;}
function EditAssetForm({initialListing}) {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const {locale}=useLocale(),rt=rentalDetailsCopy[locale]||rentalDetailsCopy["vi-VN"];
  const { getListingById, updateListing } = useListings();

  const listing = getListingById(id)||initialListing;

  const [form, setForm] = useState(() =>
    listing
      ? {
          title: listing.title,
          rentalDetails:listing.rentalDetails||null,
          description: listing.description,
          category: listing.category,
          dailyPrice: listing.dailyPrice,
          transactionMode:listing.transactionMode||'RENT',
          salePrice:listing.salePrice||'',
          marketValue: listing.marketValue,
          condition: listing.condition,
          status: listing.status,
          images: listing.images ?? [],
          specs: listing.specs ?? buildEmptySpecs(listing.category),
        }
      : null
  );
  const [address, setAddress] = useState(() =>
    listing ? listingAddressToForm(listing) : null
  );
  const [errors, setErrors] = useState({});

  if (!user) return null;

  if (!listing) {
    return (
      <div className="dashboard-page animate-fade-up">
        <EmptyState
          icon="PackageX"
          title="Không tìm thấy tài sản"
          description="Tài sản này không tồn tại hoặc đã bị xóa."
          action={
            <Link href="/dashboard/assets" className="btn btn-primary">
              Về kho đồ
            </Link>
          }
        />
      </div>
    );
  }

  if (listing.ownerId !== user.id) {
    return (
      <div className="dashboard-page animate-fade-up">
        <EmptyState
          icon="Lock"
          title="Không có quyền chỉnh sửa"
          description="Bạn chỉ có thể chỉnh sửa tài sản do chính mình đăng."
          action={
            <Link href="/dashboard/assets" className="btn btn-primary">
              Về kho đồ
            </Link>
          }
        />
      </div>
    );
  }

  if (!form || !address) return null;

  const update = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "category") {
        next.specs = buildEmptySpecs(value);
      }
      return next;
    });
  };

  const validate = () => {
    const next = {};
    try{normalizeRentalDetails(form.rentalDetails,form.category);}catch{next.rentalDetails=rt.invalid;}
    if (!form.title.trim()) next.title = "Vui lòng nhập tên tài sản";
    if (!CATEGORIES.some((category) => category.id === form.category)) next.category = 'Vui lòng chọn danh mục.';
    const fields = validateSpecs(form.category, form.specs);
    if (Object.keys(fields).length) next.specs = fields;
    if (form.transactionMode!=='SALE'&&(!form.dailyPrice || Number(form.dailyPrice) <= 0))
      next.dailyPrice = "Giá thuê/ngày phải lớn hơn 0";
    if(form.transactionMode!=='RENT'&&(!Number.isSafeInteger(Number(form.salePrice))||Number(form.salePrice)<1||Number(form.salePrice)>1000000000))next.salePrice='Nhập giá bán hợp lệ.';
    if (!form.marketValue || Number(form.marketValue) <= 0)
      next.marketValue = "Giá trị thị trường phải lớn hơn 0";
    Object.assign(next, validateListingAddress(address));
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try { await updateListing(listing.id, {
      ownerDetailsAvailable:listing.ownerDetailsAvailable===true,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      dailyPrice: Number(form.dailyPrice),
      transactionMode:form.transactionMode,
      salePrice:form.salePrice,
      marketValue: Number(form.marketValue),
      ...buildListingLocationPayload(address),
      condition: form.condition,
      status: form.status,
      images: form.images,
      specs: normalizeSpecs(form.category, form.specs),
      rentalDetails:form.rentalDetails,
    });

    router.push("/dashboard/assets");
    } catch(error) { setErrors(current=>({...current,submit:error.message})); }
  };

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Chỉnh sửa tài sản</h1>
          <p className="text-muted mt-2">{listing.title}</p>
        </div>
      </div>

      {listing.nftPassport && (
        <div className="dashboard-nft-card panel mt-6">
          <div className="dashboard-nft-card__icon">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="font-semibold text-sm">
              NFT Passport: {listing.nftPassport.id}
            </span>
            <p className="text-xs text-muted mt-1">
              Hash: {shortHash(listing.nftPassport.hash)} · Đã kiểm định{" "}
              {listing.nftPassport.auditCount ?? 0} lần
            </p>
          </div>
        </div>
      )}

      <form className="panel mt-6 dashboard-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="title">
            Tên tài sản
          </label>
          <input
            id="title"
            className={`input ${errors.title ? "input-error" : ""}`}
            value={form.title}
            onChange={update("title")}
          />
          {errors.title && <span className="text-xs text-danger">{errors.title}</span>}
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="description">
            Mô tả chi tiết
          </label>
          <textarea
            id="description"
            className="textarea"
            rows={4}
            value={form.description}
            onChange={update("description")}
          />
        </div>

        <div className="dashboard-form-row">
          <div className="input-group">
            <label className="input-label" htmlFor="category">
              Danh mục
            </label>
            <select
              id="category"
              required
              aria-invalid={Boolean(errors.category)}
              className="select"
              value={form.category}
              onChange={update("category")}
            >
              <option value="" disabled>Chọn danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && <p className="owner-field-error" role="alert">{errors.category}</p>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="condition">
              Tình trạng
            </label>
            <select
              id="condition"
              className="select"
              value={form.condition}
              onChange={update("condition")}
            >
              {Object.values(LISTING_CONDITIONS).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label>Loại giao dịch<select className="select" value={form.transactionMode} onChange={update('transactionMode')}><option value="RENT">Cho thuê</option><option value="SALE">Bán</option><option value="BOTH">Cho thuê & bán</option></select></label>
        {form.transactionMode!=='RENT'&&<label>Giá bán (đ)<input className="input" type="number" min="1" max="1000000000" value={form.salePrice} onChange={update('salePrice')}/>{errors.salePrice&&<p role="alert">{errors.salePrice}</p>}</label>}
        {form.transactionMode!=='SALE'&&<RentalDetailsForm value={form.rentalDetails} category={form.category} onChange={value=>setForm(f=>({...f,rentalDetails:value}))}/>}
        {errors.rentalDetails&&<p role="alert">{errors.rentalDetails}</p>}
        <CategorySpecForm
          categoryId={form.category}
          values={form.specs ?? {}}
          errors={errors.specs || {}}
          onChange={(next) => setForm((f) => ({ ...f, specs: next }))}
        />

        <div className="dashboard-form-row">
          <div className="input-group">
            <label className="input-label" htmlFor="dailyPrice">
              Giá thuê / ngày (₫)
            </label>
            <input
              id="dailyPrice"
              type="number"
              min="0"
              className={`input ${errors.dailyPrice ? "input-error" : ""}`}
              value={form.dailyPrice}
              onChange={update("dailyPrice")}
            />
            {errors.dailyPrice && (
              <span className="text-xs text-danger">{errors.dailyPrice}</span>
            )}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="marketValue">
              Giá trị thị trường (₫)
            </label>
            <input
              id="marketValue"
              type="number"
              min="0"
              className={`input ${errors.marketValue ? "input-error" : ""}`}
              value={form.marketValue}
              onChange={update("marketValue")}
            />
            {errors.marketValue && (
              <span className="text-xs text-danger">{errors.marketValue}</span>
            )}
          </div>
        </div>

        <PlatformFeePanel dailyPrice={form.dailyPrice} user={user} previewDays={3} />

        <div className="input-group">
          {!listing.locationDetails && listing.location && (
            <p className="input-hint" style={{ marginBottom: 8 }}>
              Địa chỉ cũ: <strong>{listing.location}</strong>. Vui lòng chọn lại tỉnh/thành, phường/xã
              và nhập chi tiết địa chỉ.
            </p>
          )}
          <ListingAddressForm
            value={address}
            onChange={setAddress}
            errors={{
              province: errors.province,
              ward: errors.ward,
              addressDetail: errors.addressDetail,
            }}
          />
        </div>

        <div className="input-group">
          <label className="input-label" htmlFor="status">
            Trạng thái tin
          </label>
          <select
            id="status"
            className="select"
            value={form.status}
            onChange={update("status")}
          >
            {Object.values(LISTING_STATUS).map((s) => (
              <option key={s.code} value={s.code}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Hình ảnh</label>
          <ListingImageUpload
            images={form.images}
            onChange={(next) => setForm((f) => ({ ...f, images: next }))}
          />
        </div>

        <div className="dashboard-form-actions">
          {errors.submit && <p className="feature-error" role="alert">{errors.submit}</p>}
          <Link href="/dashboard/assets" className="btn btn-ghost">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary">
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}
