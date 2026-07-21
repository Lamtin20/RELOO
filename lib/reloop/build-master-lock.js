/**
 * RELOOP CHARACTER CORE — Master SVG builder
 * @source reference/master-character-bible.png + master-hero-lock.png
 */
import { COLORS, HEAD, eyeCenters } from "./geometry.js";
import { renderEyes, renderMouth, renderIcons, renderProp } from "./face-builder.js";
import {
  MASTER_EXPRESSIONS,
  MASTER_POSES,
  resolveVariant,
  EXPRESSION_IDS,
  POSE_IDS,
  UI_EXPRESSION_MAP,
  uiExpression,
} from "./expression-registry.js";

export {
  MASTER_EXPRESSIONS,
  MASTER_POSES,
  MASTER_VARIANTS,
  EXPRESSION_IDS,
  POSE_IDS,
  UI_EXPRESSION_MAP,
  uiExpression,
} from "./expression-registry.js";

const LOOP_LEFT_PATH =
  "M 175 195 C 95 120, 80 60, 130 45 C 175 35, 195 95, 185 155 C 178 188, 168 210, 155 228 L 142 218 C 158 198, 168 175, 172 150 C 178 110, 160 75, 135 68 C 105 60, 98 115, 155 175 Z";

const LOOP_RIGHT_PATH =
  "M 825 195 C 905 120, 920 60, 870 45 C 825 35, 805 95, 815 155 C 822 188, 832 210, 845 228 L 858 218 C 842 198, 832 175, 828 150 C 822 110, 840 75, 865 68 C 895 60, 902 115, 845 175 Z";

const LEAF_PATH =
  "M 500 8 C 545 25, 560 55, 552 85 C 545 108, 525 118, 500 115 C 475 118, 455 108, 448 85 C 440 55, 455 25, 500 8 Z";

const CAPE_LEAF_PATH =
  "M 500 535 C 580 540, 620 620, 610 720 C 600 780, 540 800, 500 795 C 460 800, 400 780, 390 720 C 380 620, 420 540, 500 535 Z";

function defsBlock(prefix) {
  return `<defs>
    <linearGradient id="${prefix}-head-grad" x1="0.2" y1="0" x2="0.8" y2="1">
      <stop offset="0%" stop-color="${COLORS.mint}" />
      <stop offset="55%" stop-color="${COLORS.green}" />
      <stop offset="100%" stop-color="${COLORS.green}" stop-opacity="0.82" />
    </linearGradient>
    <linearGradient id="${prefix}-body-grad" x1="0.25" y1="0" x2="0.75" y2="1">
      <stop offset="0%" stop-color="${COLORS.mint}" />
      <stop offset="100%" stop-color="${COLORS.green}" stop-opacity="0.78" />
    </linearGradient>
    <radialGradient id="${prefix}-highlight" cx="0.35" cy="0.28" r="0.55">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.22" />
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="${prefix}-ai-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${COLORS.blue}" stop-opacity="0.95" />
      <stop offset="70%" stop-color="${COLORS.blue}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="${COLORS.blue}" stop-opacity="0" />
    </radialGradient>
    <filter id="${prefix}-shadow-blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18" />
    </filter>
    <filter id="${prefix}-ai-blur" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
    </filter>
  </defs>`;
}

function mittenSvg(gradId) {
  return `<ellipse cx="0" cy="8" rx="38" ry="34" fill="url(#${gradId})" />
    <circle cx="-18" cy="-8" r="10" fill="url(#${gradId})" />
    <circle cx="-6" cy="-12" r="10" fill="url(#${gradId})" />
    <circle cx="6" cy="-12" r="10" fill="url(#${gradId})" />
    <circle cx="18" cy="-8" r="10" fill="url(#${gradId})" />
    <ellipse cx="28" cy="4" rx="12" ry="16" fill="url(#${gradId})" />`;
}

