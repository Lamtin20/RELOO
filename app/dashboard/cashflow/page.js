"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WithdrawRequest } from "@/components/cashflow/WithdrawRequest";
import {
  Wallet,
  Banknote,
  Landmark,
  ShieldCheck,
  ReceiptText,
  Gift,
  ShoppingBag,
  Video,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownToLine,
  ChevronRight,
  Clock3,
  CircleCheck,
  CircleX,
  Search,
  Copy,
  RefreshCw,
  RotateCcw,
  X,
  LoaderCircle,
  ExternalLink,
} from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import {
  SOURCE_LABELS,
  SOURCE_TITLES,
  STATUS_LABELS,
  formatMoney,
  walletDate,
} from "@/lib/finance/wallet-display";
const SOURCE_ICONS = {
  BANK: Landmark,
  RENTAL: Banknote,
  DEPOSIT: ShieldCheck,
  REFUND: RotateCcw,
  SHOPEE: ShoppingBag,
  TIKTOK: Video,
};
const SOURCE_TONES = {
  BANK: "blue",
  RENTAL: "green",
  DEPOSIT: "purple",
  REFUND: "blue",
  SHOPEE: "orange",
  TIKTOK: "ink",
};
const TRANSACTION_STATUSES = [
  "ALL",
  "RECONCILED",
  "PENDING",
  "APPROVED",
  "REJECTED",
];
const WITHDRAWAL_STATUSES = [
  "ALL",
  "REQUESTED",
  "APPROVED",
  "PROCESSING",
  "PAID",
  "REJECTED",
  "CANCELLED",
];
function statusText(status, tab) {
  return status === "ALL"
    ? "Tất cả trạng thái"
    : tab === "withdrawals" && status === "APPROVED"
      ? "Đã duyệt"
      : STATUS_LABELS[status] || status;
}
function StatusBadge({ status, tab }) {
  const icon = ["RECONCILED", "APPROVED", "PAID"].includes(status)
    ? CircleCheck
    : ["REJECTED", "CANCELLED"].includes(status)
      ? CircleX
      : Clock3;
  return (
    <span className={`wallet-status wallet-status--${status.toLowerCase()}`}>
      <MorphIcon icon={icon} size={13} />
      {statusText(status, tab)}
    </span>
  );
}
function SourceCard({ source, connected, onSelect }) {
  const cashback = ["SHOPEE", "TIKTOK"].includes(source.code),
    value = cashback ? source.confirmed : source.net;
  return (
    <article
      className={`wallet-source-card wallet-tone-${SOURCE_TONES[source.code]}`}
    >
      <button
        className="wallet-source-heading"
        type="button"
        onClick={() => onSelect(source.code)}
      >
        <span className="wallet-source-icon">
          <MorphIcon icon={SOURCE_ICONS[source.code]} size={25} />
        </span>
        <span>
          <strong>{SOURCE_TITLES[source.code]}</strong>
          <small>
            {cashback
              ? connected
                ? "Chương trình hoàn tiền"
                : "Chờ kết nối chương trình"
              : source.code === "RENTAL"
                ? "Khoản thu được phân loại từ giao dịch thuê"
                : "Khoản chuyển qua ngân hàng đã đối soát"}
          </small>
        </span>
        <MorphIcon icon={ChevronRight} size={19} />
      </button>
      <div className="wallet-source-amount">
        <span>{cashback ? "Tiền hoàn đã xác nhận" : "Số dư đối soát"}</span>
        <strong className={value.startsWith("-") ? "is-negative" : ""}>
          {formatMoney(value)}
        </strong>
      </div>
      <div className="wallet-source-metrics">
        <div>
          <span>{cashback ? "Đang chờ xác nhận" : "Tổng tiền vào"}</span>
          <strong>
            {formatMoney(cashback ? source.pending : source.incoming)}
          </strong>
        </div>
        <div>
          <span>{cashback ? "Đang chờ rút" : "Tổng tiền ra"}</span>
          <strong>
            {formatMoney(cashback ? source.withdrawalPending : source.outgoing)}
          </strong>
        </div>
      </div>
      <div className="wallet-source-footer">
        <span>
          <MorphIcon icon={ReceiptText} size={14} />
          {source.count} giao dịch ghi nhận
        </span>
        <button type="button" onClick={() => onSelect(source.code)}>
          Xem chi tiết <MorphIcon icon={ArrowUpRight} size={15} />
        </button>
      </div>
    </article>
  );
}
function TransactionDetail({ item, tab, onClose, onCancelled }) {
  const panel = useRef(null);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false),
    [cancelError, setCancelError] = useState("");
  async function cancelRequest() {
    setCancelling(true);
    setCancelError("");
    try {
      const response = await fetch("/api/cashflow/withdrawals", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onCancelled();
    } catch (error) {
      setCancelError(error.message);
    } finally {
      setCancelling(false);
    }
  }
  useEffect(() => {
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = [...panel.current.querySelectorAll("button,a[href]")],
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
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="wallet-detail-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={panel}
        className="wallet-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-detail-title"
      >
        <header>
          <h2 id="wallet-detail-title">
            {tab === "withdrawals"
              ? "Chi tiết yêu cầu rút"
              : "Chi tiết giao dịch"}
          </h2>
          <button
            type="button"
            className="wallet-icon-button"
            onClick={onClose}
            aria-label="Đóng chi tiết"
          >
            <MorphIcon icon={X} size={20} />
          </button>
        </header>
        <div
          className={`wallet-detail-symbol wallet-tone-${SOURCE_TONES[item.sourceCode]}`}
        >
          <MorphIcon icon={SOURCE_ICONS[item.sourceCode] || Wallet} size={30} />
        </div>
        <h3>
          {tab === "withdrawals"
            ? `Rút tiền ${SOURCE_LABELS[item.sourceCode]}`
            : item.title}
        </h3>
        <p className="wallet-detail-amount">{formatMoney(item.amount)}</p>
        <StatusBadge status={item.status} tab={tab} />
        <dl>
          <div>
            <dt>Nguồn tiền</dt>
            <dd>{SOURCE_TITLES[item.sourceCode]}</dd>
          </div>
          <div>
            <dt>
              {tab === "withdrawals" ? "Ngày yêu cầu" : "Thời gian giao dịch"}
            </dt>
            <dd>{walletDate(item.occurredAt || item.createdAt)}</dd>
          </div>
          <div>
            <dt>Mã tham chiếu</dt>
            <dd className="wallet-reference">
              {item.reference}
              <button
                type="button"
                className="wallet-icon-button"
                aria-label="Sao chép mã tham chiếu"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(item.reference);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <MorphIcon icon={copied ? CircleCheck : Copy} size={16} />
              </button>
            </dd>
          </div>
          {item.provider && (
            <div>
              <dt>Ghi nhận từ</dt>
              <dd>{item.provider}</dd>
            </div>
          )}
          {item.verifiedAt && (
            <div>
              <dt>Đối soát lúc</dt>
              <dd>{walletDate(item.verifiedAt)}</dd>
            </div>
          )}
          {item.maskedAccount && (
            <div>
              <dt>Tài khoản nhận</dt>
              <dd>
                {item.bankName} · {item.maskedAccount}
              </dd>
            </div>
          )}
        </dl>
        <p className="wallet-detail-note">
          {tab === "withdrawals"
            ? item.reason ||
              "Trạng thái chỉ chuyển sang đã chuyển khi có giao dịch chi tiền đã được đối soát."
            : item.affectsBankBalance
              ? "Giao dịch này đã được cộng hoặc trừ trong số dư đối soát ngân hàng."
              : "Đây là tiền hoàn từ chương trình đối tác. Khoản chờ xác nhận chưa được cộng vào số dư đã xác nhận."}
        </p>
        {copied && (
          <p role="status" className="wallet-copied">
            Đã sao chép mã tham chiếu.
          </p>
        )}
        {cancelError && (
          <p className="ops-error" role="alert">
            {cancelError}
          </p>
        )}
        {tab === "withdrawals" && item.status === "REQUESTED" && (
          <button
            className="btn btn-secondary"
            style={{ marginTop: 16 }}
            disabled={cancelling}
            onClick={cancelRequest}
          >
            {cancelling ? "Đang hủy..." : "Hủy yêu cầu đang chờ duyệt"}
          </button>
        )}
      </section>
    </div>
  );
}
export default function Cashflow() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [tab, setTab] = useState("transactions"),
    [source, setSource] = useState("ALL"),
    [status, setStatus] = useState("ALL"),
    [direction, setDirection] = useState("ALL"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [detail, setDetail] = useState(null),
    [copied, setCopied] = useState("");
  const history = useRef(null),
    generation = useRef(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        new URLSearchParams(window.location.search).get("tab") === "withdrawals"
      )
        setTab("withdrawals");
    }, 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const abort = new AbortController(),
      run = ++generation.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          tab,
          source,
          status,
          direction,
          page: String(page),
          q: query,
        });
        const response = await fetch("/api/cashflow?" + params, {
            signal: abort.signal,
          }),
          result = await response.json();
        if (!response.ok)
          throw new Error(result.error || "Chưa tải được dòng tiền.");
        if (run === generation.current) setData(result);
      } catch (e) {
        if (e.name !== "AbortError" && run === generation.current)
          setError(e.message);
      } finally {
        if (run === generation.current) setLoading(false);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [tab, source, status, direction, page, query, refresh]);
  const closeDetail = useCallback(() => setDetail(null), []);
  function chooseSource(code) {
    setSource(code);
    setStatus("ALL");
    setTab("transactions");
    setDirection("ALL");
    setPage(1);
    history.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  function chooseTab(next) {
    setTab(next);
    setStatus("ALL");
    setPage(1);
    setDetail(null);
  }
  function scrollHistory() {
    history.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  const available = data?.summary.available,
    deposit = data?.deposit,
    hasDeposit = deposit?.enabled || deposit?.count > 0;
  return (
    <div className="dashboard-page wallet-page">
      <header className="wallet-page-heading">
        <div>
          <span className="wallet-eyebrow">TÀI CHÍNH CỦA BẠN</span>
          <h1>Thu nhập & thanh toán</h1>
          <p>Theo dõi nguồn tiền và từng trạng thái giao dịch.</p>
        </div>
        <button
          type="button"
          className="wallet-refresh"
          aria-label="Làm mới dòng tiền"
          onClick={() => setRefresh((v) => v + 1)}
          disabled={loading}
        >
          <MorphIcon
            icon={loading ? LoaderCircle : RefreshCw}
            size={17}
            className={loading ? "spin" : ""}
          />
          <span>Làm mới</span>
        </button>
      </header>
      {error && (
        <div className="wallet-error" role="alert">
          <p>{error}</p>
          <button
            className="btn btn-secondary"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Thử lại
          </button>
        </div>
      )}
      {!data && loading && (
        <div className="wallet-loading" role="status">
          <MorphIcon icon={LoaderCircle} size={26} className="spin" /> Đang tải
          thông tin dòng tiền...
        </div>
      )}
      {data && (
        <>
          <section className="wallet-overview" aria-label="Tổng quan dòng tiền">
            <article className="wallet-balance-card">
              <div className="wallet-balance-top">
                <span>
                  <MorphIcon icon={Wallet} size={20} /> Số dư đối soát ngân hàng
                </span>
                <span className="wallet-secure-chip">
                  <MorphIcon
                    icon={data.summary.bankCount ? CircleCheck : Clock3}
                    size={13}
                  />
                  {data.summary.bankCount ? "Đã đối soát" : "Chưa có giao dịch"}
                </span>
              </div>
              <strong className="wallet-main-balance">
                {formatMoney(data.summary.net)}
              </strong>
              <p>
                {data.summary.bankCount
                  ? "Tiền đã khớp giao dịch ngân hàng của bạn tại RELOO."
                  : "Giao dịch ngân hàng sẽ xuất hiện khi đã được đối soát."}
              </p>
              <div className="wallet-bank-totals">
                <div>
                  <span>
                    <MorphIcon icon={ArrowDownLeft} size={17} /> Tiền vào
                  </span>
                  <strong>{formatMoney(data.summary.incoming)}</strong>
                </div>
                <div>
                  <span>
                    <MorphIcon icon={ArrowUpRight} size={17} /> Tiền ra
                  </span>
                  <strong>{formatMoney(data.summary.outgoing)}</strong>
                </div>
              </div>
            </article>
            <div className="wallet-overview-side">
              <article className="wallet-availability">
                <span className="wallet-mini-icon">
                  <MorphIcon icon={ArrowDownToLine} size={22} />
                </span>
                <div>
                  <span>Khả dụng để rút</span>
                  <strong>
                    {available === null
                      ? "Chưa mở chi trả"
                      : formatMoney(available)}
                  </strong>
                  <p>
                    Khoản được phê duyệt chi trả có thể gửi yêu cầu rút về ngân
                    hàng.
                  </p>
                </div>
              </article>
              <article className="wallet-held">
                <span className="wallet-mini-icon">
                  <MorphIcon icon={ShieldCheck} size={23} />
                </span>
                <div>
                  <span>Tiền ký quỹ ghi nhận</span>
                  <strong>
                    {hasDeposit
                      ? formatMoney(deposit.recorded)
                      : "Chưa kích hoạt"}
                  </strong>
                  <p>
                    {hasDeposit
                      ? "Theo chương trình và giao dịch đã đối soát."
                      : "Chương trình ký quỹ hiện chưa áp dụng."}
                  </p>
                </div>
              </article>
            </div>
          </section>
          <WithdrawRequest
            onSubmitted={() => {
              setRefresh((v) => v + 1);
              chooseTab("withdrawals");
            }}
          />
          <nav className="wallet-quick-actions" aria-label="Tiện ích dòng tiền">
            <button
              onClick={() => {
                chooseTab("transactions");
                scrollHistory();
              }}
            >
              <MorphIcon icon={ReceiptText} size={20} />
              <span>Lịch sử giao dịch</span>
              <MorphIcon icon={ChevronRight} size={16} />
            </button>
            <button
              onClick={() => {
                chooseTab("withdrawals");
                scrollHistory();
              }}
            >
              <MorphIcon icon={ArrowDownToLine} size={20} />
              <span>Lịch sử rút tiền</span>
              <MorphIcon icon={ChevronRight} size={16} />
            </button>
            <Link href="/dashboard/profile">
              <MorphIcon icon={Landmark} size={20} />
              <span>Ngân hàng nhận tiền</span>
              <MorphIcon icon={ChevronRight} size={16} />
            </Link>
          </nav>
          <section
            className="wallet-sources"
            aria-labelledby="wallet-sources-title"
          >
            <div className="wallet-section-title">
              <div>
                <h2 id="wallet-sources-title">Tiền của bạn, theo từng nguồn</h2>
                <p>Chọn một nguồn để xem những giao dịch liên quan.</p>
              </div>
              <span className="wallet-section-icon">
                <MorphIcon icon={Gift} size={23} />
              </span>
            </div>
            <div className="wallet-source-grid">
              {["RENTAL", "REFUND", "SHOPEE", "TIKTOK", "BANK"]
                .filter((code) => data.sources.some((s) => s.code === code))
                .map((code) => (
                  <SourceCard
                    key={code}
                    source={data.sources.find((item) => item.code === code)}
                    connected={data.affiliate[code.toLowerCase()]}
                    onSelect={chooseSource}
                  />
                ))}
            </div>
          </section>
          <section
            className="wallet-deposit-panel"
            aria-label="Chương trình ký quỹ"
          >
            <div className="wallet-deposit-heading">
              <span className="wallet-deposit-symbol">
                <MorphIcon icon={ShieldCheck} size={26} />
              </span>
              <div>
                <h2>Ký quỹ cho giao dịch thuê</h2>
                <p>
                  {deposit.programLabel ||
                    "Theo dõi khoản ký quỹ được ghi nhận cho từng giao dịch."}
                </p>
              </div>
              <span
                className={`wallet-program-pill ${hasDeposit ? "is-active" : ""}`}
              >
                {deposit.enabled
                  ? "Đang áp dụng"
                  : deposit.count > 0
                    ? "Có lịch sử"
                    : "Chưa áp dụng"}
              </span>
            </div>
            <div className="wallet-deposit-bottom">
              <p>
                {hasDeposit
                  ? `Đã ghi nhận ${deposit.count} giao dịch · ${formatMoney(deposit.recorded)}`
                  : "Khi chương trình được kích hoạt, khoản ký quỹ đã đối soát sẽ được hiển thị tại đây."}
              </p>
              <button type="button" onClick={() => chooseSource("DEPOSIT")}>
                Xem giao dịch ký quỹ <MorphIcon icon={ChevronRight} size={15} />
              </button>
            </div>
          </section>
          <section
            className="wallet-history"
            ref={history}
            aria-labelledby="wallet-history-title"
          >
            <div className="wallet-section-title">
              <div>
                <h2 id="wallet-history-title">Lịch sử & trạng thái</h2>
                <p>Mỗi khoản tiền có nguồn và mã tham chiếu riêng.</p>
              </div>
              <span className="wallet-history-count">{data.total} bản ghi</span>
            </div>
            <div
              className="wallet-history-tabs"
              role="tablist"
              aria-label="Loại lịch sử"
              onKeyDown={(event) => {
                if (
                  !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                    event.key,
                  )
                )
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "transactions"
                    : event.key === "End"
                      ? "withdrawals"
                      : tab === "transactions"
                        ? "withdrawals"
                        : "transactions";
                chooseTab(next);
                document.getElementById(`wallet-${next}-tab`)?.focus();
              }}
            >
              <button
                type="button"
                role="tab"
                id="wallet-transactions-tab"
                aria-selected={tab === "transactions"}
                tabIndex={tab === "transactions" ? 0 : -1}
                aria-controls="wallet-history-panel"
                onClick={() => chooseTab("transactions")}
              >
                <MorphIcon icon={ReceiptText} size={18} /> Giao dịch
              </button>
              <button
                type="button"
                role="tab"
                id="wallet-withdrawals-tab"
                aria-selected={tab === "withdrawals"}
                tabIndex={tab === "withdrawals" ? 0 : -1}
                aria-controls="wallet-history-panel"
                onClick={() => chooseTab("withdrawals")}
              >
                <MorphIcon icon={ArrowDownToLine} size={18} /> Rút tiền
              </button>
            </div>
            <div className="wallet-filters">
              <label>
                <span>Nguồn tiền</span>
                <select
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setPage(1);
                  }}
                >
                  {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Trạng thái</span>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  {(tab === "withdrawals"
                    ? WITHDRAWAL_STATUSES
                    : TRANSACTION_STATUSES
                  ).map((key) => (
                    <option key={key} value={key}>
                      {statusText(key, tab)}
                    </option>
                  ))}
                </select>
              </label>
              {tab === "transactions" && (
                <label>
                  <span>Chiều giao dịch</span>
                  <select
                    value={direction}
                    onChange={(e) => {
                      setDirection(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="ALL">Tiền vào & tiền ra</option>
                    <option value="IN">Tiền vào</option>
                    <option value="OUT">Tiền ra</option>
                  </select>
                </label>
              )}
              <label className="wallet-search">
                <span>Tìm giao dịch</span>
                <div>
                  <MorphIcon icon={Search} size={17} />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Mã giao dịch, nội dung..."
                  />
                </div>
              </label>
            </div>
            <div
              id="wallet-history-panel"
              role="tabpanel"
              aria-labelledby={
                tab === "transactions"
                  ? "wallet-transactions-tab"
                  : "wallet-withdrawals-tab"
              }
              aria-busy={loading}
            >
              {loading ? (
                <div className="wallet-history-loading" role="status">
                  <MorphIcon icon={LoaderCircle} size={23} className="spin" />{" "}
                  Đang tải giao dịch...
                </div>
              ) : data.rows.length ? (
                <div className="wallet-transactions">
                  {data.rows.map((item) => (
                    <button
                      key={item.id}
                      className="wallet-transaction"
                      type="button"
                      onClick={() => setDetail(item)}
                    >
                      <span
                        className={`wallet-transaction-icon wallet-tone-${SOURCE_TONES[item.sourceCode]}`}
                      >
                        <MorphIcon
                          icon={
                            tab === "withdrawals"
                              ? ArrowDownToLine
                              : item.sourceCode === "SHOPEE"
                                ? ShoppingBag
                                : item.sourceCode === "TIKTOK"
                                  ? Video
                                  : item.direction === "IN"
                                    ? ArrowDownLeft
                                    : ArrowUpRight
                          }
                          size={21}
                        />
                      </span>
                      <span className="wallet-transaction-main">
                        <strong>
                          {tab === "withdrawals"
                            ? `Rút tiền ${SOURCE_LABELS[item.sourceCode]}`
                            : item.title}
                        </strong>
                        <small>
                          {walletDate(item.occurredAt || item.createdAt)}
                        </small>
                        <span className="wallet-transaction-reference">
                          {item.reference}
                        </span>
                      </span>
                      <span className="wallet-transaction-value">
                        <strong
                          className={
                            tab === "withdrawals"
                              ? "is-withdrawal"
                              : item.status === "PENDING"
                                ? "is-pending"
                                : item.status === "REJECTED"
                                  ? "is-rejected"
                                  : item.direction === "OUT"
                                    ? "is-out"
                                    : "is-in"
                          }
                        >
                          {tab === "withdrawals" ||
                          !["RECONCILED", "APPROVED"].includes(item.status)
                            ? ""
                            : item.direction === "IN"
                              ? "+"
                              : "−"}
                          {formatMoney(item.amount)}
                        </strong>
                        <StatusBadge status={item.status} tab={tab} />
                      </span>
                      <MorphIcon icon={ChevronRight} size={17} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="wallet-empty">
                  <span>
                    <MorphIcon
                      icon={tab === "withdrawals" ? Landmark : ReceiptText}
                      size={34}
                    />
                  </span>
                  <h3>
                    {tab === "withdrawals"
                      ? "Chưa có yêu cầu rút tiền"
                      : query ||
                          source !== "ALL" ||
                          status !== "ALL" ||
                          direction !== "ALL"
                        ? "Chưa có giao dịch phù hợp"
                        : "Chưa có giao dịch ghi nhận"}
                  </h3>
                  <p>
                    {tab === "withdrawals"
                      ? "Yêu cầu rút và trạng thái chuyển tiền sẽ được cập nhật tại đây."
                      : "Các giao dịch đã ghi nhận sẽ hiển thị cùng nguồn tiền, số tiền và trạng thái."}
                  </p>
                  {tab === "transactions" &&
                    (query ||
                      source !== "ALL" ||
                      status !== "ALL" ||
                      direction !== "ALL") && (
                      <button
                        className="wallet-reset-filters"
                        onClick={() => {
                          setSource("ALL");
                          setStatus("ALL");
                          setDirection("ALL");
                          setSearch("");
                          setPage(1);
                        }}
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                </div>
              )}
            </div>
            {data.total > data.pageSize && (
              <div className="wallet-pagination">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Trang trước
                </button>
                <span>
                  {page} / {Math.ceil(data.total / data.pageSize)}
                </span>
                <button
                  type="button"
                  disabled={page * data.pageSize >= data.total || loading}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Trang sau
                </button>
              </div>
            )}
          </section>
          <section className="wallet-accounts">
            <header>
              <span className="wallet-account-icon">
                <MorphIcon icon={Landmark} size={23} />
              </span>
              <div>
                <h2>Tài khoản định danh của bạn</h2>
                <p>
                  Khoản chuyển qua VA sẽ được đối soát với đúng tài khoản RELOO.
                </p>
              </div>
            </header>
            {data.accounts.length ? (
              data.accounts.map((account) => (
                <div className="wallet-va" key={account.id}>
                  <strong>{account.bank_name}</strong>
                  <span>{account.va}</span>
                  <button
                    className="wallet-icon-button"
                    type="button"
                    aria-label={`Sao chép tài khoản ${account.bank_name}`}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(account.va);
                        setCopied(account.id);
                      } catch {
                        setCopied("");
                      }
                    }}
                  >
                    <MorphIcon
                      icon={copied === account.id ? CircleCheck : Copy}
                      size={17}
                    />
                  </button>
                  {account.expires_at && (
                    <small>Hạn {walletDate(account.expires_at)}</small>
                  )}
                </div>
              ))
            ) : (
              <p className="wallet-account-empty">
                Chưa được liên kết tài khoản ảo. Thông tin sẽ xuất hiện sau khi
                được cấp.
              </p>
            )}
            <Link className="wallet-account-link" href="/dashboard/profile">
              Quản lý ngân hàng nhận tiền{" "}
              <MorphIcon icon={ExternalLink} size={15} />
            </Link>
          </section>
          <p className="wallet-footnote">
            <MorphIcon icon={ShieldCheck} size={15} /> Tiền hoàn chờ xác nhận và
            tiền ký quỹ được theo dõi riêng; số dư đối soát ngân hàng không bao
            gồm tiền hoàn chưa chuyển về ngân hàng.
          </p>
        </>
      )}
      {detail && (
        <TransactionDetail
          item={detail}
          tab={tab}
          onClose={closeDetail}
          onCancelled={() => {
            closeDetail();
            setRefresh((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}
