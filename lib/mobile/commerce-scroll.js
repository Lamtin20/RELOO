export const INITIAL_SCROLL = {
  compact: false,
  hidden: false,
  account: false,
  y: 0,
  anchor: 0,
  direction: 0,
};
export function nextCommerceScroll(previous, y, path) {
  const market = path === "/" || path === "/explore",
    account = path === "/account";
  if (y <= 24) return { ...INITIAL_SCROLL, y, anchor: y };
  const delta = y - previous.y,
    direction = Math.sign(delta);
  const anchor =
    direction && direction !== previous.direction
      ? previous.y
      : previous.anchor;
  const moved = Math.abs(y - anchor) >= 14;
  return {
    compact: market && (y > 96 || (previous.compact && y > 24)),
    hidden: market && y > 96 && (moved ? direction > 0 : previous.hidden),
    account: account && y > 144,
    y,
    anchor: moved ? y : anchor,
    direction: direction || previous.direction,
  };
}