export function buildMasterLockSvg(options = {}) {
  const face = resolveVariant(options.variant ?? "idle");
  const pose = options.pose ? resolveVariant(options.pose) : {};
  const faceKeys = [
    "eyeMode", "mouthMode", "winkSide", "icons", "blush", "hideBlush", "smileScale",
    "eyeDy", "eyeDyLeft", "eyeDyRight", "eyeRyScale", "eyesClosed", "glow", "glowColor", "glowOpacity", "headTilt",
  ];
  const preset = { ...pose, ...face };
  for (const k of faceKeys) {
    if (face[k] !== undefined) preset[k] = face[k];
  }
  const p = { ...preset, ...options };
  const prefix = p.idPrefix ?? "reloop";

  const headTilt = p.headTilt ?? 0;
  const glow = p.glow ?? false;
  const glowColor = p.glowColor ?? COLORS.blue;
  const glowOpacity = p.glowOpacity ?? 0.15;
  const armLeftRotate = p.armLeftRotate ?? -12;
  const armRightRotate = p.armRightRotate ?? 12;
  const armRightRaise = p.armRightRaise ?? 0;
  const armLeftRaise = p.armLeftRaise ?? 0;
  const translateY = p.translateY ?? 0;
  const bodySkew = p.bodySkew ?? 0;
  const animate = p.animate ?? false;
  const showBlush = p.blush !== false && !p.hideBlush;

  const eyes = eyeCenters();
  const eyeRy = (56 / 2) * (p.eyeRyScale ?? 1);
  const parts = [];

  parts.push(
    `<ellipse id="${prefix}-shadow" cx="500" cy="935" rx="190" ry="26" fill="${COLORS.dark}" fill-opacity="0.18" filter="url(#${prefix}-shadow-blur)" />`,
  );

  if (p.prop === "float-glow") {
    parts.push(renderProp(prefix, "float-glow"));
  }

  if (glow) {
    parts.push(
      `<circle id="${prefix}-glow" cx="500" cy="480" r="420" fill="${glowColor}" fill-opacity="${glowOpacity}" />`,
    );
  }

  parts.push(`<g id="${prefix}-cape">
    <path d="${CAPE_LEAF_PATH}" fill="${COLORS.mint}" fill-opacity="0.92" />
    <path d="M 500 560 L 500 780" stroke="${COLORS.green}" stroke-width="3" stroke-opacity="0.35" stroke-linecap="round" />
    <path d="M 500 620 L 545 700" stroke="${COLORS.green}" stroke-width="2.5" stroke-opacity="0.3" stroke-linecap="round" />
    <path d="M 500 620 L 455 700" stroke="${COLORS.green}" stroke-width="2.5" stroke-opacity="0.3" stroke-linecap="round" />
  </g>`);

  parts.push(`<g id="${prefix}-body-group" transform="translate(0 ${translateY})${bodySkew ? ` skewX(${bodySkew})` : ""}">`);
  parts.push(
    `<rect id="${prefix}-body" x="325" y="548" width="350" height="258" rx="52" ry="52" fill="url(#${prefix}-body-grad)" />`,
    `<g id="${prefix}-logo">
      <text x="500" y="678" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="36" fill="${COLORS.mint}" letter-spacing="1">RELOOP</text>
    </g>`,
    `<g id="${prefix}-arm-left" transform="rotate(${armLeftRotate} 305 ${630 - armLeftRaise})">
      <rect x="278" y="${625 - armLeftRaise}" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" />
    </g>`,
    `<g id="${prefix}-arm-right" transform="rotate(${armRightRotate} 695 ${630 - armRightRaise})">
      <rect x="668" y="${625 - armRightRaise}" width="54" height="168" rx="27" fill="url(#${prefix}-body-grad)" />
    </g>`,
    `<g id="${prefix}-hand-left" transform="translate(305 ${810 - armLeftRaise})">${mittenSvg(`${prefix}-body-grad`)}</g>`,
    `<g id="${prefix}-hand-right" transform="translate(695 ${810 - armRightRaise}) scale(-1 1)">${mittenSvg(`${prefix}-body-grad`)}</g>`,
    `<rect id="${prefix}-leg-left" x="418" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />`,
    `<rect id="${prefix}-leg-right" x="524" y="798" width="58" height="148" rx="22" fill="url(#${prefix}-body-grad)" />`,
    `<ellipse id="${prefix}-foot-left" cx="447" cy="968" rx="52" ry="28" fill="${COLORS.green}" />`,
    `<ellipse id="${prefix}-foot-right" cx="553" cy="968" rx="52" ry="28" fill="${COLORS.green}" />`,
    `<ellipse id="${prefix}-foot-left-sole" cx="447" cy="978" rx="46" ry="12" fill="${COLORS.dark}" fill-opacity="0.35" />`,
    `<ellipse id="${prefix}-foot-right-sole" cx="553" cy="978" rx="46" ry="12" fill="${COLORS.dark}" fill-opacity="0.35" />`,
  );

  if (p.prop && p.prop !== "float-glow") {
    parts.push(renderProp(prefix, p.prop));
  }

  parts.push(`</g>`);

  parts.push(
    `<g id="${prefix}-head-group" transform="translate(0 ${translateY}) rotate(${headTilt} ${HEAD.cx} ${HEAD.cy})"${animate ? ` class="${prefix}-head-group reloop-animate-idle"` : ""}>`,
    `<path id="${prefix}-loop-left" d="${LOOP_LEFT_PATH}" fill="${COLORS.green}" />`,
    `<path id="${prefix}-loop-right" d="${LOOP_RIGHT_PATH}" fill="${COLORS.green}" />`,
    `<circle id="${prefix}-head" cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="url(#${prefix}-head-grad)" />`,
    `<circle id="${prefix}-head-highlight" cx="${HEAD.cx}" cy="${HEAD.cy}" r="${HEAD.r}" fill="url(#${prefix}-highlight)" />`,
    `<circle id="${prefix}-ai-ring-left" cx="228" cy="268" r="42" fill="url(#${prefix}-ai-glow)" filter="url(#${prefix}-ai-blur)" />`,
    `<circle id="${prefix}-ai-ring-left-core" cx="228" cy="268" r="22" fill="${COLORS.blue}" fill-opacity="0.85" />`,
    `<circle id="${prefix}-ai-ring-right" cx="772" cy="268" r="42" fill="url(#${prefix}-ai-glow)" filter="url(#${prefix}-ai-blur)" />`,
    `<circle id="${prefix}-ai-ring-right-core" cx="772" cy="268" r="22" fill="${COLORS.blue}" fill-opacity="0.85" />`,
    `<rect id="${prefix}-face" x="318" y="168" width="364" height="300" rx="72" ry="72" fill="${COLORS.white}" />`,
    renderIcons(prefix, p.icons),
    renderEyes(prefix, eyes, p),
  );

  if (showBlush) {
    parts.push(
      `<circle id="${prefix}-blush-left" cx="${eyes.left.cx}" cy="${eyes.left.cy + eyeRy + 28}" r="14" fill="#E84855" fill-opacity="0.18" />`,
      `<circle id="${prefix}-blush-right" cx="${eyes.right.cx}" cy="${eyes.right.cy + eyeRy + 28}" r="14" fill="#E84855" fill-opacity="0.18" />`,
    );
  }

  parts.push(renderMouth(prefix, p));

  parts.push(`<g id="${prefix}-leaf">
    <path d="${LEAF_PATH}" fill="${COLORS.green}" />
    <path d="M 500 15 L 500 108" stroke="${COLORS.white}" stroke-width="3" stroke-linecap="round" opacity="0.85" />
    <path d="M 500 40 L 530 75" stroke="${COLORS.white}" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
    <path d="M 500 40 L 470 75" stroke="${COLORS.white}" stroke-width="2.5" stroke-linecap="round" opacity="0.7" />
  </g>`);

  parts.push(`</g>`);

  const rootClass = animate ? ` class="reloop-animate-root"` : "";
  const label = `RELOOP ${options.variant ?? options.pose ?? "idle"}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000" fill-rule="nonzero" role="img" aria-label="${label}">
  ${defsBlock(prefix)}
  <g id="${prefix}-root"${rootClass}>
    ${parts.join("\n    ")}
  </g>
</svg>`;
}
