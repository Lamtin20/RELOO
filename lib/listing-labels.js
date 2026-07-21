/**
 * Nhãn tin đăng — dedupe & map variant hiển thị
 */

const PRIORITY_ALIASES = new Set(['tin ưu tiên', 'tin uu tien', 'priority']);

const VARIANT_MAP = {
  'tin ưu tiên': 'priority',
  'đã kiểm định': 'verified',
  verified: 'verified',
  'giá tốt': 'deal',
  'đã vệ sinh reloo-care': 'care',
  'smart tag': 'tag',
};

function normalizeLabel(text) {
  return String(text ?? '')
    .trim()
    .toLowerCase();
}

function variantForLabel(text) {
  return VARIANT_MAP[normalizeLabel(text)] ?? 'default';
}

/**
 * @param {object} listing
 * @returns {{ key: string, text: string, variant: string }[]}
 */
export function getListingDisplayLabels(listing) {
  if (!listing) return [];

  const items = [];
  const seen = new Set();

  const add = (text, variant, key) => {
    const norm = normalizeLabel(text);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    items.push({ key: key ?? text, text, variant: variant ?? variantForLabel(text) });
  };

  if (listing.isBoosted) {
    add('Tin ưu tiên', 'priority', 'boost-priority');
  }

  for (const label of listing.labels ?? []) {
    const norm = normalizeLabel(label);
    if (PRIORITY_ALIASES.has(norm) && listing.isBoosted) continue;
    add(label, variantForLabel(label), `label-${norm}`);
  }

  return items;
}
