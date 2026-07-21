"use client";

import { HomeBookingCard } from "@/components/home/HomeBookingCard";

export function HomeMobileHero({ locationLabel, onSearch }) {
  return (
    <section className="home-mioto-hero" aria-label="Tìm đồ thuê trên RELOO">
      <div className="home-mioto-hero__visual">
        <div className="home-mioto-hero__glow home-mioto-hero__glow--a" aria-hidden="true" />
        <div className="home-mioto-hero__glow home-mioto-hero__glow--b" aria-hidden="true" />
        <div className="home-mioto-hero__copy">
          <p className="home-mioto-hero__eyebrow">RELOO · Cho thuê P2P uy tín</p>
          <h1 className="home-mioto-hero__title">Cùng bạn trên mọi hành trình</h1>
          <p className="home-mioto-hero__sub">
            Máy ảnh, camping, thời trang — <strong>hàng nghìn tin</strong> gần bạn
          </p>
        </div>
      </div>
      <HomeBookingCard locationLabel={locationLabel} onSearch={onSearch} />
    </section>
  );
}
