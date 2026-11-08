export function paymentReference(content) {
  const matches =
    String(content || "")
      .toUpperCase()
      .match(/(?<![A-Z0-9])RELOO[A-F0-9]{32}(?![A-Z0-9])/g) || [];
  return matches.length === 1 ? matches[0] : null;
}
export function withdrawalReference(content) {
  const matches = [
    ...String(content || "")
      .toUpperCase()
      .matchAll(/(?<![A-Z0-9])RELOO[ -]*RUT[ -]*([A-F0-9]{32})(?![A-Z0-9])/g),
  ];
  return matches.length === 1 ? "RELOO-RUT-" + matches[0][1] : null;
}
