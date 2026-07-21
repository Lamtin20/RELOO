"use client";

import { HOME_TRUST_BENEFITS } from "@/lib/home-mioto-content";

export function TrustBenefitsCarousel() {
  return (
    <section className="home-benefits" aria-labelledby="home-benefits-title">
      <div className="container home-benefits__head">
        <h2 id="home-benefits-title">Hành trình thuê của bạn luôn được bảo vệ</h2>
        <p className="home-benefits__sub">
          Những tính năng giúp bạn dễ dàng hơn khi thuê trên RELOO
        </p>
      </div>
      <div className="home-benefits__track-wrap">
        <div className="home-benefits__track">
          {HOME_TRUST_BENEFITS.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.id} className="home-benefit-card">
                <span className="home-benefit-card__icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
