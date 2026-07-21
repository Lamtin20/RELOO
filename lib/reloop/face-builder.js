/**
 * RELOOP face renderer — eyes, mouth, floating icons
 * @source master-character-bible.png expression sheets
 */
import { COLORS, EYES } from "./geometry.js";

const HEART_PATH = (cx, cy, s = 1) =>
  `M ${cx} ${cy + 8 * s} C ${cx} ${cy - 4 * s}, ${cx + 14 * s} ${cy - 6 * s}, ${cx + 14 * s} ${cy + 4 * s} C ${cx + 14 * s} ${cy - 4 * s}, ${cx + 28 * s} ${cy - 2 * s}, ${cx + 28 * s} ${cy + 8 * s} C ${cx + 28 * s} ${cy + 24 * s}, ${cx + 14 * s} ${cy + 32 * s}, ${cx + 14 * s} ${cy + 32 * s} C ${cx + 14 * s} ${cy + 32 * s}, ${cx} ${cy + 24 * s}, ${cx} ${cy + 8 * s} Z`;

export function renderEye(prefix, cx, cy, rx, ry, mode = "standard", winkClosed = false) {
  if (winkClosed || mode === "closed" || mode === "happy") {
    const arch = mode === "sad" ? cy + 6 : cy + 8;
    const sweep = mode === "sad" ? cy + 22 : cy + 2;
    return `<path id="${prefix}" d="M ${cx - rx} ${arch} Q ${cx} ${sweep} ${cx + rx} ${arch}" stroke="${COLORS.dark}" stroke-width="6" fill="none" stroke-linecap="round" />`;
  }

  if (mode === "slit") {
    return `<line id="${prefix}" x1="${cx - rx}" y1="${cy}" x2="${cx + rx}" y2="${cy}" stroke="${COLORS.dark}" stroke-width="5" stroke-linecap="round" />`;
  }

  if (mode === "heart") {
    return `<path id="${prefix}" d="${HEART_PATH(cx - 14, cy - 14, 0.85)}" fill="#E84855" />`;
  }

  if (mode === "surprised") {
    const r = rx * 1.15;
    return `<g id="${prefix}">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${COLORS.dark}" />
      <circle cx="${cx - r * 0.2}" cy="${cy - r * 0.25}" r="${r * 0.22}" fill="${COLORS.white}" />
      <circle cx="${cx + r * 0.12}" cy="${cy - r * 0.15}" r="${r * 0.1}" fill="${COLORS.white}" />
    </g>`;
  }

  if (mode === "angry") {
    return `<g id="${prefix}">
      <ellipse cx="${cx}" cy="${cy + 4}" rx="${rx}" ry="${ry * 0.85}" fill="${COLORS.dark}" />
      <line x1="${cx - rx - 4}" y1="${cy - ry}" x2="${cx + rx * 0.3}" y2="${cy - ry + 8}" stroke="${COLORS.dark}" stroke-width="5" stroke-linecap="round" />
    </g>`;
  }

  if (mode === "sad") {
    return `<g id="${prefix}">
      <ellipse cx="${cx}" cy="${cy + 6}" rx="${rx}" ry="${ry * 0.9}" fill="${COLORS.dark}" />
      <circle cx="${cx - rx * 0.2}" cy="${cy + ry * 0.1}" r="${Math.max(4, rx * 0.12)}" fill="${COLORS.white}" />
    </g>`;
  }

  if (mode === "star") {
    return `<g id="${prefix}">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${COLORS.dark}" />
      <polygon points="${cx},${cy - ry * 0.5} ${cx + rx * 0.15},${cy - ry * 0.15} ${cx + rx * 0.45},${cy - ry * 0.15} ${cx + rx * 0.2},${cy + ry * 0.1} ${cx + rx * 0.3},${cy + ry * 0.45} ${cx},${cy + ry * 0.25} ${cx - rx * 0.3},${cy + ry * 0.45} ${cx - rx * 0.2},${cy + ry * 0.1} ${cx - rx * 0.45},${cy - ry * 0.15} ${cx - rx * 0.15},${cy - ry * 0.15}" fill="#FFD54F" />
    </g>`;
  }

  if (mode === "swirled") {
    return `<g id="${prefix}">
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${COLORS.dark}" />
      <path d="M ${cx} ${cy} Q ${cx + rx * 0.4} ${cy - ry * 0.3} ${cx} ${cy - ry * 0.5} Q ${cx - rx * 0.4} ${cy - ry * 0.2} ${cx} ${cy}" stroke="${COLORS.white}" stroke-width="3" fill="none" stroke-linecap="round" />
    </g>`;
  }

  return `<g id="${prefix}">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${COLORS.dark}" />
    <circle cx="${cx - rx * 0.25}" cy="${cy - ry * 0.35}" r="${Math.max(6, rx * 0.28)}" fill="${COLORS.white}" />
    <circle cx="${cx + rx * 0.15}" cy="${cy - ry * 0.2}" r="${Math.max(4, rx * 0.12)}" fill="${COLORS.white}" />
  </g>`;
}

