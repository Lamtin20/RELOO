/**
 * RELOOP Expression & Pose Registry — 100% master bible lock
 * @source master-character-bible.png + master-expression-sheet.png
 */
import { COLORS } from "./geometry.js";

/** @type {Record<string, object>} */
export const MASTER_EXPRESSIONS = {
  default: { eyeMode: "standard", mouthMode: "smile", blush: true },
  idle: { eyeMode: "standard", mouthMode: "smile", blush: true },

  happy: { eyeMode: "happy", mouthMode: "smile", smileScale: 1.2, blush: true },
  excited: { eyeMode: "star", mouthMode: "open", smileScale: 1.25, icons: ["sparkle"], headTilt: 3 },
  thinking: {
    eyeMode: "standard", mouthMode: "neutral", eyeDy: -10, headTilt: 8,
    armRightRaise: 55, armRightRotate: -50, glow: true, glowColor: COLORS.blue, glowOpacity: 0.1,
  },
  think: { aliasOf: "thinking" },
  wink: { eyeMode: "standard", winkSide: "right", mouthMode: "smile", smileScale: 1.1, blush: true },
  surprised: { eyeMode: "surprised", mouthMode: "o", icons: ["sweat"], headTilt: -2 },
  "thank-you": {
    eyeMode: "happy", mouthMode: "smile", smileScale: 1.05, eyesClosed: true,
    armLeftRotate: 35, armRightRotate: -35, armLeftRaise: 40, armRightRaise: 40, blush: true,
  },
  love: { eyeMode: "heart", mouthMode: "smile", prop: "heart", icons: ["hearts"], blush: true },
  sad: { eyeMode: "sad", mouthMode: "frown", icons: ["tear"], headTilt: -3 },
  angry: { eyeMode: "angry", mouthMode: "flat", icons: ["angry-mark"], hideBlush: true },
  scared: { eyeMode: "swirled", mouthMode: "o", icons: ["sweat"], headTilt: -4 },
  laughing: { eyeMode: "happy", mouthMode: "laugh", icons: ["tear"], smileScale: 1.3 },
  curious: { eyeMode: "standard", mouthMode: "neutral", eyeDyLeft: -6, eyeDyRight: 0, icons: ["question"], headTilt: 6 },
  listening: { eyeMode: "standard", mouthMode: "smile", icons: ["soundwave"], headTilt: 5, glow: true, glowColor: COLORS.blue, glowOpacity: 0.1 },
  focused: { eyeMode: "standard", mouthMode: "neutral", eyeRyScale: 0.85, eyeDy: 4, headTilt: 0 },
  determined: { eyeMode: "angry", mouthMode: "smile", smileScale: 0.85, headTilt: 2 },
  confused: { eyeMode: "swirled", mouthMode: "frown", icons: ["question"], headTilt: 8 },
  sleepy: { eyeMode: "slit", mouthMode: "smile", smileScale: 0.55, icons: ["zzz"] },
  sleep: { aliasOf: "sleepy" },

  celebrate: { eyeMode: "happy", mouthMode: "open", smileScale: 1.35, glow: true, glowColor: COLORS.mint, glowOpacity: 0.12, icons: ["sparkle"] },
  success: { eyeMode: "happy", mouthMode: "smile", smileScale: 1.25, glow: true, glowColor: COLORS.mint, glowOpacity: 0.12 },
  loading: { eyeMode: "slit", mouthMode: "neutral", glow: true, glowColor: COLORS.white, glowOpacity: 0.08 },
  scanning: { eyeMode: "standard", mouthMode: "neutral", icons: ["scan-hud"], glow: true, glowColor: COLORS.blue, glowOpacity: 0.12 },
  teaching: { eyeMode: "standard", mouthMode: "smile", headTilt: 4, armRightRotate: -70, armRightRaise: 50, prop: "pointer" },
  protect: { eyeMode: "standard", mouthMode: "neutral", glow: true, glowColor: COLORS.green, glowOpacity: 0.12, prop: "shield-blue", armLeftRotate: -35, armRightRotate: 35 },
  protecting: { aliasOf: "protect" },
  verification: { eyeMode: "standard", mouthMode: "neutral", prop: "verify-line", glow: true, glowColor: COLORS.blue, glowOpacity: 0.1 },
  verify: { aliasOf: "verification" },
  verifying: { aliasOf: "verification" },

  greeting: { eyeMode: "standard", mouthMode: "smile", armRightRotate: -65, armRightRaise: 75, headTilt: 4, smileScale: 1.05, blush: true },
  wave: { aliasOf: "greeting" },

  "green-audit": { eyeMode: "standard", mouthMode: "smile", prop: "shield", armLeftRotate: -40, armLeftRaise: 30 },
  "nft-passport": { eyeMode: "standard", mouthMode: "smile", prop: "nft", armRightRotate: -50, armRightRaise: 35 },
  "trust-score": { eyeMode: "star", mouthMode: "smile", prop: "trust-badge", translateY: -6, glow: true },
  "blockchain-verified": { eyeMode: "standard", mouthMode: "smile", prop: "blockchain", icons: ["scan-hud"], glow: true, glowColor: COLORS.blue },
  "user-guide": { eyeMode: "standard", mouthMode: "smile", prop: "book", armRightRotate: -55, armRightRaise: 35 },
  partnership: { aliasOf: "greeting" },
  "think-hard": { eyeMode: "standard", mouthMode: "neutral", icons: ["formula"], headTilt: 10, eyeDy: -8, glow: true, glowColor: COLORS.blue, glowOpacity: 0.08 },
};

