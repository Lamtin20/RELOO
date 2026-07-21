/**
 * RELOO Admin Helpers
 * Tiện ích tra cứu trạng thái / nhãn dùng chung cho CMS + CRM Admin
 */

import {
  ORDER_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  RISK_LEVELS,
  KYC_LEVELS,
} from './constants';

export function getOrderStatusMeta(code) {
  return (
    Object.values(ORDER_STATUS).find((s) => s.code === code) || {
      code,
      label: code,
      color: '#6B7280',
    }
  );
}

export function getTicketStatusMeta(code) {
  const colors = {
    open: '#EF4444',
    in_progress: '#2563EB',
    resolved: '#22C55E',
    closed: '#6B7280',
  };
  const meta = Object.values(TICKET_STATUS).find((s) => s.code === code);
  return { ...meta, code, color: colors[code] || '#6B7280' };
}

export function getTicketPriorityMeta(code) {
  const colors = {
    low: '#6B7280',
    medium: '#F59E0B',
    high: '#EA580C',
    urgent: '#DC2626',
  };
  const meta = Object.values(TICKET_PRIORITY).find((p) => p.code === code);
  return { ...meta, code, color: colors[code] || '#6B7280' };
}

export function getRiskLevelMeta(code) {
  return (
    Object.values(RISK_LEVELS).find((r) => r.code === code) || {
      code,
      label: code,
      color: '#6B7280',
    }
  );
}

export function getKycMeta(code) {
  return KYC_LEVELS[code] || KYC_LEVELS.L1;
}

export function getLeadStatusMeta(code) {
  const map = {
    new: { label: 'Mới', color: '#2563EB' },
    contacted: { label: 'Đã liên hệ', color: '#F59E0B' },
    qualified: { label: 'Tiềm năng', color: '#8B5CF6' },
    won: { label: 'Thành công', color: '#22C55E' },
    lost: { label: 'Thất bại', color: '#6B7280' },
  };
  return map[code] || { label: code, color: '#6B7280' };
}

export const LEAD_PIPELINE = [
  { code: 'new', label: 'Mới' },
  { code: 'contacted', label: 'Đã liên hệ' },
  { code: 'qualified', label: 'Tiềm năng' },
  { code: 'won', label: 'Thành công' },
  { code: 'lost', label: 'Thất bại' },
];

export function hoursSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, diff / 3_600_000);
}

export function overdueBucket(hours) {
  if (hours <= 6) return '0-6h';
  if (hours <= 24) return '6-24h';
  return '>24h';
}
