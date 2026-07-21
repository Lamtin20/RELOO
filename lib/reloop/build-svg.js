/**
 * RG-01 SVG builder — compiled from RELOOP OS 96/95/97
 * @source packages/svg-library, RELOOP_CHARACTER_MASTER
 */
import { COLORS, EYES, FACE, HEAD, eyeCenters } from "./geometry";

const PATHS = {
  cape: "M 460 520 L 540 520 Q 570 640 560 760 Q 500 780 440 760 Q 430 640 460 520 Z",
  leaf: "M 0 -85 C 50 -34, 40 85, 0 85 C -40 85, -50 -34, 0 -85 Z",
  loopLeft: "M 157.5 170 A 150 150 0 1 1 157.5 350",
  loopRight: "M 842.5 170 A 150 150 0 1 0 842.5 350",
};

/** @source 91_EXPRESSION_MATRIX.md + legacy Mascot variants */
export const VARIANT_PRESETS = {
  default: {
    headTilt: 0,
    smileScale: 1,
    glow: false,
    eyeRyScale: 1,
    eyeDx: 0,
    eyeDy: 0,
    armLeftRotate: -8,
    armRightRotate: 8,
  },
  idle: {
    headTilt: 0,
    smileScale: 1,
    glow: false,
    eyeRyScale: 1,
    armLeftRotate: -8,
    armRightRotate: 8,
  },
  wave: {
    headTilt: 4,
    smileScale: 1,
    glow: false,
    eyeRyScale: 1.05,
    armLeftRotate: -10,
    armRightRotate: -70,
    armRightRaise: 80,
  },
  think: {
    headTilt: 8,
    smileScale: 0.5,
    glow: true,
    glowColor: COLORS.blue,
    glowOpacity: 0.1,
    eyeRyScale: 0.95,
    eyeDx: -6,
    eyeDy: -12,
    armLeftRotate: -8,
    armRightRotate: -45,
    armRightRaise: 40,
  },
  thinking: {
    headTilt: 8,
    smileScale: 0.5,
    glow: true,
    glowColor: COLORS.blue,
    glowOpacity: 0.1,
    eyeRyScale: 0.95,
    eyeDx: -6,
    eyeDy: -12,
  },
  success: {
    headTilt: 4,
    smileScale: 1.35,
    glow: true,
    glowColor: COLORS.glowGreen,
    glowOpacity: 0.12,
    eyeRyScale: 1.15,
  },
  celebrate: {
    headTilt: 4,
    smileScale: 1.4,
    glow: true,
    glowColor: COLORS.glowGreen,
    glowOpacity: 0.12,
    eyeRyScale: 0.15,
  },
  sleep: {
    headTilt: 4,
    smileScale: 0.5,
    glow: true,
    glowColor: COLORS.white,
    glowOpacity: 0.05,
    eyeRyScale: 0.12,
  },
  listening: {
    headTilt: 5,
    smileScale: 0.75,
    glow: true,
    glowColor: COLORS.blue,
    glowOpacity: 0.08,
  },
  loading: {
    headTilt: 0,
    smileScale: 0.75,
    glow: true,
    glowColor: COLORS.white,
    glowOpacity: 0.06,
    eyeRyScale: 0.45,
  },
  verify: {
    headTilt: 0,
    smileScale: 0.75,
    glow: true,
    glowColor: COLORS.green,
    glowOpacity: 0.12,
    eyeRyScale: 0.92,
  },
};