/** @type {Record<string, object>} */
export const MASTER_POSES = {
  standing: {},
  walking: { headTilt: 3, armLeftRotate: -28, armRightRotate: 28, bodySkew: 2 },
  running: { headTilt: 5, armLeftRotate: -45, armRightRotate: 45, translateY: -8, prop: "speed" },
  floating: { translateY: -18, armLeftRotate: -18, armRightRotate: 18, glow: true, prop: "float-glow" },
  jumping: { translateY: -24, armLeftRotate: -55, armRightRotate: 55, headTilt: -4 },
  waving: { armRightRotate: -65, armRightRaise: 75, headTilt: 4, mouthMode: "smile" },
  pointing: { armRightRotate: -88, armRightRaise: 15, headTilt: 2 },
  presenting: { armLeftRotate: -35, armRightRotate: -35, armRightRaise: 40, headTilt: 2, mouthMode: "smile" },
  hovering: { translateY: -14, armLeftRotate: -20, armRightRotate: 20, prop: "float-glow", glow: true },
  "holding-phone": { armRightRotate: -55, armRightRaise: 40, prop: "phone" },
  "holding-nft": { armRightRotate: -50, armRightRaise: 35, prop: "nft" },
  "holding-shield": { armLeftRotate: -40, armLeftRaise: 30, prop: "shield" },
  scanning: { armRightRotate: -75, armRightRaise: 20, icons: ["scan-hud"], glow: true, glowColor: COLORS.blue },
  protecting: { armLeftRotate: -40, armLeftRaise: 25, prop: "shield-blue", glow: true, glowColor: COLORS.green },
  teaching: { armRightRotate: -70, armRightRaise: 50, prop: "pointer", headTilt: 4 },
  verifying: { prop: "verify-line", glow: true, glowColor: COLORS.blue },
  greeting: { armRightRotate: -65, armRightRaise: 75, headTilt: 4 },
};

function resolveEntry(map, key) {
  const entry = map[key];
  if (!entry) return null;
  if (entry.aliasOf) return { ...resolveEntry(map, entry.aliasOf), ...entry, aliasOf: undefined };
  return { ...entry };
}

export function resolveVariant(key) {
  return resolveEntry(MASTER_EXPRESSIONS, key) ?? resolveEntry(MASTER_POSES, key) ?? MASTER_EXPRESSIONS.idle;
}

export const EXPRESSION_IDS = Object.keys(MASTER_EXPRESSIONS).filter((k) => !MASTER_EXPRESSIONS[k].aliasOf);
export const POSE_IDS = Object.keys(MASTER_POSES);

/** UI state → locked expression (100% bible mapping) */
export const UI_EXPRESSION_MAP = {
  default: "idle",
  idle: "idle",
  welcome: "greeting",
  auth: "greeting",
  loading: "loading",
  success: "success",
  error: "sad",
  thinking: "thinking",
  verifying: "verification",
  kyc: "scanning",
  trust: "protect",
  celebrate: "celebrate",
  empty: "curious",
  audit: "green-audit",
  nft: "nft-passport",
  blockchain: "blockchain-verified",
  guide: "user-guide",
};

export function uiExpression(state) {
  const key = UI_EXPRESSION_MAP[state] ?? state;
  return EXPRESSION_IDS.includes(key) || POSE_IDS.includes(key) ? key : "idle";
}

// Back-compat exports for compile script
export const MASTER_VARIANTS = MASTER_EXPRESSIONS;
