import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, description, actions, backHref, backLabel }) {
  return (
    <div className="admin-page-header">
      <div>
        {backHref && (
          <div className="admin-breadcrumb">
            <Link href={backHref} className="flex items-center gap-1">
              <ChevronLeft size={14} />
              {backLabel || "Quay lại"}
            </Link>
          </div>
        )}
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-desc">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </div>
  );
}