export function buildReloopSvg(options = {}) {
  const preset = VARIANT_PRESETS[options.variant] ?? VARIANT_PRESETS.default;
  const {
    headTilt = preset.headTilt ?? 0,
    smileScale = preset.smileScale ?? 1,
    glow = preset.glow ?? false,
    glowColor = preset.glowColor ?? COLORS.glowGreen,
    glowOpacity = preset.glowOpacity ?? 0.35,
    shadow = true,
    eyeRyScale = preset.eyeRyScale ?? 1,
    eyeDx = preset.eyeDx ?? 0,
    eyeDy = preset.eyeDy ?? 0,
    translateY = preset.translateY ?? 0,
    bodyRotate = preset.bodyRotate ?? 0,
    armLeftRotate = preset.armLeftRotate ?? -8,
    armRightRotate = preset.armRightRotate ?? 8,
    armRightRaise = preset.armRightRaise ?? 0,
    idPrefix = "reloop",
    animate = false,
  } = { ...preset, ...options };

  const filterId = `${idPrefix}-shadow-blur`;
  const smileRx = 32 * smileScale;
  const smileRy = 9 * smileScale;
  const eyeRy = 56 * eyeRyScale;
  const eyes = eyeCenters();
  const eyeLeftCx = eyes.left.cx + eyeDx;
  const eyeRightCx = eyes.right.cx + eyeDx;
  const eyeCy = eyes.left.cy + eyeDy;

  const rootTransform = translateY ? ` transform="translate(0 ${translateY})"` : "";
  const headGroupClass = animate ? ` class="${idPrefix}-head-group reloop-animate-idle"` : "";
  const rootClass = animate ? ` class="reloop-animate-root"` : "";

  const parts = [];

  if (shadow) {
    parts.push(
      `<ellipse id="${idPrefix}-shadow" cx="500" cy="920" rx="180" ry="24" fill="${COLORS.dark}" fill-opacity="0.15" filter="url(#${filterId})" />`,
    );
  }

  if (glow) {
    parts.push(
      `<circle id="${idPrefix}-glow" cx="500" cy="260" r="314" fill="${glowColor}" fill-opacity="${glowOpacity}" />`,
    );
  }

  parts.push(
    `<path id="${idPrefix}-cape" d="${PATHS.cape}" fill="${COLORS.blue}" fill-opacity="0.85" />`,
    `<g id="${idPrefix}-body-group" transform="rotate(${bodyRotate} 500 675)">`,
    `<rect id="${idPrefix}-body" x="330" y="550" width="340" height="250" rx="48" ry="48" fill="${COLORS.green}" />`,
    `<circle id="${idPrefix}-logo" cx="500" cy="675" r="28" fill="${COLORS.mint}" />`,
    `<rect id="${idPrefix}-arm-left" transform="rotate(${armLeftRotate} 302 620)" x="274" y="620" width="56" height="180" rx="28" fill="${COLORS.green}" />`,
    `<rect id="${idPrefix}-arm-right" transform="rotate(${armRightRotate} 698 ${620 - armRightRaise})" x="670" y="620" width="56" height="180" rx="28" fill="${COLORS.green}" />`,
    `<circle id="${idPrefix}-hand-left" cx="302" cy="800" r="36" fill="${COLORS.green}" />`,
    `<circle id="${idPrefix}-hand-right" cx="698" cy="${800 - armRightRaise}" r="36" fill="${COLORS.green}" />`,
    `<rect id="${idPrefix}-leg-left" x="420" y="800" width="56" height="160" rx="20" fill="${COLORS.green}" />`,
    `<rect id="${idPrefix}-leg-right" x="524" y="800" width="56" height="160" rx="20" fill="${COLORS.green}" />`,
    `<ellipse id="${idPrefix}-foot-left" cx="448" cy="981" rx="45" ry="21" fill="${COLORS.dark}" />`,
    `<ellipse id="${idPrefix}-foot-right" cx="552" cy="981" rx="45" ry="21" fill="${COLORS.dark}" />`,
    `</g>`,
    `<g id="${idPrefix}-head-group" transform="rotate(${headTilt} ${HEAD.cx} ${HEAD.cy})"${headGroupClass}>`,
    `<circle id="${idPrefix}-head" cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="${COLORS.green}" />`,
    `<ellipse id="${idPrefix}-face" cx="${FACE.cx}" cy="${FACE.cy}" rx="${FACE.rx}" ry="${FACE.ry}" fill="${COLORS.white}" />`,
    `<ellipse id="${idPrefix}-eye-left" cx="${eyeLeftCx}" cy="${eyeCy}" rx="${EYES.width / 2}" ry="${eyeRy}" fill="${COLORS.dark}" />`,
    `<ellipse id="${idPrefix}-eye-right" cx="${eyeRightCx}" cy="${eyeCy}" rx="${EYES.width / 2}" ry="${eyeRy}" fill="${COLORS.dark}" />`,
    `<ellipse id="${idPrefix}-mouth" cx="500" cy="350" rx="${smileRx}" ry="${smileRy}" fill="${COLORS.dark}" fill-opacity="0.85" />`,
    `<g id="${idPrefix}-leaf" transform="translate(500 75) rotate(-12)">`,
    `<path d="${PATHS.leaf}" fill="${COLORS.mint}" />`,
    `</g>`,
    `<path id="${idPrefix}-loop-left" d="${PATHS.loopLeft}" fill="none" stroke="${COLORS.green}" stroke-width="48" stroke-linecap="round" />`,
    `<path id="${idPrefix}-loop-right" d="${PATHS.loopRight}" fill="none" stroke="${COLORS.green}" stroke-width="48" stroke-linecap="round" />`,
    `</g>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" fill-rule="nonzero" role="img" aria-label="RELOOP Guardian of Trust">
  <defs>
    <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
    </filter>
  </defs>
  <g id="${idPrefix}-root"${rootTransform}${rootClass}>
    ${parts.join("\n    ")}
  </g>
</svg>`;
}
