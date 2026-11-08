"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { BankLogo } from "@/components/bank/BankLogo";
import { matchesBankQuery, sortBanks } from "@/lib/bank/utils";

export function BankPicker({ banks = [], value, onChange, disabled = false, id = "bank-picker" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const triggerId = `${id}-trigger`;
  const listboxId = `${id}-listbox`;

  const sorted = useMemo(() => sortBanks(banks), [banks]);

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    return sorted.filter((b) => matchesBankQuery(b, query));
  }, [sorted, query]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPicker(){setQuery('');setActiveIndex(0);setOpen(true);}


  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function selectBank(bank) {
    onChange?.(bank);
    setOpen(false);
  }

  function onTriggerKeyDown(e) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      openPicker();
    }
  }

  function onSearchKeyDown(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[activeIndex]) {
      e.preventDefault();
      selectBank(filtered[activeIndex]);
    }
  }

  return (
    <div className={`bank-picker ${open ? "bank-picker--open" : ""}`} ref={rootRef}>
      <label className="input-label" htmlFor={triggerId}>
        Ngân hàng
      </label>
      <button
        id={triggerId}
        type="button"
        className="bank-picker__trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => {if(!disabled){if(open)setOpen(false);else openPicker();}}}
        onKeyDown={onTriggerKeyDown}
      >
        {value ? (
          <span className="bank-picker__value">
            <BankLogo bank={value} size="md" />
            <span className="bank-picker__text">
              <strong>{value.shortName}</strong>
              <em>{value.name}</em>
            </span>
          </span>
        ) : (
          <span className="bank-picker__placeholder">Chọn ngân hàng</span>
        )}
        <ChevronDown size={16} className="bank-picker__chev" />
      </button>

      {open && (
        <>
          <div className="bank-picker__backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="bank-picker__panel" role="dialog" aria-label="Chọn ngân hàng">
            <div className="bank-picker__panel-head">
              <strong>Chọn ngân hàng</strong>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Đóng">
                <X size={18} />
              </button>
            </div>
            <div className="bank-picker__search">
              <Search size={16} />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
                placeholder="Tìm Vietcombank, BIDV, MBBank..."
                autoFocus
                aria-label="Tìm ngân hàng"
              />
            </div>
            <ul
              id={listboxId}
              className="bank-picker__list"
              role="listbox"
              ref={listRef}
              aria-activedescendant={filtered[activeIndex] ? `bank-opt-${filtered[activeIndex].code}` : undefined}
            >
              {filtered.length === 0 && (
                <li className="bank-picker__empty">Không tìm thấy ngân hàng phù hợp</li>
              )}
              {filtered.map((bank, index) => {
                const selected = value?.code === bank.code;
                const active = index === activeIndex;
                return (
                  <li key={bank.code} role="presentation">
                    <button
                      id={`bank-opt-${bank.code}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      data-index={index}
                      className={`bank-picker__option ${selected ? "is-selected" : ""} ${active ? "is-active" : ""}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectBank(bank)}
                    >
                      <BankLogo bank={bank} size="lg" />
                      <span className="bank-picker__text">
                        <strong>{bank.shortName}</strong>
                        <em>{bank.name}</em>
                      </span>
                      {selected && <Check size={16} className="bank-picker__check" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
