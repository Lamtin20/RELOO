import { CATEGORIES } from "@/lib/constants";
import { SEARCH_SUGGEST_CATEGORIES } from "@/lib/search-history";
import { rankCategories } from "@/lib/utils";

const SURVEY_KEY = "reloo-interest-survey";
const MAX_CATEGORIES = 5;

export const SURVEY_INTENTS = [
  {
    id: "renter",
    label: "Tìm đồ để thuê",
    desc: "Máy ảnh, camping, thời trang, Mẹ & Bé…",
  },
  {
    id: "lender",
    label: "Cho thuê đồ của tôi",
    desc: "Biến đồ nhàn rỗi thành thu nhập cho thuê",
  },
  {
    id: "both",
    label: "Vừa thuê vừa cho thuê",
    desc: "Khám phá và kiếm thêm từ tài sản sẵn có",
  },
];

export const SURVEY_USE_CASES = [
  {
    id: "travel",
    label: "Du lịch & dã ngoại",
    categories: ["camping", "may-anh", "may-quay", "dien-tu"],
  },
  {
    id: "event",
    label: "Sự kiện & lễ hội",
    categories: ["ao-dai-cuoi", "thoi-trang", "tui-phu-kien", "trang-tri"],
  },
  {
    id: "work",
    label: "Công việc & học tập",
    categories: ["laptop-pc", "dien-tu", "dien-thoai", "may-quay"],
  },
  {
    id: "family",
    label: "Gia đình & Mẹ bé",
    categories: ["me-be", "do-choi", "gia-dung", "xe-dap"],
  },
  {
    id: "experience",
    label: "Trải nghiệm & thử nghiệm",
    categories: ["may-anh", "may-quay", "dien-tu", "xe-may"],
  },
  {
    id: "income",
    label: "Sinh lời từ đồ sẵn có",
    categories: ["may-anh", "camping", "laptop-pc", "gia-dung"],
  },
];

export const SURVEY_BUDGET_RANGES = [
  { id: "under-200k", label: "Dưới 200.000₫/ngày" },
  { id: "200k-500k", label: "200.000 – 500.000₫/ngày" },
  { id: "500k-1m", label: "500.000 – 1.000.000₫/ngày" },
  { id: "over-1m", label: "Trên 1.000.000₫/ngày" },
  { id: "flexible", label: "Tuỳ món, chưa rõ" },
];

function readSurvey() {
  if (typeof window === "undefined") return null;
  const scope=window.__relooInterestScope;if(!scope?.enabled||!scope.actor)return null;
  try {
    const raw = window.localStorage.getItem(`${SURVEY_KEY}:${scope.actor}:${scope.epoch}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeSurvey(data) {
  if (typeof window === "undefined") return;
  const scope=window.__relooInterestScope;if(scope?.enabled&&scope.actor)window.localStorage.setItem(`${SURVEY_KEY}:${scope.actor}:${scope.epoch}`, JSON.stringify(data));
}

export function getInterestSurvey() {
  return readSurvey();
}

export function isSurveyCompleted() {
  const data = readSurvey();
  return !!data?.completedAt && !data?.skipped;
}

export function saveInterestSurvey(partial) {
  const existing = readSurvey() ?? {};
  const next = {
    ...existing,
    ...partial,
    skipped: false,
    completedAt: new Date().toISOString(),
  };
  writeSurvey(next);
  return next;
}

export function skipInterestSurvey() {
  writeSurvey({
    skipped: true,
    skippedAt: new Date().toISOString(),
  });
}

export function getPreferredCategorySlugs() {
  if(typeof window==='undefined')return [];
  const scope=window.__relooInterestScope;return scope?.enabled?scope.categories||[]:[];
}

export function categoriesFromUseCases(useCaseIds = []) {
  const slugs = new Set();
  for (const id of useCaseIds) {
    const row = SURVEY_USE_CASES.find((u) => u.id === id);
    row?.categories?.forEach((slug) => slugs.add(slug));
  }
  return [...slugs].slice(0, MAX_CATEGORIES);
}

export function rankCategoriesWithPreferences(categories, listings, preferredSlugs = []) {
  const ranked = rankCategories(categories, listings);
  if (!preferredSlugs.length) return ranked;

  const prefSet = new Set(preferredSlugs);
  const preferred = preferredSlugs
    .map((slug) => ranked.find((c) => c.slug === slug))
    .filter(Boolean);
  const rest = ranked.filter((c) => !prefSet.has(c.slug));
  return [...preferred, ...rest];
}

export function sortListingsByPreferences(listings, preferredSlugs = [], secondarySort) {
  if (!preferredSlugs.length) {
    return secondarySort ? [...listings].sort(secondarySort) : listings;
  }
  const prefSet = new Set(preferredSlugs);
  return [...listings].sort((a, b) => {
    const aScore = prefSet.has(a.category) ? 1 : 0;
    const bScore = prefSet.has(b.category) ? 1 : 0;
    if (bScore !== aScore) return bScore - aScore;
    return secondarySort ? secondarySort(a, b) : 0;
  });
}

export function getSuggestedCategorySlugs(preferredSlugs = []) {
  if (preferredSlugs.length) return preferredSlugs.slice(0, 9);
  return SEARCH_SUGGEST_CATEGORIES;
}

export function getPersonalizedQuickSearches(preferredSlugs = [], limit = 5) {
  if (!preferredSlugs.length) {
    return ["Máy ảnh", "Lều camping", "Váy dạ hội", "Laptop", "Mẹ & Bé"].slice(0, limit);
  }
  return preferredSlugs
    .map((slug) => {
      const cat = CATEGORIES.find((c) => c.slug === slug);
      if (!cat) return null;
      return cat.name.split("&")[0].trim();
    })
    .filter(Boolean)
    .slice(0, limit);
}

export const SURVEY_MAX_CATEGORIES = MAX_CATEGORIES;
