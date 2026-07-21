/**
 * Rule definitions R001–R010
 */

import { RULE_PRIORITY } from './constants';

export const PLATFORM_RULES = [
  {
    id: 'R001',
    name: 'Bắt buộc CCCD + Face Match',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Người thuê phải hoàn thành CCCD và Face Match trước khi thuê.',
  },
  {
    id: 'R002',
    name: 'Một CCCD — một tài khoản ACTIVE',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Mỗi CCCD chỉ được gắn với một tài khoản đang hoạt động.',
  },
  {
    id: 'R003',
    name: 'Identity phải VERIFIED',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Không tạo giao dịch thuê nếu Identity Status != VERIFIED.',
  },
  {
    id: 'R004',
    name: 'Asset không bị khóa',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Không cho thuê tài sản đang bị khóa bởi Risk Ops.',
  },
  {
    id: 'R005',
    name: 'Asset không dispute',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Không cho thuê tài sản đang trong tranh chấp.',
  },
  {
    id: 'R006',
    name: 'User không dispute nghiêm trọng',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Người thuê có dispute/overdue nghiêm trọng bị chặn.',
  },
  {
    id: 'R007',
    name: 'Fraud Score trong ngưỡng',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Fraud Score vượt ngưỡng → từ chối thuê.',
  },
  {
    id: 'R008',
    name: 'Không sửa Audit Log',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Audit/Green Audit hash và chronicle audit không được sửa.',
  },
  {
    id: 'R009',
    name: 'Không xóa Chronicle',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Chronicle chỉ INSERT — cấm UPDATE/DELETE.',
  },
  {
    id: 'R010',
    name: 'AI Explainable Log',
    priority: RULE_PRIORITY.CRITICAL,
    description: 'Mọi prediction AI phải lưu explainable log trước khi Decision Engine tham chiếu.',
  },
];

export function getRuleById(ruleId) {
  return PLATFORM_RULES.find((r) => r.id === ruleId);
}
