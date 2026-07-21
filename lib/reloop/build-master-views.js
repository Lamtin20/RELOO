/**
 * RELOOP CHARACTER LOCK v2 — Orthographic view derivations
 * @source master-artwork-lock.png front lock + 93_CAMERA_SYSTEM.md ratios
 * Side/back/3-4 views are orthographic projections derived from front geometry.
 * Validate against 3D mesh per 98_3D_TOPOLOGY_GUIDE before production 3D export.
 */
import { COLORS, HEAD } from "./geometry.js";

function defsBlock(prefix) {
  return `<defs>
    <linearGradient id="${prefix}-head-grad" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${COLORS.mint}" />
      <stop offset="100%" stop-color="${COLORS.green}" />
    </linearGradient>
    <linearGradient id="${prefix}-body-grad" x1="0.25" y1="0" x2="0.75" y2="1">
      <stop offset="0%" stop-color="${COLORS.mint}" />
      <stop offset="100%" stop-color="${COLORS.green}" stop-opacity="0.78" />
    </linearGradient>
    <filter id="${prefix}-shadow-blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
    </filter>
  </defs>`;
}

function wrap(viewId, title, body, prefix = "reloop") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" fill-rule="nonzero" role="img" aria-label="${title}">
  ${defsBlock(prefix)}
  <g id="${prefix}-view-${viewId}">
    ${body}
  </g>