export function renderEyes(prefix, eyes, config) {
  const rx = EYES.width / 2;
  const ry = (EYES.height / 2) * (config.eyeRyScale ?? 1);
  const dy = config.eyeDy ?? 0;
  const mode = config.eyeMode ?? "standard";
  const wink = config.winkSide;

  const leftMode = wink === "left" ? "closed" : mode;
  const rightMode = wink === "right" ? "closed" : mode;
  const leftDy = config.eyeDyLeft ?? dy;
  const rightDy = config.eyeDyRight ?? dy;

  return [
    renderEye(`${prefix}-eye-left`, eyes.left.cx, eyes.left.cy + leftDy, rx, ry, leftMode),
    renderEye(`${prefix}-eye-right`, eyes.right.cx, eyes.right.cy + rightDy, rx, ry, rightMode),
  ].join("\n    ");
}

export function renderMouth(prefix, config) {
  const mode = config.mouthMode ?? "smile";
  const scale = config.smileScale ?? 1;
  const rx = 34 * scale;
  const cy = 352;

  if (mode === "open" || mode === "laugh") {
    const ry = mode === "laugh" ? 22 : 16;
    return `<ellipse id="${prefix}-mouth" cx="500" cy="${cy + 6}" rx="${rx * 0.75}" ry="${ry}" fill="${COLORS.dark}" />`;
  }

  if (mode === "o") {
    return `<ellipse id="${prefix}-mouth" cx="500" cy="${cy + 4}" rx="${12 * scale}" ry="${14 * scale}" fill="${COLORS.dark}" />`;
  }

  if (mode === "neutral" || mode === "flat") {
    return `<line id="${prefix}-mouth" x1="${500 - rx * 0.6}" y1="${cy}" x2="${500 + rx * 0.6}" y2="${cy}" stroke="${COLORS.dark}" stroke-width="6" stroke-linecap="round" />`;
  }

  if (mode === "frown") {
    return `<path id="${prefix}-mouth" d="M ${500 - rx} ${cy + 8} Q 500 ${cy - 8} ${500 + rx} ${cy + 8}" stroke="${COLORS.dark}" stroke-width="8" fill="none" stroke-linecap="round" />`;
  }

  const ry = 10 * scale;
  return `<path id="${prefix}-mouth" d="M ${500 - rx} ${cy} Q 500 ${cy + ry} ${500 + rx} ${cy}" stroke="${COLORS.dark}" stroke-width="8" fill="none" stroke-linecap="round" />`;
}

export function renderIcons(prefix, icons = []) {
  const parts = [];
  for (const icon of icons) {
    switch (icon) {
      case "question":
        parts.push(`<text id="${prefix}-icon-question" x="640" y="175" font-size="42" font-weight="800" fill="${COLORS.blue}">?</text>`);
        break;
      case "sparkle":
        parts.push(
          `<g id="${prefix}-icon-sparkle" fill="#FFD54F">`,
          `<polygon points="680,120 685,135 700,135 688,145 692,160 680,150 668,160 672,145 660,135 675,135" />`,
          `<polygon points="710,155 713,163 721,163 715,168 717,176 710,171 703,176 705,168 699,163 707,163" opacity="0.8" />`,
          `</g>`,
        );
        break;
      case "sweat":
        parts.push(`<ellipse id="${prefix}-icon-sweat" cx="620" cy="210" rx="8" ry="12" fill="${COLORS.blue}" fill-opacity="0.75" />`);
        break;
      case "zzz":
        parts.push(`<text id="${prefix}-icon-zzz" x="660" y="130" font-size="22" font-weight="800" fill="${COLORS.blue}" opacity="0.85">Zzz</text>`);
        break;
      case "angry-mark":
        parts.push(
          `<g id="${prefix}-icon-angry" stroke="#E84855" stroke-width="4" fill="none">`,
          `<path d="M 560 130 L 575 115 M 575 130 L 560 115" />`,
          `<path d="M 590 125 L 600 110 M 600 125 L 590 110" />`,
          `</g>`,
        );
        break;
      case "hearts":
        parts.push(`<path id="${prefix}-icon-hearts" d="${HEART_PATH(650, 150, 0.6)}" fill="#E84855" opacity="0.85" />`);
        break;
      case "tear":
        parts.push(`<ellipse id="${prefix}-icon-tear" cx="455" cy="310" rx="6" ry="10" fill="${COLORS.blue}" fill-opacity="0.7" />`);
        break;
      case "formula":
        parts.push(`<text id="${prefix}-icon-formula" x="610" y="165" font-size="14" font-family="monospace" fill="${COLORS.blue}">E=mc²</text>`);
        break;
      case "soundwave":
        parts.push(
          `<g id="${prefix}-icon-soundwave" stroke="${COLORS.blue}" stroke-width="3" fill="none" opacity="0.7">`,
          `<path d="M 790 268 Q 820 250 850 268" />`,
          `<path d="M 800 268 Q 835 235 870 268" />`,
          `<path d="M 130 268 Q 100 250 70 268" />`,
          `<path d="M 120 268 Q 85 235 50 268" />`,
          `</g>`,
        );
        break;
      case "scan-hud":
        parts.push(
          `<g id="${prefix}-icon-scan-hud" opacity="0.45">`,
          `<rect x="340" y="200" width="320" height="220" rx="8" fill="none" stroke="${COLORS.blue}" stroke-width="2" stroke-dasharray="8 6" />`,
          `<line x1="340" y1="260" x2="660" y2="260" stroke="${COLORS.blue}" stroke-width="1.5" />`,
          `<line x1="340" y1="320" x2="660" y2="320" stroke="${COLORS.blue}" stroke-width="1.5" />`,
          `<line x1="420" y1="200" x2="420" y2="420" stroke="${COLORS.blue}" stroke-width="1.5" />`,
          `<line x1="580" y1="200" x2="580" y2="420" stroke="${COLORS.blue}" stroke-width="1.5" />`,
          `</g>`,
        );
        break;
      default:
        break;
    }
  }
  return parts.join("\n    ");
}

