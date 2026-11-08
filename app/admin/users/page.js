"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Search, Eye, ShieldCheck, Ban, ShieldOff } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Money } from "@/components/ui/Money";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Avatar } from "@/components/admin/Avatar";
import { getKycMeta } from "@/lib/admin-helpers";
import { formatDate } from "@/lib/utils";

const ROLE_LABELS = {
  admin: "Quản trị viên",
  lender: "Chủ đồ",
  renter: "Người thuê",
  both: "Cả hai",
};

function UsersPageInner() {
  const { state, actions } = useReloo();
  const { users } = state;
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "blacklist" ? "blacklist" : "all";

  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [tab, setTab] = useState(initialTab);

  const blacklist = state.settings?.blacklistedUserIds || [];

  const toggleBlacklist = (userId) => {
    const isBlacklisted = blacklist.includes(userId);
    const next = isBlacklisted
      ? blacklist.filter((id) => id !== userId)
      : [...blacklist, userId];
    actions.updateSettings({ blacklistedUserIds: next });
  };

  const upgradeKyc = (userId, currentLevel) => {
    const order = ["L1", "L2", "L3"];
    const idx = order.indexOf(currentLevel);
    const next = order[Math.min(idx + 1, order.length - 1)];
    if (next !== currentLevel) {
      actions.updateKyc(userId, next);
    }
  };

  const filtered = useMemo(() => {
    let result = users.filter((u) => u.role !== "admin");

    if (tab === "blacklist") {
      result = result.filter((u) => blacklist.includes(u.id));
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          String(u.email||'').toLowerCase().includes(q) ||
          u.phone.includes(q)
      );
    }
    if (kycFilter !== "all") {
      result = result.filter((u) => u.kycLevel === kycFilter);
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }

    return result.sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));
  }, [users, search, kycFilter, roleFilter, tab, blacklist]);

  return (
    <div>
      <PageHeader
        title="Quản lý người dùng"
        description="CRM khách hàng - theo dõi Trust Score, KYC, số dư cho thuê và hành vi rủi ro."
      />

      <div className="tabs mb-4" style={{ maxWidth: 360 }}>
        <button
          type="button"
          className={`tab${tab === "all" ? " tab--active" : ""}`}
          onClick={() => setTab("all")}
        >
          Tất cả ({users.filter((u) => u.role !== "admin").length})
        </button>
        <button
          type="button"
          className={`tab${tab === "blacklist" ? " tab--active" : ""}`}
          onClick={() => setTab("blacklist")}
        >
          Danh sách đen ({blacklist.length})
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select select-sm" value={kycFilter} onChange={(e) => setKycFilter(e.target.value)}>
          <option value="all">Tất cả KYC</option>
          <option value="L1">L1 - Cơ bản</option>
          <option value="L2">L2 - Đã xác thực</option>
          <option value="L3">L3 - Premium</option>
        </select>
        <select className="select select-sm" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">Tất cả vai trò</option>
          <option value="lender">Chủ đồ</option>
          <option value="renter">Người thuê</option>
          <option value="both">Cả hai</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Không tìm thấy người dùng" description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò</th>
                <th>KYC</th>
                <th>Trust Score</th>
                <th>Số dư cho thuê</th>
                <th>Tham gia</th>
                <th style={{ textAlign: "right" }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const kyc = getKycMeta(u.kycLevel);
                const isBlacklisted = blacklist.includes(u.id);
                return (
                  <tr key={u.id}>
                    <td>
                      <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                        <Avatar name={u.name} src={u.avatar} />
                        <div>
                          <div className="font-semibold text-sm">{u.name}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                      </Link>
                    </td>
                    <td>
                      <Badge variant="blue">{ROLE_LABELS[u.role] || u.role}</Badge>
                    </td>
                    <td>
                      <Badge variant={u.kycLevel === "L3" ? "green" : u.kycLevel === "L2" ? "blue" : "muted"}>
                        {kyc.code} · {kyc.name}
                      </Badge>
                    </td>
                    <td>
                      <span className="font-semibold">{u.trustScore}</span>
                      <span className="text-muted text-xs">/1000</span>
                    </td>
                    <td>
                      <Money amount={u.walletBalance} compact />
                    </td>
                    <td className="text-sm text-muted">{formatDate(u.joinedAt)}</td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        <Link href={`/admin/users/${u.id}`} className="btn btn-ghost btn-icon" title="Xem hồ sơ">
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon"
                          title="Nâng cấp KYC"
                          disabled={u.kycLevel === "L3"}
                          onClick={() => upgradeKyc(u.id, u.kycLevel)}
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-icon"
                          title={isBlacklisted ? "Bỏ chặn" : "Đưa vào danh sách đen"}
                          style={{
                            color: isBlacklisted ? "var(--danger)" : "var(--muted)",
                            background: isBlacklisted ? "var(--danger-light)" : "transparent",
                          }}
                          onClick={() => toggleBlacklist(u.id)}
                        >
                          {isBlacklisted ? <ShieldOff size={16} /> : <Ban size={16} />}
                        </button>
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

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersPageInner />
    </Suspense>
  );
}
