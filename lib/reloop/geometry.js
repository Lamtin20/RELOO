/** @source RELOOP OS 07_GEOMETRY_SYSTEM.md, 35_SVG_SPECIFICATION.md */
export const VIEWPORT = { width: 1000, height: 1000 };
export const HEAD = { cx: 500, cy: 260, r: 290 };
export const FACE = { cx: 500, cy: 260, rx: 235, ry: 235 };
export const EYES = { width: 68, height: 112, gap: 54 };
export const SMILE = { width: 64, height: 18 };
export const LEAF = { height: 170, width: 100, rotation: -12 };
export const LOOP_EAR = { radius: 150, stroke: 48 };

export const COLORS = {
  green: "#00C389",
  blue: "#0077FF",
  mint: "#6CCB87",
  dark: "#001B2A",
  white: "#F3F7F9",
  glowGreen: "#38FFB3",
};

export function eyeCenters() {
  const offset = EYES.width / 2 + EYES.gap / 2;
  const cy = FACE.cy;
  return {
    left: { cx: FACE.cx - offset, cy },
    right: { cx: FACE.cx + offset, cy },
  };
}
