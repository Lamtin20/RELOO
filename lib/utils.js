/**
 * RELOO Platform Utilities
 * Business logic: Trust Score, Pricing, Fees, Formatting
 */

import {
  TRUST_SCORE,
  RENTAL_DISCOUNTS,
  FEE_RATES,
  KYC_LEVELS,
  AD_PACKAGES,
} from './constants';
import { resolveDepositRate } from './deposit-policy';

/** Số điện thoại VN: đúng 10 số, bắt đầu bằng 0 */
export const PHONE_LENGTH = 10;
export const PHONE_ERROR = 'Số điện thoại phải có đúng 10 số và bắt đầu bằng 0.';

export function sanitizePhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, PHONE_LENGTH);
}

export function isValidPhone(phone) {
  return /^0\d{9}$/.test(String(phone ?? '').trim());
}

/**
 * Định dạng số tiền VNĐ
 * @param {number} amount
 * @returns {string}
 */
export function formatVND(amount) {
  if (amount == null || Number.isNaN(Number(amount))) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/**
 * Định dạng ngày tháng tiếng Việt
 * @param {string|Date} date
 * @param {Intl.DateTimeFormatOptions} [options]
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const defaults = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...options,
  };

  return new Intl.DateTimeFormat('vi-VN', defaults).format(d);
}

/**
 * Định dạng ngày giờ đầy đủ
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return formatDate(date, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Thời gian tham gia dạng "X năm Y tháng" */
export function formatMemberDuration(joinedAt) {
  if (!joinedAt) return 'Mới tham gia';
  const start = new Date(joinedAt);
  const now = new Date();
  let months =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return 'Dưới 1 tháng';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years <= 0) return `${rem} tháng`;
  if (rem <= 0) return `${years} năm`;
  return `${years} năm ${rem} tháng`;
}

/**
 * Thời gian đăng tin kiểu "3 giờ trước"
 */
export function formatTimeAgo(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return formatDate(d);
}

const CONDITION_LABELS = {
  like_new: '95% mới',
  good: 'Tốt',
  fair: 'Khá',
  used: 'Đã dùng',
};

export function formatCondition(code) {
  return CONDITION_LABELS[code] || 'Tốt';
}

/* ─── Location & distance ─────────────────────────────────── */

const HCMC_DISTRICTS = {
  'Quận 1': { lat: 10.7769, lng: 106.7009 },
  'Quận 3': { lat: 10.7864, lng: 106.6822 },
  'Quận 4': { lat: 10.7591, lng: 106.7043 },
  'Quận 5': { lat: 10.7541, lng: 106.6634 },
  'Quận 6': { lat: 10.7469, lng: 106.6353 },
  'Quận 7': { lat: 10.7376, lng: 106.7222 },
  'Quận 8': { lat: 10.7245, lng: 106.6288 },
  'Quận 10': { lat: 10.7729, lng: 106.6669 },
  'Quận 11': { lat: 10.7629, lng: 106.6432 },
  'Quận 12': { lat: 10.8672, lng: 106.6537 },
  'Quận Bình Thạnh': { lat: 10.8106, lng: 106.7091 },
  'Quận Tân Bình': { lat: 10.8014, lng: 106.6528 },
  'Quận Tân Phú': { lat: 10.7908, lng: 106.6280 },
  'Quận Phú Nhuận': { lat: 10.7994, lng: 106.6803 },
  'Quận Gò Vấp': { lat: 10.8384, lng: 106.6650 },
  'Quận Bình Tân': { lat: 10.7649, lng: 106.6091 },
  'TP. Thủ Đức': { lat: 10.8492, lng: 106.7716 },
  'Huyện Nhà Bè': { lat: 10.6957, lng: 106.7395 },
  'Huyện Bình Chánh': { lat: 10.6870, lng: 106.5942 },
};

const DEFAULT_DISTRICT = 'Quận 1';

/**
 * Trích xuất district từ chuỗi địa chỉ dạng "Vinhomes Grand Park, TP. Thủ Đức"
 */