</svg>`;
}

/** Side profile — loop ear + AI ring + leaf silhouette */
export function buildSideViewSvg(options = {}) {
  const facing = options.facing ?? "right";
  const flip = facing === "left" ? ' transform="scale(-1 1) translate(-1000 0)"' : "";
  const prefix = options.idPrefix ?? "reloop";

  const body = `
    <ellipse cx="500" cy="935" rx="160" ry="24" fill="${COLORS.dark}" fill-opacity="0.18" filter="url(#${prefix}-shadow-blur)" />
    <path d="M 520 540 C 580 560, 600 650, 590 760 C 580 820, 530 840, 500 835 C 470 840, 420 820, 410 760 C 400 650, 420 560, 480 540 Z" fill="${COLORS.mint}" fill-opacity="0.9" />
    <ellipse cx="500" cy="660" rx="120" ry="145" fill="url(#${prefix}-body-grad)" />
    <text x="500" y="675" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="26" fill="${COLORS.mint}" letter-spacing="1">RELOOP</text>
    <rect x="455" y="780" width="48" height="130" rx="22" fill="url(#${prefix}-body-grad)" />
    <rect x="515" y="780" width="48" height="130" rx="22" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="479" cy="940" rx="44" ry="24" fill="${COLORS.green}" />
    <ellipse cx="539" cy="940" rx="44" ry="24" fill="${COLORS.green}" />
    <g transform="translate(500 260)">
      <ellipse cx="0" cy="0" rx="200" ry="290" fill="url(#${prefix}-head-grad)" />
      <ellipse cx="-20" cy="0" rx="155" ry="220" fill="${COLORS.white}" />
      <ellipse cx="-35" cy="-15" rx="28" ry="48" fill="${COLORS.dark}" />
      <ellipse cx="-42" cy="-28" rx="8" ry="12" fill="${COLORS.white}" />
      <path d="M -55 45 Q -25 65 -5 45" stroke="${COLORS.dark}" stroke-width="6" fill="none" stroke-linecap="round" />
      <path d="M -15 -290 C 20 -310, 45 -280, 35 -250 C 25 -220, -5 -210, -15 -230 Z" fill="${COLORS.green}" />
      <path d="M 120 -80 C 200 -120, 240 -200, 220 -260 C 200 -310, 140 -300, 110 -240 C 90 -190, 95 -130, 120 -80 Z" fill="${COLORS.green}" />
      <circle cx="95" cy="-120" r="36" fill="${COLORS.blue}" fill-opacity="0.55" />
      <circle cx="95" cy="-120" r="18" fill="${COLORS.blue}" fill-opacity="0.85" />
    </g>`;

  return wrap(`side-${facing}`, `RELOOP side view (${facing})`, `<g${flip}>${body}</g>`, prefix);
}

/** Back view — cape leaf dominant, no face panel */
export function buildBackViewSvg(options = {}) {
  const prefix = options.idPrefix ?? "reloop";
  const body = `
    <ellipse cx="500" cy="935" rx="190" ry="26" fill="${COLORS.dark}" fill-opacity="0.18" filter="url(#${prefix}-shadow-blur)" />
    <path d="M 500 535 C 590 545, 640 640, 625 760 C 610 830, 540 860, 500 855 C 460 860, 390 830, 375 760 C 360 640, 410 545, 500 535 Z" fill="${COLORS.mint}" />
    <path d="M 500 560 C 530 580, 545 640, 535 720 C 525 780, 510 800, 500 798 C 490 800, 475 780, 465 720 C 455 640, 470 580, 500 560 Z" fill="${COLORS.green}" fill-opacity="0.35" />
    <rect x="340" y="548" width="320" height="258" rx="52" fill="url(#${prefix}-body-grad)" />
    <g transform="translate(305 630)"><rect x="-27" y="-5" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" /></g>
    <g transform="translate(695 630)"><rect x="-27" y="-5" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" /></g>
    <ellipse cx="305" cy="810" rx="38" ry="34" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="695" cy="810" rx="38" ry="34" fill="url(#${prefix}-body-grad)" />
    <rect x="418" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />
    <rect x="524" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="447" cy="968" rx="52" ry="28" fill="${COLORS.green}" />
    <ellipse cx="553" cy="968" rx="52" ry="28" fill="${COLORS.green}" />
    <circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="url(#${prefix}-head-grad)" />
    <path d="M 175 195 C 95 120, 80 60, 130 45 C 175 35, 195 95, 185 155 C 178 188, 168 210, 155 228 L 142 218 C 158 198, 168 175, 172 150 C 178 110, 160 75, 135 68 C 105 60, 98 115, 155 175 Z" fill="${COLORS.green}" />
    <path d="M 825 195 C 905 120, 920 60, 870 45 C 825 35, 805 95, 815 155 C 822 188, 832 210, 845 228 L 858 218 C 842 198, 832 175, 828 150 C 822 110, 840 75, 865 68 C 895 60, 902 115, 845 175 Z" fill="${COLORS.green}" />
    <path d="M 500 8 C 545 25, 560 55, 552 85 C 545 108, 525 118, 500 115 C 475 118, 455 108, 448 85 C 440 55, 455 25, 500 8 Z" fill="${COLORS.green}" />`;

  return wrap("back", "RELOOP back view", body, prefix);
}

/** 3/4 view — asymmetric face + single prominent ear loop */
export function buildThreeQuarterViewSvg(options = {}) {
  const side = options.side ?? "left";
  const prefix = options.idPrefix ?? "reloop";
  const earX = side === "left" ? 180 : 820;
  const faceX = side === "left" ? 520 : 480;
  const eyeOffset = side === "left" ? 30 : -30;

  const body = `
    <ellipse cx="500" cy="935" rx="185" ry="26" fill="${COLORS.dark}" fill-opacity="0.18" filter="url(#${prefix}-shadow-blur)" />
    <path d="M 500 535 C 570 542, 610 620, 600 720 C 590 780, 530 800, 500 795 C 470 800, 410 780, 400 720 C 390 620, 430 542, 500 535 Z" fill="${COLORS.mint}" fill-opacity="0.92" />
    <rect x="330" y="548" width="340" height="258" rx="52" fill="url(#${prefix}-body-grad)" />
    <text x="500" y="678" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="34" fill="${COLORS.mint}" letter-spacing="1">RELOOP</text>
    <rect x="278" y="625" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" />
    <rect x="668" y="625" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="305" cy="810" rx="38" ry="34" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="695" cy="810" rx="38" ry="34" fill="url(#${prefix}-body-grad)" />
    <rect x="418" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />
    <rect x="524" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />
    <ellipse cx="447" cy="968" rx="52" ry="28" fill="${COLORS.green}" />
    <ellipse cx="553" cy="968" rx="52" ry="28" fill="${COLORS.green}" />
    <circle cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="url(#${prefix}-head-grad)" />
    <rect x="${faceX - 160}" y="168" width="320" height="300" rx="72" fill="${COLORS.white}" />
    <ellipse cx="${faceX + eyeOffset}" cy="260" rx="34" ry="56" fill="${COLORS.dark}" />
    <circle cx="${faceX + eyeOffset - 10}" cy="240" r="8" fill="${COLORS.white}" />
    <path d="M ${faceX - 30} 352 Q ${faceX} 365 ${faceX + 35} 352" stroke="${COLORS.dark}" stroke-width="8" fill="none" stroke-linecap="round" />
    <path d="M 500 8 C 545 25, 560 55, 552 85 C 545 108, 525 118, 500 115 C 475 118, 455 108, 448 85 C 440 55, 455 25, 500 8 Z" fill="${COLORS.green}" />
    <path d="M ${earX} 195 C ${earX - (side === "left" ? 80 : -80)} 120, ${earX - (side === "left" ? 95 : -95)} 60, ${earX - (side === "left" ? 45 : -45)} 45 C ${earX - (side === "left" ? 5 : -5)} 35, ${earX + (side === "left" ? 15 : -15)} 95, ${earX + (side === "left" ? 5 : -5)} 155 C ${earX - (side === "left" ? 2 : -2)} 188, ${earX - (side === "left" ? 12 : -12)} 210, ${earX - (side === "left" ? 25 : -25)} 228 Z" fill="${COLORS.green}" />
    <circle cx="${earX + (side === "left" ? 48 : -48)}" cy="268" r="42" fill="${COLORS.blue}" fill-opacity="0.45" />
    <circle cx="${earX + (side === "left" ? 48 : -48)}" cy="268" r="22" fill="${COLORS.blue}" fill-opacity="0.85" />`;

  return wrap(`three-quarter-${side}`, `RELOOP 3/4 view (${side})`, body, prefix);
}

export function buildTopViewSvg(options = {}) {
  const prefix = options.idPrefix ?? "reloop";
  const body = `
    <ellipse cx="500" cy="500" rx="290" ry="220" fill="url(#${prefix}-head-grad)" />
    <ellipse cx="500" cy="500" rx="200" ry="160" fill="${COLORS.white}" />
    <path d="M 500 210 C 530 230, 545 260, 535 290 C 525 310, 500 318, 475 310 C 455 290, 465 230, 500 210 Z" fill="${COLORS.green}" />
    <path d="M 210 500 C 190 420, 210 340, 260 300 C 310 280, 350 320, 360 380 C 370 440, 330 490, 280 510 C 230 520, 210 500 Z" fill="${COLORS.green}" />
    <path d="M 790 500 C 810 420, 790 340, 740 300 C 690 280, 650 320, 640 380 C 630 440, 670 490, 720 510 C 770 520, 790 500 Z" fill="${COLORS.green}" />
    <circle cx="280" cy="380" r="36" fill="${COLORS.blue}" fill-opacity="0.7" />
    <circle cx="720" cy="380" r="36" fill="${COLORS.blue}" fill-opacity="0.7" />`;

  return wrap("top", "RELOOP top view", body, prefix);
}

export function buildBottomViewSvg(options = {}) {
  const prefix = options.idPrefix ?? "reloop";
  const body = `
    <ellipse cx="500" cy="500" rx="180" ry="120" fill="${COLORS.dark}" fill-opacity="0.12" />
    <ellipse cx="420" cy="480" rx="70" ry="45" fill="${COLORS.green}" />
    <ellipse cx="580" cy="480" rx="70" ry="45" fill="${COLORS.green}" />
    <ellipse cx="420" cy="520" rx="55" ry="18" fill="${COLORS.dark}" fill-opacity="0.3" />
    <ellipse cx="580" cy="520" rx="55" ry="18" fill="${COLORS.dark}" fill-opacity="0.3" />
    <path d="M 500 420 C 560 430, 590 500, 580 560 C 560 610, 520 630, 500 625 C 480 630, 440 610, 420 560 C 410 500, 440 430, 500 420 Z" fill="${COLORS.mint}" fill-opacity="0.85" />`;

  return wrap("bottom", "RELOOP bottom view", body, prefix);
}

export function buildTurnaroundSheetSvg(options = {}) {
  const prefix = options.idPrefix ?? "reloop";
  const views = [
    { label: "Front", svg: options.frontSvg ?? "" },
    { label: "3/4 L", svg: buildThreeQuarterViewSvg({ side: "left", idPrefix: `${prefix}-tq-l` }).replace(/^[\s\S]*?<g id="[^"]+">/, "").replace(/<\/g>\s*<\/svg>$/, "") },
    { label: "Side R", svg: buildSideViewSvg({ facing: "right", idPrefix: `${prefix}-side-r` }).replace(/^[\s\S]*?<g id="[^"]+">/, "").replace(/<\/g>\s*<\/svg>$/, "") },
    { label: "Back", svg: buildBackViewSvg({ idPrefix: `${prefix}-back` }).replace(/^[\s\S]*?<g id="[^"]+">/, "").replace(/<\/g>\s*<\/svg>$/, "") },
    { label: "3/4 R", svg: buildThreeQuarterViewSvg({ side: "right", idPrefix: `${prefix}-tq-r` }).replace(/^[\s\S]*?<g id="[^"]+">/, "").replace(/<\/g>\s*<\/svg>$/, "") },
    { label: "Top", svg: buildTopViewSvg({ idPrefix: `${prefix}-top` }).replace(/^[\s\S]*?<g id="[^"]+">/, "").replace(/<\/g>\s*<\/svg>$/, "") },
  ];

  const cells = views
    .map((v, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 40 + col * 320;
      const y = 80 + row * 420;
      return `<g transform="translate(${x} ${y}) scale(0.28)">
        <rect x="0" y="0" width="1000" height="1000" fill="#FFFFFF" stroke="#DCE3E7" stroke-width="4" rx="12" />
        ${v.svg}
      </g>
      <text x="${x + 140}" y="${y - 12}" text-anchor="middle" font-family="sans-serif" font-size="16" fill="${COLORS.dark}">${v.label}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 880" width="1000" height="880">
  <title>RELOOP RG-01 Turnaround Sheet — CHARACTER LOCK v2</title>
  <rect width="1000" height="880" fill="${COLORS.white}" />
  <text x="500" y="40" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="${COLORS.dark}">RELOOP Turnaround Sheet</text>
  <text x="500" y="64" text-anchor="middle" font-family="sans-serif" font-size="12" fill="${COLORS.blue}">Source: master-artwork-lock.png · Orthographic derivation</text>
  ${cells}
</svg>`;
}

export const MASTER_VIEWS = ["front", "side-left", "side-right", "back", "three-quarter-left", "three-quarter-right", "top", "bottom"];
