import { generateId } from "@/lib/utils";
import { maskAccountNumber, accountNumberLast4, obfuscateAccountNumber, normalizePhone, normalizeEmail } from "@/lib/customer/privacy";

export const CUSTOMER_AUDIT_ACTIONS = {
  CUSTOMER_CREATED: "CUSTOMER_CREATED",
  CUSTOMER_UPDATED: "CUSTOMER_UPDATED",
  BANK_ACCOUNT_ADDED: "BANK_ACCOUNT_ADDED",
  BANK_ACCOUNT_CHANGED: "BANK_ACCOUNT_CHANGED",
  BANK_ACCOUNT_VERIFIED: "BANK_ACCOUNT_VERIFIED",
  BANK_ACCOUNT_VERIFICATION_FAILED: "BANK_ACCOUNT_VERIFICATION_FAILED",
  BANK_ACCOUNT_DISABLED: "BANK_ACCOUNT_DISABLED",
};

/**
 * @param {object} user
 */
export function buildCustomerFromUser(user) {
  if (!user) return null;
  const now = new Date().toISOString();
  return {
    customerId: user.id,
    userId: user.id,
    fullName: user.name ?? "",
    phone: normalizePhone(user.phone),
    email: normalizeEmail(user.email),
    dateOfBirth: user.dateOfBirth ?? null,
    gender: user.gender ?? null,
    address: {
      province: user.addressProvince ?? null,
      ward: user.addressWard ?? null,
      streetAddress: user.address ?? "",
    },
    status: "active",
    createdAt: user.joinedAt ?? now,
    updatedAt: now,
    createdBy: "system",
    updatedBy: "system",
  };
}

export function seedCustomersFromUsers(users) {
  return users.map((u) => buildCustomerFromUser(u)).filter(Boolean);
}

/**
 * Parse legacy "0123456789 - Vietcombank" seed string
 */
export function parseLegacyBankAccount(raw) {
  if (!raw || typeof raw !== "string") return null;
  const match = raw.match(/^([0-9A-Za-z-]+)\s*-\s*(.+)$/);
  if (!match) return null;
  return { accountNumber: match[1].trim(), bankShortName: match[2].trim() };
}

export function createAuditLog({
  customerId,
  action,
  changedFields = [],
  oldValueMasked = null,
  newValueMasked = null,
  actorType = "user",
  actorId = null,
  requestId = null,
}) {
  return {
    id: generateId("cal"),
    customerId,
    action,
    changedFields,
    oldValueMasked,
    newValueMasked,
    actorType,
    actorId,
    requestId: requestId ?? generateId("req"),
    ipAddress: null,
    userAgent: null,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Tạo bản ghi tài khoản ngân hàng (không tra cứu tên chủ TK)
 */
export function createBankAccountRecord({ customerId, bank, accountNumber, isPrimary = true }) {
  const now = new Date().toISOString();
  const last4 = accountNumberLast4(accountNumber);
  return {
    id: generateId("cba"),
    customerId,
    bankCode: bank.code,
    bankBin: String(bank.bin),
    bankShortName: bank.shortName,
    bankName: bank.name,
    bankLogo: bank.logo,
    accountNumberEncrypted: obfuscateAccountNumber(accountNumber),
    accountNumberLast4: last4,
    accountNumberMasked: maskAccountNumber(accountNumber),
    accountName: null,
    isVerified: false,
    verifiedAt: null,
    verificationProvider: null,
    isPrimary,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

/** @deprecated dùng createBankAccountRecord */
export function createVerifiedBankAccountRecord(args) {
  return createBankAccountRecord(args);
}

export function legacyBankAccountLabel(record) {
  if (!record) return null;
  return `${record.accountNumberMasked} · ${record.bankShortName}`;
}

export function syncUserBankSummary(user, primaryAccount) {
  if (!primaryAccount) {
    return { ...user, bankAccount: null, bankAccountVerified: false };
  }
  return {
    ...user,
    bankAccount: `${primaryAccount.accountNumberMasked} · ${primaryAccount.bankShortName}`,
    bankAccountVerified: true,
  };
}

export function applyBankAccountTransaction(state, { customerId, bankAccount, actorId, actorType = "user" }) {
  const customers = [...(state.customers ?? [])];
  const customerBankAccounts = [...(state.customerBankAccounts ?? [])];
  const customerAuditLogs = [...(state.customerAuditLogs ?? [])];

  const prevPrimary = customerBankAccounts.find(
    (a) => a.customerId === customerId && a.isPrimary && a.status === "active"
  );

  const deactivated = customerBankAccounts.map((a) => {
    if (a.customerId !== customerId || !a.isPrimary || a.status !== "active") return a;
    return {
      ...a,
      isPrimary: false,
      status: "inactive",
      updatedAt: new Date().toISOString(),
    };
  });

  const nextAccounts = [...deactivated, bankAccount];

  const customerIdx = customers.findIndex((c) => c.customerId === customerId);
  const now = new Date().toISOString();
  if (customerIdx >= 0) {
    customers[customerIdx] = { ...customers[customerIdx], updatedAt: now, updatedBy: actorId };
  }

  customerAuditLogs.unshift(
    createAuditLog({
      customerId,
      action: prevPrimary ? CUSTOMER_AUDIT_ACTIONS.BANK_ACCOUNT_CHANGED : CUSTOMER_AUDIT_ACTIONS.BANK_ACCOUNT_ADDED,
      changedFields: ["bankAccount"],
      oldValueMasked: prevPrimary
        ? `${prevPrimary.bankShortName} ${prevPrimary.accountNumberMasked}`
        : null,
      newValueMasked: `${bankAccount.bankShortName} ${bankAccount.accountNumberMasked}`,
      actorType,
      actorId,
    })
  );

  const updateUser = (u) => (u.id === customerId ? syncUserBankSummary(u, bankAccount) : u);

  return {
    ...state,
    customers,
    customerBankAccounts: nextAccounts,
    customerAuditLogs,
    users: state.users.map(updateUser),
    user: state.user?.id === customerId ? updateUser(state.user) : state.user,
  };
}

export function upsertCustomerProfile(state, { customerId, updates, actorId }) {
  const customers = [...(state.customers ?? [])];
  const customerAuditLogs = [...(state.customerAuditLogs ?? [])];
  const idx = customers.findIndex((c) => c.customerId === customerId);
  const now = new Date().toISOString();

  if (idx < 0) return state;

  const prev = customers[idx];
  customers[idx] = {
    ...prev,
    ...updates,
    address: updates.address ? { ...prev.address, ...updates.address } : prev.address,
    updatedAt: now,
    updatedBy: actorId,
  };

  customerAuditLogs.unshift(
    createAuditLog({
      customerId,
      action: CUSTOMER_AUDIT_ACTIONS.CUSTOMER_UPDATED,
      changedFields: Object.keys(updates),
      actorId,
    })
  );

  return { ...state, customers, customerAuditLogs };
}
