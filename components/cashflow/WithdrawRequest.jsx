"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ArrowDownToLine, X, LoaderCircle, Landmark } from "lucide";
import {SmartKeyPanel} from "@/components/security/SmartKeyPanel";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { SOURCE_TITLES, formatMoney } from "@/lib/finance/wallet-display";
export function WithdrawRequest({ onSubmitted }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState(null),
    [source, setSource] = useState("RENTAL"),
    [bank, setBank] = useState(""),
    [amount, setAmount] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),[smart,setSmart]=useState(false);
  const key = useRef(""),
    panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const abort = new AbortController();
    fetch("/api/cashflow/withdrawals", { signal: abort.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        setBank(d.banks.find((b) => b.is_default)?.id || d.banks[0]?.id || "");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector("button")?.focus();
    const close = (e) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        const nodes = [
            ...panel.current.querySelectorAll(
              "button:not(:disabled),select,input,a[href]",
            ),
          ],
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", close);
    return () => {
      abort.abort();
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [open]);
  const available = data?.available.sources[source] || "0";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = JSON.parse(
        sessionStorage.getItem("reloo-payout-request") || "null",
      );
      if (
        saved?.source === source &&
        saved?.bank === bank &&
        saved?.amount === amount
      )
        key.current = saved.key;
      if (!key.current) key.current = crypto.randomUUID();
      sessionStorage.setItem(
        "reloo-payout-request",
        JSON.stringify({ source, bank, amount, key: key.current }),
      );
      const response = await fetch("/api/cashflow/withdrawals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source,
            bankId: bank,
            amount,
            requestKey: key.current,
          }),
        }),
        result = await response.json();
      if (!response.ok) {if(result.code==='SMART_KEY_REQUIRED')setSmart(true);throw new Error(result.error);}
      setNotice(
        "Đã gửi yêu cầu rút tiền. Bạn có thể theo dõi trong Lịch sử rút tiền.",
      );
      setOpen(false);
      setAmount("");
      key.current = "";
      sessionStorage.removeItem("reloo-payout-request");
      onSubmitted();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="cashflow-payout-action">
        <button
          className="btn btn-primary"
          onClick={() => {
            setError("");
            setNotice("");
            setData(null);
            setOpen(true);
          }}
        >
          <MorphIcon icon={ArrowDownToLine} size={19} /> Rút tiền
        </button>
        <p>Chọn nguồn đã được phép chi trả và ngân hàng nhận tiền.</p>
      </div>
      {notice && (
        <p className="cashflow-success" role="status">
          {notice}
        </p>
      )}
      {open && (
        <div className="wallet-detail-overlay">
          <section
            className="wallet-detail payout-dialog"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payout-title"
          >
            <header>
              <h2 id="payout-title">Rút tiền</h2>
              <button
                type="button"
                className="wallet-icon-button"
                aria-label="Đóng yêu cầu rút tiền"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                <MorphIcon icon={X} size={20} />
              </button>
            </header>
            <p className="wallet-detail-note">
              Khoản đang chờ xác nhận và tiền ký quỹ được theo dõi riêng. Yêu
              cầu sẽ được đối soát và duyệt trước khi chi trả.
            </p>
            {smart&&<SmartKeyPanel onVerified={()=>{setSmart(false);setError('Smart Key đã sẵn sàng. Xác nhận lại yêu cầu rút tiền.');}}/>}
      {error && (
              <p role="alert" className="ops-error">
                {error}
              </p>
            )}
            {!data ? (
              <p role="status">Đang tải nguồn tiền...</p>
            ) : (
              <form onSubmit={submit}>
                <label>
                  Nguồn tiền
                  <select
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value);
                      key.current = "";
                    }}
                  >
                    {["RENTAL", "DEPOSIT", "REFUND", "SHOPEE", "TIKTOK", "BANK"].map((code) => (
                      <option key={code} value={code}>
                        {SOURCE_TITLES[code]} ·{" "}
                        {formatMoney(data.available.sources[code])}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="payout-available">
                  <span>Được phép yêu cầu từ nguồn này</span>
                  <strong>{formatMoney(available)}</strong>
                </div>
                <label>
                  Ngân hàng nhận tiền
                  <select
                    value={bank}
                    onChange={(e) => {
                      setBank(e.target.value);
                      key.current = "";
                    }}
                    required
                  >
                    <option value="">Chọn ngân hàng</option>
                    {data.banks.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name} · {b.masked_account}
                      </option>
                    ))}
                  </select>
                </label>
                {!data.banks.length && (
                  <Link href="/dashboard/profile">
                    <MorphIcon icon={Landmark} size={16} /> Khai báo ngân hàng
                    nhận tiền
                  </Link>
                )}
                <label>
                  Số tiền yêu cầu (VND)
                  <input
                    required
                    inputMode="numeric"
                    value={amount}
                    maxLength={16}
                    onChange={(e) => {
                      setAmount(e.target.value.replace(/\D/g, ""));
                      key.current = "";
                    }}
                    placeholder="Nhập số tiền"
                  />
                </label>
                {!["VALID", "EXPIRING"].includes(data.identityStatus) && (
                  <p className="wallet-detail-note">
                    Cần căn cước đã được duyệt và còn hạn để gửi yêu cầu.
                  </p>
                )}
                {BigInt(available) === 0n && (
                  <p className="wallet-detail-note">
                    Nguồn này chưa có khoản được phép chi trả. Số tiền sẽ cập
                    nhật sau khi đối soát và phê duyệt.
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  disabled={
                    busy ||
                    !bank ||
                    !amount ||
                    BigInt(amount || "0") <= 0n ||
                    BigInt(amount || "0") > BigInt(available) ||
                    !["VALID", "EXPIRING"].includes(data.identityStatus)
                  }
                >
                  {busy ? (
                    <MorphIcon icon={LoaderCircle} size={18} className="spin" />
                  ) : (
                    <MorphIcon icon={ArrowDownToLine} size={18} />
                  )}{" "}
                  Gửi yêu cầu
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
