"use client";

import Link from "next/link";

import { HOME_POPULAR_AREAS } from "@/lib/home-mioto-content";

export function PopularAreasRow() {
  return (
    <section className="home-areas container" aria-labelledby="home-areas-title">
      <h2 id="home-areas-title" className="home-areas__title">
        Khu vực nổi bật
      </h2>
      <div className="home-areas__track">
        {HOME_POPULAR_AREAS.map((area) => (
          <Link
            key={area.id}
            href={`/explore?q=${encodeURIComponent(area.query)}`}
            className="home-areas__chip"
          >
            <span className="home-areas__chip-label">{area.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
