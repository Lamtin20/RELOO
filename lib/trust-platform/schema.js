/**
 * Database schema definitions (Enterprise Trust Platform)
 * Target: PostgreSQL + BigQuery analytics + Redis cache + Chronicle store
 */

export const DATABASE_SCHEMA = {
  users: {
    description: 'Tài khoản người dùng',
    pk: 'id',
    fields: [
      'id', 'email', 'phone', 'name', 'role', 'status', 'trust_score',
      'created_at', 'updated_at', 'last_login_at',
    ],
  },
  identity_profiles: {
    description: 'Hồ sơ định danh eKYC',
    pk: 'id',
    fk: { user_id: 'users.id' },
    fields: [
      'id', 'user_id', 'status', 'email_verified', 'phone_verified',
      'cccd_hash', 'ocr_verified', 'face_match_verified', 'verified_at',
    ],
  },
  identity_documents: {
    description: 'Tài liệu CCCD, ảnh face match',
    pk: 'id',
    fk: { profile_id: 'identity_profiles.id' },
    fields: ['id', 'profile_id', 'doc_type', 'storage_url', 'hash_sha256', 'uploaded_at'],
  },
  assets: {
    description: 'Tài sản cho thuê (listings)',
    pk: 'id',
    fk: { owner_id: 'users.id' },
    fields: [
      'id', 'owner_id', 'title', 'category', 'market_value', 'daily_price',
      'status', 'is_locked', 'dispute_status', 'created_at',
    ],
  },
  asset_passports: {
    description: 'NFT Passport / Green Audit metadata',
    pk: 'id',
    fk: { asset_id: 'assets.id' },
    fields: ['id', 'asset_id', 'nft_token_id', 'chain_hash', 'audit_count', 'residual_value'],
  },
  transactions: {
    description: 'Đơn thuê / giao dịch',
    pk: 'id',
    fields: [
      'id', 'asset_id', 'renter_id', 'lender_id', 'status', 'deposit_amount',
      'decision_id', 'trust_score_snapshot', 'risk_score_snapshot', 'created_at',
    ],
  },
  transaction_timelines: {
    description: 'Mốc trạng thái đơn hàng',
    pk: 'id',
    fk: { transaction_id: 'transactions.id' },
    fields: ['id', 'transaction_id', 'status', 'note', 'recorded_at'],
  },
  chronicle: {
    description: 'Immutable event store — INSERT ONLY',
    pk: 'chronicle_id',
    fields: [
      'chronicle_id', 'type', 'entity_id', 'user_id', 'action', 'payload',
      'before_state', 'after_state', 'timestamp', 'rule_id', 'decision_id',
    ],
    constraints: ['NO UPDATE', 'NO DELETE'],
  },
  audit_events: {
    description: 'Green Audit events (hash immutable — R008)',
    pk: 'id',
    fk: { transaction_id: 'transactions.id' },
    fields: ['id', 'transaction_id', 'audit_type', 'hash_sha256', 'gps', 'recorded_at'],
    constraints: ['NO UPDATE after insert'],
  },
  behavior_logs: {
    description: 'Full user behavior trail',
    pk: 'log_id',
    fields: [
      'log_id', 'event_id', 'user_id', 'session_id', 'device_id', 'action',
      'module', 'screen', 'old_value', 'new_value', 'timestamp', 'ip', 'gps',
      'trust_score', 'risk_score', 'fraud_score', 'decision_id', 'rule_id',
    ],
  },
  rule_engine: {
    description: 'Active platform rules',
    pk: 'rule_id',
    fields: ['rule_id', 'name', 'priority', 'expression', 'active', 'version'],
  },
  rule_history: {
    description: 'Rule change audit trail',
    pk: 'id',
    fields: ['id', 'rule_id', 'changed_by', 'old_value', 'new_value', 'changed_at'],
  },
  trust_scores: {
    description: 'Trust score snapshots',
    pk: 'id',
    fk: { user_id: 'users.id' },
    fields: ['id', 'user_id', 'score', 'factors_json', 'computed_at'],
  },
  risk_scores: {
    description: 'Risk score snapshots',
    pk: 'id',
    fields: ['id', 'user_id', 'transaction_id', 'score', 'components_json', 'computed_at'],
  },
  fraud_scores: {
    description: 'Fraud score snapshots',
    pk: 'id',
    fields: ['id', 'user_id', 'score', 'signals_json', 'computed_at'],
  },
  deposit_rules: {
    description: 'Dynamic deposit policy config (not hard-coded tiers)',
    pk: 'id',
    fields: ['id', 'name', 'factor_weights_json', 'active', 'version'],
  },
  decision_logs: {
    description: 'Decision Engine outputs',
    pk: 'decision_id',
    fields: [
      'decision_id', 'outcome', 'user_id', 'entity_id', 'reasons_json',
      'trust_score', 'risk_score', 'fraud_score', 'final_deposit',
      'ai_explainable_log_json', 'created_at',
    ],
  },
  session_replays: {
    description: 'Session replay events',
    pk: 'replay_event_id',
    fields: ['replay_event_id', 'session_id', 'user_id', 'type', 'screen', 'payload', 'timestamp'],
  },
  feature_store: {
    description: 'ML feature vectors',
    pk: 'feature_id',
    fields: ['feature_id', 'user_id', 'asset_id', 'features_json', 'updated_at'],
  },
};

/** Event-driven architecture components (production target) */
export const ARCHITECTURE_COMPONENTS = {
  messageBus: ['Kafka', 'RabbitMQ'],
  cache: 'Redis',
  chronicleStore: 'PostgreSQL append-only partition / S3 immutable',
  featureStore: 'Redis + BigQuery',
  searchEngine: 'Elasticsearch / OpenSearch',
  analytics: 'BigQuery + Looker Studio',
  services: [
    'Rule Engine Service',
    'Trust Engine Service',
    'Risk Engine Service',
    'Fraud Engine Service',
    'Deposit Engine Service',
    'AI Inference Service (suggest-only)',
    'Decision Engine Service',
    'Chronicle Writer Service',
    'Behavior Ingestion Service',
    'Session Replay Service',
  ],
};
