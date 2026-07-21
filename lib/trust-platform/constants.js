/**
 * RELOO Trust Platform — Constants & Enums
 * Enterprise Trust Platform (RULE FIRST, AI SECOND)
 */

export const RULE_PRIORITY = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export const IDENTITY_STATUS = {
  UNVERIFIED: 'UNVERIFIED',
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
};

/** Các bước bắt buộc trước VERIFIED */
export const IDENTITY_CHECKS = [
  'email',
  'phone',
  'cccd',
  'ocrCccd',
  'faceMatch',
];

export const CHRONICLE_TYPE = {
  USER: 'USER',
  ASSET: 'ASSET',
  TRANSACTION: 'TRANSACTION',
  BEHAVIOR: 'BEHAVIOR',
  AI: 'AI',
  DISPUTE: 'DISPUTE',
  RULE: 'RULE',
};

export const DECISION_OUTCOME = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  NEED_MORE_VERIFICATION: 'NEED_MORE_VERIFICATION',
  INCREASE_DEPOSIT: 'INCREASE_DEPOSIT',
  DECREASE_DEPOSIT: 'DECREASE_DEPOSIT',
  MANUAL_REVIEW: 'MANUAL_REVIEW',
};

export const FRAUD_THRESHOLD = 75;
export const RISK_THRESHOLD_BLOCK = 85;
export const TRUST_SCORE_RANGE = { min: 0, max: 1000 };
export const RISK_SCORE_RANGE = { min: 0, max: 100 };

export const BEHAVIOR_ACTIONS = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  REGISTER: 'Register',
  SEARCH: 'Search',
  FILTER: 'Filter',
  SORT: 'Sort',
  CLICK: 'Click',
  SCROLL: 'Scroll',
  MOUSE_MOVE: 'MouseMove',
  TOUCH: 'Touch',
  FOCUS: 'Focus',
  BLUR: 'Blur',
  TYPING: 'Typing',
  UPLOAD: 'Upload',
  DOWNLOAD: 'Download',
  PAYMENT: 'Payment',
  DEPOSIT: 'Deposit',
  CHAT: 'Chat',
  BOOK: 'Book',
  RETURN: 'Return',
  EXTEND: 'Extend',
  CANCEL: 'Cancel',
  REVIEW: 'Review',
  REPORT: 'Report',
  SHARE: 'Share',
  COPY: 'Copy',
  BOOKMARK: 'Bookmark',
  LIKE: 'Like',
  DISPUTE: 'Dispute',
  NAVIGATE: 'Navigate',
  PAGE_CHANGE: 'PageChange',
  POPUP: 'Popup',
};

export const REPLAY_EVENT_TYPE = {
  MOUSE: 'mouse',
  CLICK: 'click',
  SCROLL: 'scroll',
  INPUT: 'input',
  NAVIGATION: 'navigation',
  PAGE_CHANGE: 'page_change',
  POPUP: 'popup',
  FOCUS: 'focus',
  BLUR: 'blur',
};
