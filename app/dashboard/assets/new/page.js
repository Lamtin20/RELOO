"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, useListings } from "@/lib/store";
import { CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
import { buildEmptySpecs, normalizeSpecs } from "@/lib/category-specs";
import { CategorySpecForm } from "@/components/listings/CategorySpecFields";
import { ListingImageUpload } from "@/components/listings/ListingImageUpload";
import { ListingAddressForm } from "@/components/listings/ListingAddressForm";
import { PlatformFeePanel } from "@/components/listings/PlatformFeePanel";
import { LISTING_PLACEHOLDER_IMAGE } from "@/lib/image-optimize";
import {
  buildListingLocationPayload,
  emptyListingAddress,
  validateListingAddress,
} from "@/lib/listing-location";

export default function NewAssetPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createListing } = useListings();

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: CATEGORIES[0]?.id ?? "",
    dailyPrice: "",
    marketValue: "",
    condition: LISTING_CONDITIONS.GOOD.code,
  });
  const [address, setAddress] = useState(emptyListingAddress);
  const [specs, setSpecs] = useState(() => buildEmptySpecs(CATEGORIES[0]?.id ?? ""));
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const update = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "category") {
        setSpecs(buildEmptySpecs(value));
      }
      return next;
    });
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Vui lòng nhập tên tài sản";
    if (!form.description.trim()) next.description = "Vui lòng nhập mô tả";
    if (!form.dailyPrice || Number(form.dailyPrice) <= 0)
      next.dailyPrice = "Giá thuê/ngày phải lớn hơn 0";
    if (!form.marketValue || Number(form.marketValue) <= 0)
      next.marketValue = "Giá trị thị trường phải lớn hơn 0";
    Object.assign(next, validateListingAddress(address));
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);

    createListing({
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      dailyPrice: Number(form.dailyPrice),
      marketValue: Number(form.marketValue),
      ...buildListingLocationPayload(address),
      condition: form.condition,
      ownerId: user.id,
      images: images.length > 0 ? images : [LISTING_PLACEHOLDER_IMAGE],
      specs: normalizeSpecs(form.category, specs),
    });

    router.push("/dashboard/assets");
  };

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Đăng đồ mới</h1>
          <p className="text-muted mt-2">
            Điền thông tin tài sản để tạo tin cho thuê trên RELOO.
          </p>
        </div>
      </div>

      <form className="panel mt-6 dashboard-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label className="input-label" htmlFor="title">
            Tên tài sản
          </label>
          <input
            id="title"
            className={`input ${errors.title ? "input-error" : ""}`}
            placeholder="VD: Sony A7IV + Lens 24-70mm f/2.8 GM II"
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
            className={`textarea ${errors.description ? "input-error" : ""}`}
            rows={4}
            placeholder="Mô tả tình trạng, phụ kiện kèm theo, phù hợp cho hoạt động gì..."
            value={form.description}
            onChange={update("description")}
          />
          {errors.description && (
            <span className="text-xs text-danger">{errors.description}</span>
          )}
        </div>

        <div className="dashboard-form-row">
          <div className="input-group">
            <label className="input-label" htmlFor="category">
              Danh mục
            </label>
            <select
              id="category"
              className="select"
              value={form.category}
              onChange={update("category")}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
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

        <CategorySpecForm
          categoryId={form.category}
          values={specs}
          onChange={setSpecs}
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
              placeholder="180000"
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
              placeholder="3500000"
              value={form.marketValue}
              onChange={update("marketValue")}
            />
            {errors.marketValue && (
              <span className="text-xs text-danger">{errors.marketValue}</span>
            )}
            <span className="input-hint">
              Dùng để tính tiền cọc và giá trị tồn dư NFT Passport
            </span>
          </div>
        </div>

        <PlatformFeePanel dailyPrice={form.dailyPrice} user={user} previewDays={3} />

        <div className="input-group">
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
          <label className="input-label">Hình ảnh</label>
          <ListingImageUpload images={images} onChange={setImages} />
        </div>

        <div className="dashboard-form-actions">
          <Link href="/dashboard/assets" className="btn btn-ghost">
            Hủy
          </Link>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Đăng tin
          </button>
        </div>
      </form>
    </div>
  );
}