export function extractDistrict(address) {
  if (!address) return DEFAULT_DISTRICT;
  const parts = address.split(',').map((s) => s.trim());
  for (const p of parts) {
    if (HCMC_DISTRICTS[p]) return p;
  }
  return DEFAULT_DISTRICT;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Khoảng cách km giữa 2 địa chỉ (rough - dựa trên district)
 */
export function distanceKm(from, to) {
  const a = HCMC_DISTRICTS[extractDistrict(from)];
  const b = HCMC_DISTRICTS[extractDistrict(to)];
  if (!a || !b) return null;
  const km = haversineKm(a, b);
  return Math.round(km * 10) / 10;
}

export function formatDistance(km) {
  if (km == null) return '';
  if (km < 1) return `${Math.max(1, Math.round(km * 1000))} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export const HCMC_DISTRICT_LIST = Object.keys(HCMC_DISTRICTS);

/**
 * Xếp hạng danh mục theo mức quan tâm: số tin, lượt xem, tin ưu tiên.
 * @param {Array} categories
 * @param {Array} listings
 * @returns {Array}
 */
export function rankCategories(categories, listings) {
  const stats = new Map();

  for (const cat of categories) {
    stats.set(cat.id, { listings: 0, views: 0, boosted: 0 });
  }

  for (const listing of listings) {
    if (listing.status !== 'available') continue;
    const bucket = stats.get(listing.category);
    if (!bucket) continue;
    bucket.listings += 1;
    bucket.views += listing.viewCount ?? 0;
    if (listing.isBoosted) bucket.boosted += 1;
  }

  return [...categories].sort((a, b) => {
    const sa = stats.get(a.id) ?? { listings: 0, views: 0, boosted: 0 };
    const sb = stats.get(b.id) ?? { listings: 0, views: 0, boosted: 0 };
    const scoreA = sa.listings * 100 + sa.views * 0.05 + sa.boosted * 80;
    const scoreB = sb.listings * 100 + sb.views * 0.05 + sb.boosted * 80;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return a.name.localeCompare(b.name, 'vi');
  });
}

/**
 * Gắn khoảng cách km vào listing (rough - dựa trên district)
 * @param {object} listing
 * @param {string} anchorAddress
 * @returns {number|null}
 */
export function listingDistanceKm(listing, anchorAddress, anchorCoords) {
  const listingCoords = listing?.locationDetails?.coords;
  if (anchorCoords?.lat != null && listingCoords?.lat != null) {
    const km = haversineKm(anchorCoords, listingCoords);
    return Math.round(km * 10) / 10;
  }
  return distanceKm(anchorAddress, listing?.location);
}

/**
 * Tính Trust Score theo công thức RELOO
 * TS = KYC_base + (history × 2) + (feedback × 1.2) - (defaults × 2)
 * Thang điểm 0-1000 — dùng nội bộ Rule Engine (không hiển thị công thức trên UI)
 *
 * @param {object} user - User object với kycLevel, historyScore, feedbackScore, defaultsScore
 * @returns {number} Trust score 0-1000
 */
export function calcTrustScore(user) {
  if (!user) return 0;

  const { kycScores, min, max } = TRUST_SCORE;
  const kycCode = user.kycLevel || 'L1';
  const kycBase = kycScores[kycCode] ?? kycScores.L1;

  const historyPoints = clamp(user.historyScore ?? 0, 0, 100) * 2;
  const feedbackPoints = clamp(user.feedbackScore ?? 0, 0, 100) * 1.2;
  const defaultsPenalty = clamp(user.defaultsScore ?? 0, 0, 100) * 2;

  const score = Math.round(kycBase + historyPoints + feedbackPoints - defaultsPenalty);
  return clamp(score, min, max);
}

/**
 * Tính tiền cọc — ưu tiên rule deposit privilege qua user
 * @param {number} trustScore
 * @param {number} assetValue
 * @param {{ user?: object }} [options]
 */
export function calcDeposit(trustScore, assetValue, options = {}) {
  if (!assetValue || assetValue <= 0) return 0;

  const rate = options.user
    ? resolveDepositRate(options.user, trustScore)
    : resolveDepositRate({ trustScore }, trustScore);

  return Math.round(assetValue * rate);
}

/**
 * Tính giá thuê theo số ngày với chiết khấu bậc thang
 * 1-3 ngày: 100% | 4-7 ngày: giảm 15% | >7 ngày: giảm 30%
 *
 * @param {number} dailyPrice
 * @param {number} days
 * @returns {{ subtotal: number, discount: number, total: number, discountRate: number, tier: string }}
 */
export function calcRentalPrice(dailyPrice, days) {
  if (!dailyPrice || !days || days < 1) {
    return { subtotal: 0, discount: 0, total: 0, discountRate: 0, tier: 'daily' };
  }

  const subtotal = dailyPrice * days;
  let multiplier = RENTAL_DISCOUNTS.daily.multiplier;
  let tier = 'daily';

  if (days >= RENTAL_DISCOUNTS.monthly.minDays) {
    multiplier = RENTAL_DISCOUNTS.monthly.multiplier;
    tier = 'monthly';
  } else if (days >= RENTAL_DISCOUNTS.weekly.minDays) {
    multiplier = RENTAL_DISCOUNTS.weekly.multiplier;
    tier = 'weekly';
  }

  const total = Math.round(subtotal * multiplier);
  const discount = subtotal - total;
  const discountRate = subtotal > 0 ? discount / subtotal : 0;

  return { subtotal, discount, total, discountRate, tier };
}

/**
 * Tính phí sàn RELOO (15% hoặc 12% Pro)
 * @param {number} rentalTotal
 * @param {number} [rate] — override rate (0–1)
 */
export function calcPlatformFee(rentalTotal, rate = FEE_RATES.platform) {
  return Math.round(rentalTotal * rate);
}

/**
 * Tỷ lệ phí sàn theo tài khoản chủ đồ
 * @param {object} [user]
 * @param {object} [settings]
 */
export function getPlatformFeeRate(user, settings) {
  if (user?.isPro) {
    return AD_PACKAGES.proStore.platformFeeDiscount ?? 0.12;
  }
  return settings?.platformFee ?? FEE_RATES.platform;
}

/**
 * Ước tính thu nhập chủ đồ sau phí sàn (khi khai báo tin)
 */
export function calcLenderEarningsPreview({ dailyPrice, days = 3, user, settings }) {
  const rental = calcRentalPrice(dailyPrice, days);
  const platformFeeRate = getPlatformFeeRate(user, settings);
  const platformFee = calcPlatformFee(rental.total, platformFeeRate);
  const lenderReceives = rental.total - platformFee;

  return {
    days,
    dailyPrice: Number(dailyPrice) || 0,
    rentalTotal: rental.total,
    platformFee,
    platformFeeRate,
    lenderReceives,
    discount: rental.discount,
  };
}

/**
 * Tính phí Gói An Tâm Reloo Care
 * @param {number} rentalTotal
 * @param {'basic'|'premium'} [plan='basic']
 * @returns {number}
 */
export function calcRelooCare(rentalTotal, plan = 'basic') {
  if (!plan || plan === 'none') return 0;
  const rate =
    plan === 'premium' ? FEE_RATES.relooCarePremium : FEE_RATES.relooCareBasic;
  return Math.round(rentalTotal * rate);
}

/**
 * Tính tổng thanh toán đơn hàng
 * @param {object} params
 * @returns {object}
 */
export function calcOrderTotal({
  dailyPrice,
  days,
  marketValue,
  trustScore,
  relooCarePlan = 'basic',
  shippingFee = 0,
  includeDeposit = true,
  lenderUser = null,
  renterUser = null,
  platformFeeRate,
}) {
  const rental = calcRentalPrice(dailyPrice, days);
  const rate = platformFeeRate ?? getPlatformFeeRate(lenderUser);
  const platformFee = calcPlatformFee(rental.total, rate);
  const relooCareFee = calcRelooCare(rental.total, relooCarePlan);
  const deposit = includeDeposit
    ? calcDeposit(trustScore, marketValue, { user: renterUser ?? undefined })
    : 0;
  const lenderPayout = rental.total - platformFee;

  const grandTotal = rental.total + relooCareFee + shippingFee + deposit;

  return {
    ...rental,
    platformFee,
    platformFeeRate: rate,
    relooCareFee,
    deposit,
    shippingFee,
    lenderPayout,
    grandTotal,
    relooCarePlan,
  };
}

/**
 * Rút gọn mã hash Blockchain để hiển thị UI
 * @param {string} hash
 * @param {number} [prefixLen=6]
 * @param {number} [suffixLen=4]
 * @returns {string}
 */
export function shortHash(hash, prefixLen = 6, suffixLen = 4) {
  if (!hash || typeof hash !== 'string') return '';
  if (hash.length <= prefixLen + suffixLen + 3) return hash;
  return `${hash.slice(0, prefixLen)}...${hash.slice(-suffixLen)}`;
}

let _orderCounter = 0;

/**
 * Sinh mã đơn hàng RELOO: RL-2026-XXXX
 * @returns {string}
 */
export function generateOrderId() {
  _orderCounter += 1;
  const seq = String(_orderCounter).padStart(4, '0');
  const year = new Date().getFullYear();
  return `RL-${year}-${seq}`;
}

let _nftCounter = 0;

/**
 * Sinh mã NFT Passport tài sản
 * @returns {string}
 */
export function generateNftId() {
  _nftCounter += 1;
  const seq = String(_nftCounter).padStart(5, '0');
  return `NFT-RELOO-${seq}`;
}

/**
 * Sinh hash SHA-256 giả lập (mock) cho Green Audit
 * @param {string} [seed]
 * @returns {string}
 */
export function generateMockHash(seed = '') {
  const base = `${seed}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let hash = 0;
  for (let i = 0; i < base.length; i += 1) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex.repeat(8).slice(0, 64)}`;
}

/**
 * Kiểm tra người dùng có đủ hạn mức thuê theo KYC không
 * @param {object} user
 * @param {number} assetValue
 * @returns {{ allowed: boolean, reason?: string }}
 */
export function checkRentalLimit(user, assetValue) {
  const kycCode = user?.kycLevel || 'L1';
  const kyc = KYC_LEVELS[kycCode];
  if (!kyc) return { allowed: false, reason: 'Cấp KYC không hợp lệ' };

  if (assetValue > kyc.maxRentalValue) {
    return {
      allowed: false,
      reason: `Cấp ${kyc.name} chỉ được thuê tài sản tối đa ${formatVND(kyc.maxRentalValue)}. Vui lòng nâng cấp KYC.`,
    };
  }

  return { allowed: true };
}

/**
 * Tính giá trị khấu hao còn lại (Residual Value)
 * @param {number} marketValue
 * @param {number} depreciationRate - Tỷ lệ khấu hao/năm (0-1)
 * @param {number} yearsUsed
 * @returns {number}
 */
export function calcResidualValue(marketValue, depreciationRate = 0.15, yearsUsed = 0) {
  const remaining = marketValue * Math.pow(1 - depreciationRate, yearsUsed);
  return Math.max(Math.round(remaining), Math.round(marketValue * 0.1));
}

/**
 * Tạo ID duy nhất
 * @param {string} [prefix='id']
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Clamp số trong khoảng
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Lấy label trạng thái đơn hàng
 * @param {string} statusCode
 * @param {object} orderStatusMap
 * @returns {string}
 */
export function getOrderStatusLabel(statusCode, orderStatusMap) {
  const entry = Object.values(orderStatusMap).find((s) => s.code === statusCode);
  return entry?.label ?? statusCode;
}

/**
 * Debounce helper cho search/filter
 * @param {Function} fn
 * @param {number} ms
 * @returns {Function}
 */
export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** ID thread chat hỏi hàng theo sản phẩm */
export function getInquiryThreadId(listingId, buyerId) {
  return `inquiry_${listingId}_${buyerId}`;
}

/** ID thread chat gắn đơn thuê */
export function getOrderThreadId(orderId) {
  return `order_${orderId}`;
}
