"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Pause, Play } from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import "@/app/reloop-mascot.css";
import styles from './MarketplacePromo.module.css';
const SLIDES = [
  {
    id: "rent",
    tone: "sun",
    eyebrow: "RELOO · THUÊ LINH HOẠT",
    title: "Đi nhẹ hành lý.",
    highlight: "Đầy những trải nghiệm.",
    tags: ["Linh hoạt thời gian", "Thử trước khi mua"],
    details: ["Chọn món phù hợp", "Thống nhất thời gian thuê", "Nhận, sử dụng và trả đồ"],
    condition: "Giá thuê, tiền cọc và giao nhận do hai bên thống nhất.",
    emotion: "excited", action: "float", note: "Cuối tuần này, đi thôi!",
    description: "Máy ảnh, đồ camping và thiết bị cho kế hoạch của bạn. Thuê khi cần, trả khi xong.",
    cta: "Khám phá đồ cho thuê",
    href: "/explore?transaction=RENT",
    objects: ["camera", "camping", "electronics"],
  },
  {
    id: "sale",
    tone: "sky",
    eyebrow: "RELOO · MUA & BÁN",
    title: "Bạn ít dùng.",
    highlight: "Ai đó đang cần.",
    tags: ["Tìm món yêu thích", "Trao lại đồ ít dùng"],
    details: ["Xem ảnh và tình trạng", "Trao đổi với người bán", "Thỏa thuận giá và giao nhận"],
    condition: "Kiểm tra tình trạng sản phẩm và thỏa thuận trước giao dịch.",
    emotion: "happy", action: "recycle", note: "Một món đồ. Một vòng đời mới.",
    description: "Chọn món đồ yêu thích hoặc bán món bạn ít dùng.",
    cta: "Khám phá đồ đang bán",
    href: "/explore?transaction=SALE",
    objects: ["fashion", "home", "vehicle"],
  },
  {
    id: "affiliate",
    tone: "peach",
    eyebrow: "RELOO · ƯU ĐÃI LIÊN KẾT",
    title: "Mua sắm tại đối tác.",
    highlight: "Có cơ hội nhận hoàn tiền.",
    condition: "Hoàn tiền tùy chương trình. Mua và thanh toán tại đối tác.",
    tags: ["Xem ưu đãi", "Kiểm tra điều kiện", "Mua tại đối tác"],
    details: ["Chọn chương trình ưu đãi", "Đọc điều kiện hoàn tiền", "Mua và thanh toán tại đối tác"],
    emotion: "celebrate", action: "success_reveal", note: "Chọn đúng món, vui hơn mỗi ngày!",
    description: "Xem các chương trình mua sắm liên kết trên RELOO. Khoản hoàn tiền phụ thuộc điều kiện của từng chương trình.",
    cta: "Xem ưu đãi hoàn tiền",
    href: "/cashback",
    objects: ["beauty", "sports", "default"],
  },
];
export function MarketplacePromo({ compact = false }) {
  const track = useRef(null),
    [active, setActive] = useState(0);
  const slides = compact ? SLIDES.slice(1) : SLIDES;
  const [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false);
  useEffect(() => {
    if (paused || interacting || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      const node = track.current;
      if (
        !node ||
        document.hidden ||
        node.getBoundingClientRect().bottom < 0 ||
        node.getBoundingClientRect().top > innerHeight
      )
        return;
      const i =
        (Math.round(node.scrollLeft / node.clientWidth) + 1) % slides.length;
      node.scrollTo({
        left: i * node.clientWidth,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [active, paused, interacting, slides.length]);
  function select(i) {
    const node = track.current;
    if (node)
      node.scrollTo({
        left: i * node.clientWidth,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }
  return (
    <section
      className={"market-promo " + styles.promo + " " + (compact ? "market-promo--compact " + styles.compact : "")}
      aria-label="Gợi ý từ RELOO"
      aria-roledescription="carousel"
      onPointerEnter={() => setInteracting(true)}
      onPointerLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setInteracting(false);
      }}
    >
      <div
        className="market-promo__track"
        ref={track}
        onScroll={() => {
          const node = track.current;
          if (node) setActive(Math.round(node.scrollLeft / node.clientWidth));
        }}
      >
        {slides.map((slide) => (
          <Link
            key={slide.id}
            href={slide.href}
            className={"market-promo__slide " + styles.slide + " " + styles[slide.tone]}
          >
            <div className={styles.copy}>
              <small>{slide.eyebrow}</small>
              <h2>{slide.title}<em>{slide.highlight}</em></h2>
              <p>{slide.description}</p>
              <div className={styles.tags}>{slide.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
              <ol className={styles.details}>{slide.details.map((text,i)=><li key={text}><b>{i+1}</b><span>{text}</span></li>)}</ol>
              <span className={styles.cta}>
                {slide.cta}
                <MorphIcon icon={ArrowUpRight} size={17} />
              </span>
            </div>
            <picture><source media="(max-width:600px)" srcSet={"/images/refresh-20261018/campaign-"+slide.id+"-mobile.webp"}/><Image className={styles.scene} src={"/images/refresh-20261018/campaign-"+slide.id+"-wide.webp"} alt="" width={1920} height={960} sizes="(max-width: 600px) 100vw, 62vw" loading="eager" /></picture>
            <div className={styles.blend} aria-hidden="true" />

            <small className={styles.condition}>{slide.condition}</small>
          </Link>
        ))}
      </div>
      <div className={styles.controls}>
        <div className={styles.indicators} aria-label="Chọn banner">
        {slides.map((slide, i) => (
          <button
            className={styles.indicator}
            key={slide.id}
            type="button"
            aria-label={"Xem banner " + (i + 1)}
            aria-pressed={active === i}
            onClick={() => select(i)}
          />
        ))}
        </div>
        <button
          className={styles.pause}
          type="button"
          aria-label={
            paused ? "Tiếp tục chuyển banner" : "Tạm dừng chuyển banner"
          }
          onClick={() => setPaused(!paused)}
        >
          <MorphIcon icon={paused ? Play : Pause} size={15} />
        </button>
      </div>
    </section>
  );
}
