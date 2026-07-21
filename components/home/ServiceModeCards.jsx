"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { HOME_SERVICE_MODES } from "@/lib/home-mioto-content";

export function ServiceModeCards() {
  return (
    <section className="home-services container" aria-labelledby="home-services-title">
      <h2 id="home-services-title" className="home-services__title">
        Dịch vụ của RELOO
      </h2>
      <div className="home-services__grid">
        {HOME_SERVICE_MODES.map((mode) => (
          <article
            key={mode.id}
            className={`home-service-card home-service-card--${mode.tone}`}
          >
            <h3>{mode.title}</h3>
            <p>{mode.desc}</p>
            <Link href={mode.href} className="home-service-card__link">
              {mode.cta}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
