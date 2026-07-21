import { TRUST_SCORE, KYC_LEVELS } from './constants';
import { calcTrustScore } from './utils';
import {
  DEPOSIT_PRIVILEGE_STATUS,
  isPremiumPrivilegeActive,
  resolveDepositRate,
} from './deposit-policy';

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function scoreLevel(pct) {
  if (pct >= 85) return { label: 'Xuất sắc', tone: 'green' };
  if (pct >= 70) return { label: 'Tốt', tone: 'blue' };
  if (pct >= 50) return { label: 'Khá', tone: 'amber' };
  return { label: 'Cần cải thiện', tone: 'red' };
}

function buildEkycInsight(user, pct) {
  const kyc = KYC_LEVELS[user.kycLevel] ?? KYC_LEVELS.L1;
  if (pct >= 90) return `${kyc.name} — danh tính đã xác thực đầy đủ.`;
  if (pct >= 60) return 'Đã xác thực cơ bản — hoàn tất CCCD & Face Match để tăng điểm.';
  return 'Chưa đủ eKYC — cần xác minh trước khi tạo giao dịch thuê (Rule R003).';
}

function buildHistoryInsight(user, pct) {
  const n = user.totalRentals ?? 0;
  if (pct >= 80) return `${n} đơn hoàn tất — lịch sử thuê ổn định, ít rủi ro.`;
  if (pct >= 50) return `${n} đơn — tiếp tục duy trì trả đồ đúng hạn để cải thiện.`;
  return 'Lịch sử còn mỏng — hoàn tất thêm đơn thuê để hệ thống đánh giá chính xác hơn.';
}

function buildFeedbackInsight(user, pct) {
  if (pct >= 85) return 'Đánh giá tích cực từ chủ đồ — uy tín cao trong cộng đồng.';
  if (pct >= 60) return 'Phản hồi tốt — duy trì giao tiếp và bảo quản tài sản cẩn thận.';
  return 'Cần cải thiện trải nghiệm thuê — tôn trọng quy trình Green Audit.';
}

function buildComplianceInsight(user, pct) {
  const v = user.defaultsScore ?? 0;
  if (v === 0) return 'Không có vi phạm hoặc trễ hạn — tuân thủ quy định RELOO.';
  if (pct >= 60) return `${v} sự cố ghi nhận — hạn chế trễ trả và tranh chấp.`;
  return 'Nhiều vi phạm — cọc và rà soát thủ công có thể tăng (Rule Engine).';
}

/**
 * Phân tích hành vi khách hàng — biểu đồ UI (không lộ công thức)
 */
export function analyzeTrustBehavior(user) {
  if (!user) return null;

  const totalScore = user.trustScore ?? calcTrustScore(user);
  const kycBase = TRUST_SCORE.kycScores[user.kycLevel] ?? TRUST_SCORE.kycScores.L1;
  const kycPct = Math.round((kycBase / TRUST_SCORE.kycScores.L3) * 100);
  const historyPct = clamp(user.historyScore ?? 0, 0, 100);
  const feedbackPct = clamp(user.feedbackScore ?? 0, 0, 100);
  const compliancePct = clamp(100 - (user.defaultsScore ?? 0) * 10, 0, 100);

  const dimensions = [
    {
      id: 'ekyc',
      label: 'Xác thực eKYC',
      shortLabel: 'eKYC',
      score: kycPct,
      ...scoreLevel(kycPct),
      insight: buildEkycInsight(user, kycPct),
      detail:
        'Mức độ hoàn thiện định danh: email, SĐT, CCCD gắn chip, OCR và Face Match. VERIFIED mới được đặt thuê.',
    },
    {
      id: 'history',
      label: 'Lịch sử thuê',
      shortLabel: 'Lịch sử',
      score: historyPct,
      ...scoreLevel(historyPct),
      insight: buildHistoryInsight(user, historyPct),
      detail:
        'Số đơn hoàn tất, tỷ lệ trả đúng hạn và mức độ ổn định qua các kỳ thuê. Chronicle ghi nhận bất biến.',
    },
    {
      id: 'feedback',
      label: 'Đánh giá tích cực',
      shortLabel: 'Đánh giá',
      score: feedbackPct,
      ...scoreLevel(feedbackPct),
      insight: buildFeedbackInsight(user, feedbackPct),
      detail: 'Điểm phản hồi từ chủ đồ sau mỗi đơn: giao tiếp, bảo quản tài sản và tuân thủ quy trình.',
    },
    {
      id: 'compliance',
      label: 'Tuân thủ & vi phạm',
      shortLabel: 'Tuân thủ',
      score: compliancePct,
      ...scoreLevel(compliancePct),
      insight: buildComplianceInsight(user, compliancePct),
      detail:
        'Trễ hạn trả, tranh chấp, hủy đơn bất thường và cảnh báo Fraud. Vi phạm làm giảm uy tín nhanh.',
    },
  ];

  const depositRate = resolveDepositRate(user, totalScore);
  const privilege = user.depositPrivilege;
  const isPremium = isPremiumPrivilegeActive(privilege);

  return {
    totalScore,
    dimensions,
    deposit: {
      rate: depositRate,
      ratePercent: Math.round(depositRate * 100),
      reductionPercent: Math.round((1 - depositRate) * 100),
      isPremium,
      privilegeStatus: privilege?.status ?? DEPOSIT_PRIVILEGE_STATUS.STANDARD,
      approvedUntil: privilege?.approvedUntil ?? null,
      maxStandardReduction: Math.round((1 - TRUST_SCORE.standardMinDepositRate) * 100),
    },
  };
}

export function getDepositLabel(analysis) {
  if (!analysis) return 'Theo đánh giá hệ thống';
  const { deposit } = analysis;
  if (deposit.rate === 0) return 'Miễn cọc (nhóm cao cấp đã duyệt)';
  if (deposit.reductionPercent === 0) return `Cọc ${deposit.ratePercent}% giá trị tài sản`;
  return `Cọc ${deposit.ratePercent}% · giảm ${deposit.reductionPercent}% so với mức chuẩn`;
}

export { DEPOSIT_PRIVILEGE_STATUS, resolveDepositRate, calcDepositForUser } from './deposit-policy';