export function renderProp(prefix, prop) {
  switch (prop) {
    case "heart":
      return `<path id="${prefix}-prop-heart" d="M 620 720 C 620 690, 655 685, 655 715 C 655 685, 690 690, 690 720 C 690 755, 655 780, 655 780 C 655 780, 620 755, 620 720 Z" fill="#E84855" />`;
    case "phone":
      return `<rect id="${prefix}-prop-phone" x="640" y="690" width="48" height="78" rx="8" fill="${COLORS.dark}" />
      <rect id="${prefix}-prop-phone-screen" x="646" y="698" width="36" height="58" rx="4" fill="${COLORS.blue}" fill-opacity="0.6" />`;
    case "nft":
      return `<rect id="${prefix}-prop-nft" x="635" y="685" width="72" height="52" rx="6" fill="${COLORS.white}" stroke="${COLORS.blue}" stroke-width="3" />
      <text x="671" y="718" text-anchor="middle" font-size="14" font-weight="800" fill="${COLORS.blue}">NFT</text>`;
    case "shield":
      return `<path id="${prefix}-prop-shield" d="M 250 700 L 250 760 Q 280 790 310 760 L 310 700 Q 280 680 250 700 Z" fill="${COLORS.mint}" stroke="${COLORS.blue}" stroke-width="4" />
      <path d="M 268 735 L 278 748 L 298 722" stroke="${COLORS.white}" stroke-width="5" fill="none" stroke-linecap="round" />`;
    case "shield-blue":
      return `<path id="${prefix}-prop-shield-blue" d="M 235 690 L 235 770 Q 280 810 325 770 L 325 690 Q 280 660 235 690 Z" fill="${COLORS.blue}" fill-opacity="0.35" stroke="${COLORS.blue}" stroke-width="4" />
      <path d="M 265 735 L 280 752 L 305 718" stroke="${COLORS.white}" stroke-width="5" fill="none" stroke-linecap="round" />`;
    case "pointer":
      return `<rect id="${prefix}-prop-pointer" x="655" y="680" width="6" height="90" rx="3" fill="#FFD54F" transform="rotate(-25 658 725)" />
      <polygon points="652,670 664,670 658,655" fill="#FFD54F" transform="rotate(-25 658 662)" />`;
    case "book":
      return `<rect id="${prefix}-prop-book" x="630" y="700" width="56" height="72" rx="4" fill="${COLORS.blue}" fill-opacity="0.85" />
      <line x1="658" y1="708" x2="658" y2="764" stroke="${COLORS.white}" stroke-width="2" opacity="0.6" />`;
    case "trust-badge":
      return `<g id="${prefix}-prop-trust-badge">
        <rect x="600" y="640" width="88" height="44" rx="22" fill="${COLORS.blue}" fill-opacity="0.9" />
        <text x="644" y="670" text-anchor="middle" font-size="22" font-weight="800" fill="${COLORS.white}">98</text>
      </g>`;
    case "blockchain":
      return `<g id="${prefix}-prop-blockchain" fill="${COLORS.blue}" fill-opacity="0.55">
        <rect x="620" y="650" width="28" height="28" rx="4" transform="rotate(15 634 664)" />
        <rect x="655" y="630" width="24" height="24" rx="4" transform="rotate(-10 667 642)" />
        <rect x="680" y="660" width="22" height="22" rx="4" transform="rotate(20 691 671)" />
      </g>`;
    case "verify-line":
      return `<line id="${prefix}-prop-verify-line" x1="280" y1="680" x2="720" y2="680" stroke="${COLORS.blue}" stroke-width="4" stroke-opacity="0.75" />`;
    case "speed":
      return `<g id="${prefix}-prop-speed" stroke="${COLORS.blue}" stroke-width="4" stroke-linecap="round" opacity="0.6">
        <line x1="760" y1="720" x2="820" y2="720" /><line x1="770" y1="740" x2="850" y2="740" /><line x1="780" y1="760" x2="870" y2="760" />
      </g>`;
    case "float-glow":
      return `<ellipse id="${prefix}-prop-float-glow" cx="500" cy="960" rx="120" ry="18" fill="${COLORS.blue}" fill-opacity="0.35" filter="url(#${prefix}-ai-blur)" />`;
    default:
      return "";
  }
}
