"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, Search } from "lucide-react";

import { HOME_SERVICE_TABS } from "@/lib/home-mioto-content";

export function HomeBookingCard({
  locationLabel = "TP. Hồ Chí Minh",
  onSearch,
  className = "",
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(HOME_SERVICE_TABS[0].id);
  const [query, setQuery] = useState("");

  const tab = HOME_SERVICE_TABS.find((t) => t.id === activeTab) ?? HOME_SERVICE_TABS[0];

  function handleSubmit(e) {
    e.preventDefault();
    if (activeTab === "lend") {
      router.push(tab.exploreHref);
      return;
    }
    const q = query.trim();
    if (onSearch) {
      onSearch(q, activeTab);
      return;
    }
    const base = tab.exploreHref;
    router.push(q ? `${base}${base.includes("?") ? "&" : "?"}q=${encodeURIComponent(q)}` : base);
  }

  return (
    <div className={`home-booking-card ${className}`.trim()}>
      <div className="home-booking-card__tabs" role="tablist" aria-label="Loại dịch vụ">
        {HOME_SERVICE_TABS.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeTab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`home-booking-card__tab${isActive ? " home-booking-card__tab--active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <form className="home-booking-card__form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="home-booking-card__field home-booking-card__field--btn"
          onClick={() => router.push("/welcome")}
        >
          <MapPin size={18} className="home-booking-card__field-icon" aria-hidden="true" />
          <span className="home-booking-card__field-body">
            <span className="home-booking-card__field-label">Khu vực</span>
            <span className="home-booking-card__field-value">{locationLabel}</span>
          </span>
        </button>

        {activeTab !== "lend" ? (
          <>
            <label className="home-booking-card__field">
              <Search size={18} className="home-booking-card__field-icon" aria-hidden="true" />
              <span className="home-booking-card__field-body">
                <span className="home-booking-card__field-label">Tìm đồ cần thuê</span>
                <input
                  type="search"
                  className="home-booking-card__input"
                  placeholder="Máy ảnh, lều camping, váy dạ hội..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </span>
            </label>
            <div className="home-booking-card__hint">
              <CalendarDays size={14} aria-hidden="true" />
              <span>Chọn ngày thuê trên trang sản phẩm · Giảm đến 30% thuê dài ngày</span>
            </div>
          </>
        ) : (
          <div className="home-booking-card__lend-copy">
            <p>Đăng tin miễn phí — RELOO kiểm tra tình trạng &amp; bảo chứng minh bạch cho mỗi giao dịch.</p>
          </div>
        )}

        <button type="submit" className="home-booking-card__cta btn btn-primary">
          {activeTab === "lend" ? "Bắt đầu cho thuê" : "Tìm đồ thuê"}
        </button>
      </form>
    </div>
  );
}
