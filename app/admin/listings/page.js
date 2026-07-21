"use client";

import { useMemo, useState } from "react";
import { Search, CheckCircle2, EyeOff, ExternalLink, Star } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { LISTING_STATUS } from "@/lib/constants";

const STATUS_VARIANT = {
  available: "green",
  rented: "blue",
  draft: "muted",
  suspended: "danger",
};

export default function ListingsPage() {
  const { state, actions } = useReloo();
  const { listings, users, categories } = state;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const getOwner = (id) => users.find((u) => u.id === id);

  const filtered = useMemo(() => {
    let result = [...listings];
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter((l) => l.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) => l.title.toLowerCase().includes(q) || getOwner(l.ownerId)?.name.toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, search, statusFilter, categoryFilter]);

  return (
    <div>
      <PageHeader
        title="Duyệt tin đăng"
        description="Kiểm duyệt, ẩn hoặc khôi phục tài sản cho thuê trên sàn."
      />

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Tìm theo tên tài sản, chủ đồ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {Object.values(LISTING_STATUS).map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
        <select className="select select-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Không có tin đăng" description="Không tìm thấy tài sản khớp bộ lọc." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tài sản</th>
                <th>Chủ đồ</th>
                <th>Giá/ngày</th>
                <th>Trạng thái</th>
                <th>Nổi bật</th>
                <th style={{ textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const owner = getOwner(l.ownerId);
                const isSuspended = l.status === "suspended";
                return (
                  <tr key={l.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {l.images?.[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.images[0]} alt={l.title} style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }} />
                        )}
                        <div>
                          <div className="font-semibold text-sm" style={{ maxWidth: 220 }}>{l.title}</div>
                          <div className="text-xs text-muted">{l.location}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{owner?.name || "-"}</td>
                    <td><Money amount={l.dailyPrice} /></td>
                    <td>
                      <Badge variant={STATUS_VARIANT[l.status] || "muted"}>
                        {LISTING_STATUS[l.status?.toUpperCase()]?.label || l.status}
                      </Badge>
                    </td>
                    <td>
                      {l.isBoosted ? (
                        <Badge variant="warning" icon={Star}>Đang đẩy tin</Badge>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        <a
                          href={`/product/${l.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-icon"
                          title="Xem tin đăng"
                        >
                          <ExternalLink size={16} />
                        </a>
                        {isSuspended ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => actions.updateListing(l.id, { status: "available" })}
                          >
                            <CheckCircle2 size={14} /> Duyệt lại
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => actions.updateListing(l.id, { status: "suspended" })}
                          >
                            <EyeOff size={14} /> Ẩn tin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
