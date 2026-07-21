/** Database table names — map tới Supabase public schema */
export const DB_TABLES = {
  profiles: 'profiles',
  identityProfiles: 'identity_profiles',
  assets: 'assets',
  assetPassports: 'asset_passports',
  transactions: 'transactions',
  transactionTimelines: 'transaction_timelines',
  chronicle: 'chronicle',
  auditEvents: 'audit_events',
  behaviorLogs: 'behavior_logs',
  decisionLogs: 'decision_logs',
  cmsPages: 'cms_pages',
  platformSettings: 'platform_settings',
  chatThreads: 'chat_threads',
  chatMessages: 'chat_messages',
  notifications: 'notifications',
  crmLeads: 'crm_leads',
  supportTickets: 'support_tickets',
  ticketMessages: 'ticket_messages',
  riskAlerts: 'risk_alerts',
  faqItems: 'faq_items',
  listingReviews: 'listing_reviews',
  walletLedger: 'wallet_ledger',
  customerProfiles: 'customer_profiles',
  customerBankAccounts: 'customer_bank_accounts',
  customerAuditLogs: 'customer_audit_logs',
  sessionReplayEvents: 'session_replay_events',
};

export { checkSupabaseConnection } from './connection';
export { fetchMarketplaceBootstrap, fetchListingById, fetchProfileById } from './listings';
export {
  mapAssetRow,
  mapProfileRow,
  mapTransactionRow,
} from './map-from-db';
