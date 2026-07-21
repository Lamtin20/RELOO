"use client";

import Link from "next/link";
import { FileText, Pencil, Megaphone } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { RelooCareCmsPanel } from "@/components/admin/RelooCareCmsPanel";
import { formatDateTime } from "@/lib/utils";

const BANNER_TYPES = [
  { value: "info", label: "Thông tin (xanh dương)" },
  { value: "promo", label: "Khuyến mãi (xanh lá)" },
  { value: "warning", label: "Cảnh báo (vàng)" },
];

function BannerPanel() {
  const { state, actions } = useReloo();
  const settings = state.settings || {};

  const update = (patch) => actions.updateSettings(patch);

  return (
    <div className="panel mb-4" id="banner">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-2">
          <Megaphone size={16} /> Banner &amp; Cấu hình hiển thị
        </span>
        <button
          type="button"
          className={`toggle${settings.bannerEnabled ? " toggle--on" : ""}`}
          onClick={() => update({ bannerEnabled: !settings.bannerEnabled })}
          aria-label="Bật/tắt banner"
        />
      </div>
      <div className="grid-2">
        <div className="input-group">
          <label className="input-label">Nội dung banner</label>
          <input
            className="input"
            value={settings.bannerText || ""}
            onChange={(e) => update({ bannerText: e.target.value })}
            placeholder="Ví dụ: Giảm 15% khi thuê từ 4 ngày!"
          />
        </div>
        <div className="input-group">
          <label className="input-label">Kiểu banner</label>
          <select
            className="select"
            value={settings.bannerType || "info"}
            onChange={(e) => update({ bannerType: e.target.value })}
          >
            {BANNER_TYPES.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>
      {settings.bannerEnabled && settings.bannerText && (
        <div
          className="mt-3"
          style={{ padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600 }}
        >
          <Badge variant={settings.bannerType === "warning" ? "warning" : settings.bannerType === "promo" ? "green" : "blue"}>
            Xem trước: {settings.bannerText}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function CmsPageList() {
  const { state } = useReloo();
  const { cmsPages } = state;

  return (
    <div>
      <PageHeader
        title="Trang nội dung CMS"
        description="Quản lý trang tĩnh, chính sách và banner hiển thị trên sàn RELOO."
      />

      <BannerPanel />

      <RelooCareCmsPanel />

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Trang</th>
              <th>Slug</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th style={{ textAlign: "right" }}>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {cmsPages.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-2 font-semibold">
                    <FileText size={15} /> {p.title}
                  </div>
                  {p.metaDescription && <div className="text-xs text-muted mt-1">{p.metaDescription}</div>}
                </td>
                <td className="text-sm">/{p.slug}</td>
                <td>
                  <Badge variant={p.published ? "green" : "muted"}>{p.published ? "Đã xuất bản" : "Bản nháp"}</Badge>
                </td>
                <td className="text-sm text-muted">{formatDateTime(p.updatedAt)}</td>
                <td>
                  <div className="flex justify-end">
                    <Link href={`/admin/cms/${p.id}`} className="btn btn-secondary btn-sm">
                      <Pencil size={14} /> Chỉnh sửa
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
