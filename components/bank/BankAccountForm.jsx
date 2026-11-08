"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { BankPicker } from "@/components/bank/BankPicker";
import { fetchBanks } from "@/lib/bank/client";
import { isValidAccountNumber, sanitizeAccountNumber } from "@/lib/bank/utils";

/**
 * @param {object} props
 * @param {object|null} props.initialAccount — tài khoản chính đang liên kết
 * @param {(payload: { bank: object, accountNumber: string }) => void} props.onSaved
 */
export function BankAccountForm({ initialAccount, onSaved }) {
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [banksError, setBanksError] = useState("");

  const [bank, setBank] = useState(
    initialAccount
      ? {
          code: initialAccount.bankCode,
          bin: initialAccount.bankBin,
          shortName: initialAccount.bankShortName,
          name: initialAccount.bankName,
          logo: initialAccount.bankLogo,
        }
      : null
  );
  const [accountNumber, setAccountNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchBanks()
      .then((data) => alive && setBanks(data))
      .catch((err) => alive && setBanksError(err.message || "Không tải được ngân hàng."))
      .finally(() => alive && setBanksLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  function handleBankChange(nextBank) {
    setBank(nextBank);
    setSaved(false);
    setSaveError("");
  }

  function handleAccountChange(raw) {
    setAccountNumber(sanitizeAccountNumber(raw));
    setSaved(false);
    setSaveError("");
  }

  function clearAccountNumber() {
    setAccountNumber("");
    setSaved(false);
    setSaveError("");
  }

  function handleSaveBank() {
    if (!bank) {
      setSaveError("Vui lòng chọn ngân hàng.");
      return;
    }
    if (!isValidAccountNumber(accountNumber)) {
      setSaveError("Số tài khoản không hợp lệ. Nhập số tài khoản, không nhập số thẻ.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      onSaved?.({ bank, accountNumber });
      setSaved(true);
    } catch (err) {
      setSaveError(err.message || "Không lưu được tài khoản ngân hàng.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = bank && isValidAccountNumber(accountNumber) && !saving;

  return (
    <div className="bank-account-form">
      {banksError && <div className="bank-account-form__alert">{banksError}</div>}

      <BankPicker
        banks={banks}
        value={bank}
        onChange={handleBankChange}
        disabled={banksLoading || saving}
      />

      <div className="input-group mt-4">
        <label className="input-label" htmlFor="bank-account-number">
          Số tài khoản
        </label>
        <div className="bank-account-form__account-wrap">
          <input
            id="bank-account-number"
            className="input"
            inputMode="text"
            autoComplete="off"
            placeholder="Nhập số tài khoản"
            value={accountNumber}
            onChange={(e) => handleAccountChange(e.target.value)}
            disabled={!bank || saving}
          />
          {accountNumber && (
            <button
              type="button"
              className="bank-account-form__clear"
              onClick={clearAccountNumber}
              aria-label="Xóa số tài khoản"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <span className="input-hint">Nhập số tài khoản, không nhập số thẻ</span>
      </div>

      {initialAccount && !accountNumber && (
        <div className="bank-account-form__current mt-4">
          <div className="text-sm">
            <strong>Tài khoản đang liên kết:</strong>{" "}
            {initialAccount.accountNumberMasked} · {initialAccount.bankShortName}
          </div>
        </div>
      )}

      {saveError && (
        <div className="bank-account-form__status bank-account-form__status--error mt-4" role="alert">
          {saveError}
        </div>
      )}

      {saved && (
        <div className="bank-account-form__status bank-account-form__status--success mt-4">
          <CheckCircle2 size={14} /> Đã lưu tài khoản ngân hàng
        </div>
      )}

      <div className="bank-account-form__actions mt-4">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={!canSave}
          onClick={handleSaveBank}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="spin" /> Đang lưu…
            </>
          ) : (
            "Lưu tài khoản ngân hàng"
          )}
        </button>
      </div>

      <span className="input-hint mt-2">
        Dùng để nhận tiền khi rút thu nhập từ tài khoản RELOO.
      </span>
    </div>
  );
}
