"use client";

import {useLocale} from '@/components/settings/LocaleProvider';
import {vehicleDetailLabels,vehicleDetailOptions} from '@/lib/i18n/vehicle-details';
import { getSpecFieldsForCategory } from "@/lib/category-specs";

export function CategorySpecForm({ categoryId, values = {}, onChange, errors = {} }) {
  const {locale}=useLocale();
  const { groupLabel, fields:originalFields } = getSpecFieldsForCategory(categoryId);
  const fields=originalFields.map(f=>({...f,label:vehicleDetailLabels[locale]?.[f.id]||f.label}));

  function updateField(id, value) {
    onChange?.({ ...values, [id]: value });
  }

  return (
    <div className="category-spec-form panel-inset">
      <div className="category-spec-form__head">
        <h3>Thông tin sản phẩm</h3>
        <span className="text-muted text-sm">Nhóm: {groupLabel}</span>
      </div>
      <div className="category-spec-form__grid">
        {fields.map((field) => {
          const err = errors[field.id];
          if (field.type === 'textarea') {
            return (
              <div key={field.id} className="input-group category-spec-form__full">
                <label className="input-label" htmlFor={`spec-${field.id}`}>{field.label}{field.required && ' *'}</label>
                <textarea
                  id={`spec-${field.id}`}
                  className={`textarea ${err ? 'input-error' : ''}`}
                  rows={2}
                  required={field.required}
                  maxLength={2000}
                  aria-invalid={Boolean(err)}
                  aria-describedby={err ? `spec-error-${field.id}` : undefined}
                  placeholder={field.placeholder}
                  value={values[field.id] ?? ''}
                  onChange={(e) => updateField(field.id, e.target.value)}
                />
                {err && <p id={`spec-error-${field.id}`} className="owner-field-error" role="alert">{err}</p>}
              </div>
            );
          }
          if (field.type === 'select') {
            return (
              <div key={field.id} className="input-group">
                <label className="input-label" htmlFor={`spec-${field.id}`}>{field.label}{field.required && ' *'}</label>
                <select
                  id={`spec-${field.id}`}
                  className="select"
                  required={field.required}
                  aria-invalid={Boolean(err)}
                  aria-describedby={err ? `spec-error-${field.id}` : undefined}
                  value={values[field.id] ?? ''}
                  onChange={(e) => updateField(field.id, e.target.value)}
                >
                  <option value="">Chọn...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{vehicleDetailLabels[locale]?.[field.id]?(vehicleDetailOptions[locale]?.[opt]||opt):opt}</option>
                  ))}
                </select>
                {err && <p id={`spec-error-${field.id}`} className="owner-field-error" role="alert">{err}</p>}
              </div>
            );
          }
          return (
            <div key={field.id} className="input-group">
              <label className="input-label" htmlFor={`spec-${field.id}`}>{field.label}{field.required && ' *'}</label>
              <input
                id={`spec-${field.id}`}
                type={field.type === 'number' ? 'number' : 'text'}
                className={`input ${err ? 'input-error' : ''}`}
                required={field.required}
                maxLength={300}
                min={field.type === 'number' ? 0 : undefined}
                step={field.type === 'number' ? 1 : undefined}
                aria-invalid={Boolean(err)}
                aria-describedby={err ? `spec-error-${field.id}` : undefined}
                placeholder={field.placeholder}
                value={values[field.id] ?? ''}
                onChange={(e) => updateField(field.id, e.target.value)}
              />
              {err && <p id={`spec-error-${field.id}`} className="owner-field-error" role="alert">{err}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CategorySpecDisplay({ listing, inline = false, detailCard = false }) {
  const {locale}=useLocale();
  const { groupLabel, fields:originalFields } = getSpecFieldsForCategory(listing.category);
  const fields=originalFields.map(f=>({...f,label:vehicleDetailLabels[locale]?.[f.id]||f.label}));
  const rows = fields
    .map((f) => ({ ...f, value: listing.specs?.[f.id] }))
    .filter((f) => f.value);

  if (rows.length === 0) return null;

  const rootClass = [
    "product-specs",
    inline ? "product-specs--inline" : "panel",
    detailCard ? "product-specs--detail-card" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <h2 className={detailCard ? "product-detail-card__title" : undefined}>
        {detailCard ? "Thông tin chi tiết" : "Thông tin sản phẩm"}
      </h2>
      <p className="product-specs__group text-muted text-sm">Danh mục: {groupLabel}</p>
      <dl className="product-specs__list">
        {rows.map((row) => (
          <div key={row.id} className="product-specs__row">
            <dt>{row.label}</dt>
            <dd>{vehicleDetailLabels[locale]?.[row.id]?(vehicleDetailOptions[locale]?.[row.value]||row.value):row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
