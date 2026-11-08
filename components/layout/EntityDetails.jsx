"use client";
import {useBusinessEntity} from '@/components/settings/useBusinessEntity';
export function EntityDetails() {
  const entity=useBusinessEntity();
  return (
    <>
      <span>
        © {new Date().getFullYear()} {entity.legalName || "RELOO"}
        {entity.taxId && ` · MST ${entity.taxId}`}
      </span>
      {entity.address && <span>{entity.address}</span>}
      {(entity.supportPhone || entity.supportEmail) && (
        <span>
          {[entity.supportPhone, entity.supportEmail]
            .filter(Boolean)
            .join(" · ")}
        </span>
      )}
    </>
  );
}
