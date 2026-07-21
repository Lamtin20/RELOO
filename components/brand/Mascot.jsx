"use client";

/** RELOOP RG-01 — 3D hero lock (100% master artwork fidelity) */
const HERO_SRC = "/brand/reloop-hero-ui.png";

const SIZE_PRESETS = { xs: 72, sm: 120, md: 200, lg: 280, xl: 360 };

/**
 * Linh vật RELOOP — render trực tiếp từ golden master 3D.
 * @source RELOOP_CHARACTER_MASTER/reference/master-hero-lock.png
 */
export function Mascot({
  size = "md",
  className = "",
  title = "RELOOP — Guardian of Trust",
}) {
  const px = typeof size === "number" ? size : SIZE_PRESETS[size] ?? SIZE_PRESETS.md;

  return (
    <div
      className={["mascot", "reloop-mascot", className].filter(Boolean).join(" ")}
      style={{ width: px, maxWidth: "100%" }}
      title={title}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_SRC}
        alt=""
        className="reloop-mascot__img"
        width={px}
        height={px}
        draggable={false}
        decoding="async"
        aria-hidden={!title}
      />
    </div>
  );
}
