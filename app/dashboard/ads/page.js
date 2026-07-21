"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Tag,
  Crown,
  Landmark,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useAuth, useListings, useReloo } from "@/lib/store";
import { Money, EmptyState, Badge } from "@/components/ui";
import { CATEGORIES, USER_TERMS } from "@/lib/constants";

const TYPE_META = {
  push_up: { title: "Đẩy tin (Push Up)", icon: Rocket, desc: "Đưa tin lên đầu danh mục ngay lập tức" },
  label: { title: "Nhãn nổi bật", icon: Tag, desc: "Gắn nhãn ưu tiên/verified để tăng độ tin cậy" },
  pro_store: { title: "Cửa hàng Pro", icon: Crown, desc: "Gian hàng VIP, giảm phí sàn còn 12%" },
};

const COMPARISON_DATA = [
  { label: "Lượt xem trung bình / tuần", noAds: 320, withAds: 1240, unit: "" },
  { label: "Tỷ lệ chuyển đổi thành đơn thuê", noAds: 8, withAds: 23, unit: "%" },
  { label: "Thời gian có đơn đầu tiên (ngày)", noAds: 12, withAds: 3, unit: " ngày" },
];

export default function AdsPage() {
  const { user } = useAuth();
  const { listings, boostListing } = useListings({ ownerId: user?.id });
  const { state, actions } = useReloo();
  const [selectedListing, setSelectedListing] = useState(listings[0]?.id ?? "");
  const [feedback, setFeedback] = useState(null);

  const grouped = useMemo(() => {
    const g = { push_up: [], label: [], pro_store: [] };
    (state.adsPackages ?? []).forEach((pkg) => {
      if (g[pkg.type]) g[pkg.type].push(pkg);
    });
    return g;
  }, [state.adsPackages]);

  if (!user) return null;

  const handlePurchase = (pkg) => {
    if (user.walletBalance < pkg.price) {
      setFeedback({ type: "error", text: `${USER_TERMS.RENTAL_BALANCE} không đủ để mua gói này.` });
      return;
    }
    if ((pkg.type === "push_up" || pkg.type === "label") && !selectedListing) {
      setFeedback({ type: "error", text: "Vui lòng chọn tin đăng để áp dụng." });
      return;
    }

    actions.purchaseAds({
      userId: user.id,
      listingId: pkg.type === "pro_store" ? undefined : selectedListing,
      packageId: pkg.id,
      price: pkg.price,
    });
    setFeedback({ type: "success", text: `Đã mua "${pkg.name}" thành công!` });
  };

  const handleBoost = (listingId) => {
    boostListing(listingId, { labels: ["Tin ưu tiên"], durationDays: 3 });
    setFeedback({ type: "success", text: "Đã đẩy tin lên đầu danh mục!" });
  };

  const maxComparisonValue = Math.max(
    ...COMPARISON_DATA.map((d) => Math.max(d.noAds, d.withAds))
  );

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Quảng cáo & Đẩy tin</h1>
          <p className="text-muted mt-2">
            Tăng độ hiển thị và tỷ lệ chuyển đổi cho tin đăng của bạn
          </p>
        </div>
        <div className="dashboard-finance-pill">
          <Landmark size={16} />
          <span>
            {USER_TERMS.RENTAL_BALANCE}: <Money amount={user.walletBalance} />
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`dashboard-notice mt-4 ${
            feedback.type === "error" ? "dashboard-notice--error" : "dashboard-notice--success"
          }`}
        >
          {feedback.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {listings.length > 0 && (
        <div className="panel mt-6">
          <div className="input-group">
            <label className="input-label" htmlFor="listing-select">
              Áp dụng cho tin đăng
            </label>
            <select
              id="listing-select"
              className="select"
              value={selectedListing}
              onChange={(e) => setSelectedListing(e.target.value)}
            >
              {listings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
            <span className="input-hint">
              Dùng cho các gói Đẩy tin và Nhãn nổi bật (Cửa hàng Pro áp dụng cho
              toàn bộ tài khoản)
            </span>
          </div>
        </div>
      )}

      {Object.entries(TYPE_META).map(([type, meta]) => {
        const MetaIcon = meta.icon;
        const packages = grouped[type] ?? [];
        if (packages.length === 0) return null;
        return (
          <div key={type} className="panel mt-6">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <MetaIcon size={18} className="text-green" />
                <div>
                  <h2 className="panel-title">{meta.title}</h2>
                  <span className="text-xs text-muted">{meta.desc}</span>
                </div>
              </div>
            </div>
            <div className="dashboard-ads-grid">
              {packages.map((pkg) => (
                <div key={pkg.id} className="dashboard-ads-card">
                  <span className="font-semibold text-sm">{pkg.name}</span>
                  <p className="text-xs text-muted mt-1">{pkg.description}</p>
                  {pkg.categoryId && (
                    <span className="text-xs text-muted block mt-1">
                      Danh mục: {CATEGORIES.find((c) => c.id === pkg.categoryId)?.name}
                    </span>
                  )}
                  <Money amount={pkg.price} className="dashboard-ads-card__price mt-3" />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-full mt-3"
                    onClick={() => handlePurchase(pkg)}
                  >
                    Mua ngay
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="panel mt-6">
        <div className="panel-header">
          <h2 className="panel-title">So sánh: Có Ads vs Không Ads</h2>
        </div>
        <div className="dashboard-comparison">
          {COMPARISON_DATA.map((row) => (
            <div key={row.label} className="dashboard-comparison__row">
              <span className="text-sm font-medium mb-2 block">{row.label}</span>
              <div className="dashboard-comparison__bars">
                <div className="dashboard-comparison__bar-track">
                  <span className="text-xs text-muted">Không Ads</span>
                  <div className="dashboard-comparison__bar-bg">
                    <div
                      className="dashboard-comparison__bar dashboard-comparison__bar--muted"
                      style={{ width: `${(row.noAds / maxComparisonValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold">
                    {row.noAds}
                    {row.unit}
                  </span>
                </div>
                <div className="dashboard-comparison__bar-track">
                  <span className="text-xs text-green">Có Ads</span>
                  <div className="dashboard-comparison__bar-bg">
                    <div
                      className="dashboard-comparison__bar dashboard-comparison__bar--green"
                      style={{ width: `${(row.withAds / maxComparisonValue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-green">
                    {row.withAds}
                    {row.unit}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel mt-6">
        <div className="panel-header">
          <h2 className="panel-title">Tin đăng của bạn</h2>
        </div>
        {listings.length === 0 ? (
          <EmptyState
            icon="Megaphone"
            title="Chưa có tin đăng"
            description="Đăng tài sản để bắt đầu sử dụng công cụ quảng cáo."
            action={
              <Link href="/dashboard/assets/new" className="btn btn-primary">
                Đăng đồ ngay
              </Link>
            }
          />
        ) : (
          <div className="dashboard-boost-list">
            {listings.map((l) => (
              <div key={l.id} className="dashboard-boost-row">
                <span className="text-sm font-medium">{l.title}</span>
                <div className="flex items-center gap-2">
                  {l.isBoosted && <Badge variant="warning">Đang đẩy</Badge>}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={l.isBoosted}
                    onClick={() => handleBoost(l.id)}
                  >
                    <Rocket size={14} /> {l.isBoosted ? "Đã đẩy" : "Đẩy tin"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
