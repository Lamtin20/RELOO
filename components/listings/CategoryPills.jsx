"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LayoutGrid, ChevronLeft, ChevronRight } from "lucide-react";
import { Icon } from "@/components/ui";
import { getCategoryColors } from "@/lib/category-colors";

function useScrollProgress(trackRef) {
  const [progress, setProgress] = useState(0);

  const updateProgress = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setProgress(maxScroll <= 0 ? 1 : el.scrollLeft / maxScroll);
  }, [trackRef]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;

    updateProgress();
    el.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      el.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [trackRef, updateProgress]);

  return progress;
}

export function CategoryPills({
  categories = [],
  activeSlug = null,
  getHref,
  className = "",
  variant = "wrap",
}) {
  const scrollerRef = useRef(null);
  const buildHref = getHref || ((slug) => (slug ? `/explore?category=${slug}` : "/explore"));

  useEffect(() => {
    if (variant !== "scroll" || !scrollerRef.current) return;
    const active = scrollerRef.current.querySelector(".cat-pill--active");
    active?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeSlug, variant, categories.length]);

  function scrollBy(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: "smooth" });
  }

  const pills = (
    <>
      <Link
        href={buildHref(null)}
        className={`cat-pill ${!activeSlug ? "cat-pill--active" : ""}`}
      >
        <LayoutGrid size={15} />
        <span>Tất cả</span>
      </Link>
      {categories.map((cat) => (
        <Link
          key={cat.id}
          href={buildHref(cat.slug)}
          className={`cat-pill ${activeSlug === cat.slug ? "cat-pill--active" : ""}`}
        >
          <Icon name={cat.icon} size="sm" />
          <span>{cat.name}</span>
        </Link>
      ))}
    </>
  );

  if (variant === "scroll") {
    return (
      <div className={`cat-pills-wrap ${className}`.trim()}>
        <button
          type="button"
          className="cat-pills-wrap__nav cat-pills-wrap__nav--prev"
          onClick={() => scrollBy(-1)}
          aria-label="Cuộn trái"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="cat-pills cat-pills--scroll" ref={scrollerRef}>
          {pills}
        </div>
        <button
          type="button"
          className="cat-pills-wrap__nav cat-pills-wrap__nav--next"
          onClick={() => scrollBy(1)}
          aria-label="Cuộn phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  return <div className={`cat-pills ${className}`.trim()}>{pills}</div>;
}

/**
 * Danh mục 1 hàng ngang (scroll), icon trên - tên dưới.
 */
export function CategoryRow({ categories = [], showProgress = true }) {
  const scrollerRef = useRef(null);
  const progress = useScrollProgress(scrollerRef);

  function scrollBy(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 280, behavior: "smooth" });
  }

  return (
    <div className="cat-row">
      <div className="cat-row__track" ref={scrollerRef}>
        {categories.map((cat, i) => {
          const colors = getCategoryColors(cat.slug, i);
          return (
            <Link
              key={cat.id}
              href={`/explore?category=${cat.slug}`}
              className="cat-row__item"
            >
              <span
                className="cat-row__icon"
                style={{
                  "--cat-bg": colors.bg,
                  "--cat-fg": colors.fg,
                  "--cat-shadow": colors.shadow,
                }}
              >
                <Icon name={cat.icon} size={28} />
              </span>
              <span className="cat-row__label">{cat.name}</span>
            </Link>
          );
        })}
      </div>
      {showProgress && categories.length > 4 && (
        <div className="cat-row__progress" aria-hidden="true">
          <span
            className="cat-row__progress-fill"
            style={{ width: `${Math.max(18, progress * 100)}%` }}
          />
        </div>
      )}
      <button
        type="button"
        className="cat-row__nav cat-row__nav--prev"
        onClick={() => scrollBy(-1)}
        aria-label="Cuộn trái"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        className="cat-row__nav cat-row__nav--next"
        onClick={() => scrollBy(1)}
        aria-label="Cuộn phải"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

/** @deprecated Dùng CategoryRow cho trang chủ */
export function CategoryTiles({ categories = [] }) {
  return <CategoryRow categories={categories} />;
}
