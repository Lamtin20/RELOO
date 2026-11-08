"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Landmark,
  LoaderCircle,
  Search,
} from "lucide-react";
import { fetchBanks } from "@/lib/bank/client";
import { normalizedHolderName } from "@/lib/profile/validation";
export function BankPicker({ value, onChange }) {
  const [banks, setBanks] = useState([]),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const root = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchBanks({ signal: controller.signal })
      .then(setBanks)
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const filtered = useMemo(
    () =>
      banks.filter((bank) =>
        normalizedHolderName(
          `${bank.name} ${bank.shortName} ${bank.code}`,
        ).includes(normalizedHolderName(query)),
      ),
    [banks, query],
  );
  return (
    <div
      className="bank-picker"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <button
        className="input bank-choice"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        disabled={loading}
      >
        {value?.logo ? (
          <img src={value.logo} alt="" width={40} height={28} />
        ) : loading ? (
          <LoaderCircle size={20} className="spin" />
        ) : (
          <Landmark size={20} />
        )}
        <span>{value?.shortName || value?.name || "Chọn ngân hàng"}</span>
        <ChevronDown size={18} />
      </button>
      {open && (
        <div className="bank-menu" role="dialog" aria-label="Chọn ngân hàng">
          <div className="bank-search">
            <Search size={18} />
            <input
              autoFocus
              aria-label="Tìm ngân hàng"
              placeholder="Tên hoặc mã ngân hàng"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="bank-options">
            {filtered.map((bank) => (
              <button
                type="button"
                key={bank.bin}
                onClick={() => {
                  onChange(bank);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <img src={bank.logo} alt="" width={40} height={28} />
                <span>
                  <strong>{bank.shortName || bank.code}</strong>
                  <small>{bank.name}</small>
                </span>
                {String(value?.bin) === String(bank.bin) && <Check size={17} />}
              </button>
            ))}
            {!filtered.length && <p>Không tìm thấy ngân hàng.</p>}
          </div>
        </div>
      )}
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
