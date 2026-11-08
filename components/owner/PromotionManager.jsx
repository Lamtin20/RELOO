"use client";
import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Ticket,
  Gift,
  Banknote,
  Users,
  Save,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  PROMOTION_SERVICES,
  FUNDERS,
  percentBps,
} from "@/lib/promotions/rules";
import { formatMoney } from "@/lib/finance/wallet-display";
const STATES = {
  DRAFT: "Dự thảo",
  ACTIVE: "Đang bật",
  PAUSED: "Tạm dừng",
  ENDED: "Đã kết thúc",
};
function stateLabel(item, now) {
  if (item.status !== "ACTIVE") return STATES[item.status];
  if (Date.parse(item.starts_at) > now) return "Sắp diễn ra";
  if (Date.parse(item.ends_at) <= now) return "Hết thời hạn";
  return "Đang áp dụng";
}
const localDate = (v) => {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
const iso = (v) => new Date(v).toISOString();
const EMPTY_PROGRAM = () => ({
  name: "",
  description: "",
  terms: "",
  services: ["RENTAL"],
  funder: "RELOO",
  status: "DRAFT",
  budget_limit: "1000000",
  starts_at: localDate(new Date()),
  ends_at: localDate(new Date(Date.now() + 30 * 86400000)),
});
async function api(body) {
  const r = await fetch(
      "/api/crm/promotions",
      body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {},
    ),
    d = await r.json();
  if (!r.ok) throw Error(d.error || "Chưa tải được khuyến mãi.");
  return d;
}
export function PromotionManager({ customers = [] }) {
  const editorPanel = useRef(null);
  const [data, setData] = useState(null),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState("coupons"),
    [editing, setEditing] = useState(null),
    [search, setSearch] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [invite, setInvite] = useState(""),
    [fund, setFund] = useState({
      sourceId: "",
      amount: "",
      reason: "",
      confirmed: false,
      originAccount: "411",
    }),
    [simulation, setSimulation] = useState({
      gross: "500000",
      couponId: "",
      discount: "",
    });
  async function load() {
    const d = await api();
    setData(d);
    setSelected((old) =>
      old && d.campaigns.some((c) => c.id === old)
        ? old
        : d.campaigns[0]?.id || "",
    );
  }
  const editorKind = editing?.kind,
    editorId = editing?.id;
  useEffect(() => {
    if (editorKind)
      editorPanel.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  }, [editorKind, editorId]);
  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(t);
  }, []);
  const campaign = data?.campaigns.find((c) => c.id === selected),
    coupons = data?.coupons.filter((c) => c.campaign_id === selected) || [],
    participants =
      data?.participants.filter((p) => p.campaign_id === selected) || [],
    metrics = data?.stats?.find((s) => s.id === selected) || {};
  async function act(body) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = await api(body);
      await load();
      if (body.action === "CAMPAIGN" && !body.id) setSelected(saved.id);
      setNotice("Đã lưu và ghi nhật ký thao tác.");
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function createProgram() {
    setEditing({ kind: "CAMPAIGN", fields: EMPTY_PROGRAM() });
    setError("");
  }
  function editProgram() {
    setEditing({
      kind: "CAMPAIGN",
      id: campaign.id,
      version: campaign.version,
      fields: {
        ...campaign,
        budget_limit:
          campaign.budget_limit === null ? "" : String(campaign.budget_limit),
        starts_at: localDate(campaign.starts_at),
        ends_at: localDate(campaign.ends_at),
      },
    });
  }
  function editCoupon(c) {
    setEditing({
      kind: "COUPON",
      id: c?.id,
      version: c?.version,
      fields: c
        ? {
            ...c,
            value:
              c.discount_type === "PERCENT"
                ? String(Number(c.value) / 100)
                : c.value,
            max_discount: c.max_discount || "",
            starts_at: localDate(c.starts_at),
            ends_at: localDate(c.ends_at),
            customer_ids: c.customer_ids || [],
          }
        : {
            campaign_id: selected,
            code: "",
            discount_type: "PERCENT",
            value: "10",
            max_discount: "100000",
            minimum_amount: "0",
            total_limit: 1000,
            customer_limit: 1,
            customer_ids: [],
            first_order_only: false,
            public_code: false,
            status: "DRAFT",
            starts_at: localDate(campaign.starts_at),
            ends_at: localDate(campaign.ends_at),
          },
    });
  }
  const change = (key, value) =>
    setEditing((e) => ({ ...e, fields: { ...e.fields, [key]: value } }));
  return (
    <section className="promotion-manager">
      <header className="promo-heading">
        <div>
          <span className="r-eyebrow">ƯU ĐÃI CỦA RELOO</span>
          <h2>Chương trình & coupon</h2>
          <p>Tạo ưu đãi, chọn bên tài trợ và theo dõi từng lượt áp dụng.</p>
        </div>
        <div>
          <button
            className="btn btn-secondary"
            disabled={busy}
            onClick={() => load().catch((e) => setError(e.message))}
            aria-label="Làm mới khuyến mãi"
          >
            <RefreshCw size={17} />
          </button>
          <button
            className="btn btn-primary"
            disabled={busy || data?.canWrite === false}
            onClick={createProgram}
          >
            <Plus size={18} />
            Tạo chương trình
          </button>
        </div>
      </header>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="cashflow-success" role="status">
          {notice}
        </p>
      )}
      {!data ? (
        <p>Đang tải chương trình…</p>
      ) : (
        <div className="promo-layout">
          <aside className="promo-programs">
            <label className="promo-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm chương trình"
                aria-label="Tìm chương trình"
              />
            </label>
            {data.campaigns
              .filter((c) =>
                c.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c.id);
                    setTab("coupons");
                  }}
                  className={selected === c.id ? "selected" : ""}
                >
                  <Gift size={22} />
                  <span>
                    <strong>{c.name}</strong>
                    <small>{FUNDERS[c.funder]}</small>
                    <em>{stateLabel(c, data.now)}</em>
                  </span>
                </button>
              ))}
            {!data.campaigns.length && (
              <div className="promo-empty">
                <Gift size={34} />
                <strong>Chưa có chương trình</strong>
                <p>Tạo chương trình đầu tiên, sau đó khai báo các mã coupon.</p>
              </div>
            )}
          </aside>
          <div className="promo-detail">
            {campaign ? (
              <>
                <header className="promo-program-header">
                  <div>
                    <h3>{campaign.name}</h3>
                    <p>{campaign.description}</p>
                    <span className="profile-tag">
                      {FUNDERS[campaign.funder]}
                    </span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    disabled={busy || data.canWrite === false}
                    onClick={editProgram}
                  >
                    Chỉnh chương trình
                  </button>
                </header>
                <div className="promo-scopes">
                  {campaign.services.map((s) => (
                    <span key={s}>{PROMOTION_SERVICES[s]}</span>
                  ))}
                </div>
                <p className="profile-note">
                  {new Date(campaign.starts_at).toLocaleString("vi-VN")} —{" "}
                  {new Date(campaign.ends_at).toLocaleString("vi-VN")}
                </p>
                <div className="promo-metrics">
                  <div>
                    <Ticket size={20} />
                    <span>Coupon</span>
                    <strong>{metrics.coupons ?? coupons.length}</strong>
                  </div>
                  <div>
                    <Users size={20} />
                    <span>Đã áp dụng / giữ chỗ</span>
                    <strong>
                      {metrics.redeemed || 0} / {metrics.reserved || 0}
                    </strong>
                  </div>
                  <div>
                    <Gift size={20} />
                    <span>Ưu đãi đã xác nhận</span>
                    <strong>
                      {formatMoney(metrics.discountRedeemed || "0")}
                    </strong>
                  </div>
                  <div>
                    <Banknote size={20} />
                    <span>{campaign.funder === "RELOO" ? "Ngân sách tài trợ còn lại" : "Hạn mức giảm còn lại"}</span>
                    <strong>
                      {campaign.funder === "RELOO" ? formatMoney(
                        BigInt(metrics.funded || 0) -
                          BigInt(metrics.fundingCommitted || 0),
                      ) : campaign.budget_limit === null ? "Theo coupon" : formatMoney(BigInt(campaign.budget_limit)-BigInt(metrics.discountRedeemed || 0)-BigInt(metrics.discountReserved || 0))}
                    </strong>
                  </div>
                </div>
                <nav className="promo-tabs" aria-label="Quản lý chương trình">
                  {[
                    ["coupons", "Coupon"],
                    ["participants", "Bên cung cấp"],
                    ["funding", "Ngân sách"],
                    ["activity", "Lượt áp dụng"],
                  ].map(([k, v]) => (
                    <button
                      key={k}
                      className={tab === k ? "active" : ""}
                      onClick={() => setTab(k)}
                    >
                      {v}
                    </button>
                  ))}
                </nav>
                {tab === "coupons" && (
                  <>
                    <div className="promo-toolbar">
                      <p>
                        Một đơn dùng một coupon. Mức giảm được tính trên phần
                        dịch vụ hợp lệ.
                      </p>
                      <button
                        className="btn btn-primary"
                        disabled={busy || data.canWrite === false}
                        onClick={() => editCoupon(null)}
                      >
                        <Plus size={17} />
                        Tạo coupon
                      </button>
                    </div>
                    <div className="promo-coupon-grid">
                      {coupons.map((c) => (
                        <article className="promo-coupon" key={c.id}>
                          <div>
                            <Ticket size={23} />
                            <span>{stateLabel(c, data.now)}</span>
                          </div>
                          <h4>{c.code}</h4>
                          <strong>
                            {c.discount_type === "PERCENT"
                              ? Number(c.value) / 100 + "%"
                              : formatMoney(c.value)}
                          </strong>
                          <p>
                            Đơn tối thiểu {formatMoney(c.minimum_amount)}
                            {c.max_discount &&
                              " · Giảm tối đa " + formatMoney(c.max_discount)}
                          </p>
                          <p>
                            {c.total_limit} lượt · {c.customer_limit} lượt /
                            khách
                          </p>
                          {c.first_order_only && (
                            <small>Chỉ đơn đầu được hệ thống ghi nhận</small>
                          )}
                          <button
                            className="btn btn-secondary"
                            disabled={busy || data.canWrite === false}
                            onClick={() => editCoupon(c)}
                          >
                            Chỉnh coupon
                          </button>
                        </article>
                      ))}
                    </div>
                    {!coupons.length && (
                      <p className="promo-empty">
                        Chưa có coupon. Mã mới mặc định ở trạng thái dự thảo.
                      </p>
                    )}
                    <form
                      className="promo-simulator"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const c = coupons.find(
                          (c) => c.id === simulation.couponId,
                        );
                        if (!c) return;
                        try {
                          const r = await api({
                            action: "SIMULATE",
                            gross: simulation.gross,
                            discountType: c.discount_type,
                            value: c.value,
                            cap: c.max_discount,
                          });
                          setSimulation({
                            ...simulation,
                            discount: r.discount,
                          });
                        } catch (e) {
                          setError(e.message);
                        }
                      }}
                    >
                      <h4>Tính thử mức giảm</h4>
                      <select
                        aria-label="Coupon tính thử"
                        required
                        value={simulation.couponId}
                        onChange={(e) =>
                          setSimulation({
                            ...simulation,
                            couponId: e.target.value,
                            discount: "",
                          })
                        }
                      >
                        <option value="">Chọn coupon</option>
                        {coupons.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.code}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Giá trị dịch vụ tính thử"
                        inputMode="numeric"
                        required
                        value={simulation.gross}
                        onChange={(e) =>
                          setSimulation({
                            ...simulation,
                            gross: e.target.value.replace(/\D/g, ""),
                            discount: "",
                          })
                        }
                      />
                      <button className="btn btn-secondary">Tính thử</button>
                      {simulation.discount && (
                        <strong>
                          Giảm {formatMoney(simulation.discount)} · Còn{" "}
                          {formatMoney(
                            BigInt(simulation.gross) -
                              BigInt(simulation.discount),
                          )}
                        </strong>
                      )}
                      <small>
                        Chỉ mô phỏng phép tính; chưa giữ lượt, thu tiền hoặc áp
                        dụng vào đơn.
                      </small>
                    </form>
                  </>
                )}
                {tab === "participants" && (
                  <>
                    <p>
                      Chương trình do chủ đồ chịu giảm cần chủ đồ xác nhận điều
                      kiện. Khi thay đổi chương trình hoặc coupon, phiên bản mới
                      cần được xác nhận lại; đơn đã chốt giá giữ điều kiện cũ.
                    </p>
                    {campaign.funder === "PROVIDER" ? (
                      <form
                        className="promo-inline"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (
                            await act({
                              action: "INVITE",
                              campaignId: selected,
                              profileId: invite,
                            })
                          )
                            setInvite("");
                        }}
                      >
                        <select
                          required
                          aria-label="Chủ đồ tham gia"
                          value={invite}
                          onChange={(e) => setInvite(e.target.value)}
                        >
                          <option value="">Chọn chủ đồ</option>
                          {customers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} · {c.id}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn btn-primary"
                          disabled={busy || !invite || data.canWrite === false}
                        >
                          Mời tham gia
                        </button>
                      </form>
                    ) : (
                      <p>
                        RELOO tài trợ phần giảm; chủ đồ nhận đủ giá gốc đã thỏa
                        thuận khi ngân sách bù được đối soát.
                      </p>
                    )}
                    {participants.map((p) => (
                      <div className="promo-participant" key={p.profile_id}>
                        <strong>
                          {customers.find((c) => c.id === p.profile_id)?.name ||
                            p.profile_id}
                        </strong>
                        <span>
                          {p.status === "ACCEPTED" &&
                          p.accepted_version === campaign.version
                            ? "Đã đồng ý"
                            : p.status === "DECLINED"
                              ? "Từ chối"
                              : p.status === "ACCEPTED"
                                ? "Cần xác nhận phiên bản mới"
                                : "Đang chờ xác nhận"}
                        </span>
                      </div>
                    ))}
                  </>
                )}
                {tab === "funding" && (
                  <>
                    <p>
                      Hạn mức ưu đãi:{" "}
                      {campaign.budget_limit === null
                        ? "Theo giới hạn từng coupon"
                        : formatMoney(campaign.budget_limit)}
                      . Khoản bù cho bên cung cấp dùng nguồn tiền RELOO đã đối
                      soát; tiền cọc và tiền của khách được tách riêng.
                    </p>
                    {campaign.funder === "RELOO" && (
                      <form
                        className="promo-funding"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          if (
                            await act({
                              action: "FUND",
                              campaignId: selected,
                              sourceId: fund.sourceId,
                              amount: fund.amount,
                              reason: fund.reason,
                              companyFundsConfirmed: fund.confirmed,
                              originAccount: fund.originAccount,
                            })
                          )
                            setFund({
                              sourceId: "",
                              amount: "",
                              reason: "",
                              confirmed: false,
                              originAccount: "411",
                            });
                        }}
                      >
                        <label>
                          Nguồn tiền ngân hàng đã xác minh
                          <select
                            required
                            value={fund.sourceId}
                            onChange={(e) =>
                              setFund({ ...fund, sourceId: e.target.value })
                            }
                          >
                            <option value="">Chọn nguồn tiền RELOO</option>
                            {data.companySources?.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.id.slice(0, 8)} · Còn {formatMoney(s.amount)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Ngân sách bổ sung (VND)
                          <input
                            required
                            inputMode="numeric"
                            value={fund.amount}
                            onChange={(e) =>
                              setFund({
                                ...fund,
                                amount: e.target.value.replace(/\D/g, ""),
                              })
                            }
                          />
                        </label>
                        <label>
                          Loại nguồn tiền
                          <select value={fund.originAccount} onChange={e => setFund({...fund, originAccount:e.target.value})}>
                            <option value="411">Vốn bổ sung của RELOO (411)</option>
                            <option value="5113">Doanh thu dịch vụ đã đối soát (5113)</option>
                          </select>
                        </label>
                        <label>
                          Căn cứ nguồn tiền
                          <textarea
                            required
                            minLength={20}
                            value={fund.reason}
                            onChange={(e) =>
                              setFund({ ...fund, reason: e.target.value })
                            }
                            placeholder="Nêu chứng từ và căn cứ xác nhận đây là tiền RELOO"
                          />
                        </label>
                        <label className="profile-check">
                          <input
                            type="checkbox"
                            checked={fund.confirmed}
                            onChange={(e) =>
                              setFund({ ...fund, confirmed: e.target.checked })
                            }
                          />
                          Tôi xác nhận đây là tiền RELOO, không phải tiền cọc
                          hay tiền nhận hộ khách.
                        </label>
                        <button
                          className="btn btn-primary"
                          disabled={
                            busy || !fund.confirmed || data.canFund === false
                          }
                        >
                          Phân bổ ngân sách đã đối soát
                        </button>
                      </form>
                    )}
                    {data.funding
                      .filter((f) => f.campaign_id === selected)
                      .map((f) => (
                        <div className="promo-participant" key={f.id}>
                          <strong>{formatMoney(f.amount)}</strong>
                          <span>{f.reason}</span>
                        </div>
                      ))}
                  </>
                )}
                {tab === "activity" && (
                  <div className="ops-table-wrap">
                    <table className="ops-table">
                      <thead>
                        <tr>
                          <th>Khách hàng</th>
                          <th>Giá gốc</th>
                          <th>Giảm</th>
                          <th>Thanh toán</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.redemptions
                          .filter((r) => r.campaign_id === selected)
                          .map((r) => (
                            <tr key={r.id}>
                              <td>
                                {customers.find((c) => c.id === r.profile_id)
                                  ?.name || r.profile_id}
                              </td>
                              <td>{formatMoney(r.gross)}</td>
                              <td>{formatMoney(r.discount)}</td>
                              <td>{formatMoney(r.net)}</td>
                              <td>
                                {r.status === "REDEEMED"
                                  ? "Đã áp dụng"
                                  : r.status === "RESERVED"
                                    ? "Giữ chỗ"
                                    : "Đã giải phóng"}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <details className="promo-terms">
                  <summary>Điều kiện chương trình</summary>
                  <p>{campaign.terms}</p>
                </details>
              </>
            ) : (
              <div className="promo-empty">
                <Ticket size={44} />
                <h3>Ưu đãi rõ ràng, dễ quản lý</h3>
                <p>
                  Chọn hoặc tạo chương trình để khai báo coupon, lịch áp dụng và
                  bên chịu phần giảm.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      {editing && (
        <div className="promo-editor" ref={editorPanel}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const fields = {
                ...editing.fields,
                starts_at: iso(editing.fields.starts_at),
                ends_at: iso(editing.fields.ends_at),
              };
              const ok = await act({
                action: editing.kind,
                id: editing.id,
                version: editing.version,
                campaignVersion: campaign?.version,
                fields,
              });
              if (ok) setEditing(null);
            }}
          >
            <header>
              <h3>
                {editing.kind === "CAMPAIGN"
                  ? editing.id
                    ? "Chỉnh chương trình"
                    : "Tạo chương trình"
                  : editing.id
                    ? "Chỉnh coupon"
                    : "Tạo coupon"}
              </h3>
              <button
                type="button"
                className="wallet-icon-button"
                aria-label="Đóng khai báo khuyến mãi"
                onClick={() => setEditing(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="ops-form-grid">
              {editing.kind === "CAMPAIGN" ? (
                <>
                  <label>
                    Tên chương trình
                    <input
                      required
                      minLength={3}
                      maxLength={150}
                      value={editing.fields.name}
                      onChange={(e) => change("name", e.target.value)}
                    />
                  </label>
                  <label>
                    Bên chịu phần giảm
                    <select
                      value={editing.fields.funder}
                      onChange={(e) => change("funder", e.target.value)}
                    >
                      {Object.entries(FUNDERS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Hạn mức ưu đãi (VND)
                    <input
                      inputMode="numeric"
                      value={editing.fields.budget_limit}
                      onChange={(e) =>
                        change(
                          "budget_limit",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                      placeholder="Để trống nếu chỉ giới hạn theo coupon"
                    />
                  </label>
                  <label>
                    Giới thiệu ngắn
                    <input
                      maxLength={2000}
                      value={editing.fields.description}
                      onChange={(e) => change("description", e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    Mã coupon
                    <input
                      required
                      minLength={3}
                      maxLength={40}
                      value={editing.fields.code}
                      onChange={(e) =>
                        change("code", e.target.value.toUpperCase())
                      }
                      placeholder="VD: RELOO10"
                    />
                  </label>
                  <label>
                    Loại giảm
                    <select
                      value={editing.fields.discount_type}
                      onChange={(e) => change("discount_type", e.target.value)}
                    >
                      <option value="AMOUNT">Số tiền cố định</option>
                      <option value="PERCENT">Phần trăm</option>
                    </select>
                  </label>
                  <label>
                    {editing.fields.discount_type === "PERCENT"
                      ? "Mức giảm (%)"
                      : "Mức giảm (VND)"}
                    <input
                      required
                      inputMode={
                        editing.fields.discount_type === "PERCENT"
                          ? "decimal"
                          : "numeric"
                      }
                      value={editing.fields.value}
                      onChange={(e) => change("value", e.target.value)}
                      placeholder={
                        editing.fields.discount_type === "PERCENT"
                          ? "10 hoặc 12.5"
                          : "50000"
                      }
                    />
                  </label>
                  <label>
                    Giảm tối đa (VND)
                    <input
                      inputMode="numeric"
                      value={editing.fields.max_discount}
                      onChange={(e) =>
                        change(
                          "max_discount",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </label>
                  <label>
                    Giá trị đơn tối thiểu (VND)
                    <input
                      required
                      inputMode="numeric"
                      value={editing.fields.minimum_amount}
                      onChange={(e) =>
                        change(
                          "minimum_amount",
                          e.target.value.replace(/\D/g, ""),
                        )
                      }
                    />
                  </label>
                  <label>
                    Tổng lượt tối đa
                    <input
                      required
                      type="number"
                      min="1"
                      max="10000000"
                      value={editing.fields.total_limit}
                      onChange={(e) =>
                        change("total_limit", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    Lượt tối đa / khách
                    <input
                      required
                      type="number"
                      min="1"
                      max={editing.fields.total_limit}
                      value={editing.fields.customer_limit}
                      onChange={(e) =>
                        change("customer_limit", Number(e.target.value))
                      }
                    />
                  </label>
                </>
              )}
              <label>
                Bắt đầu
                <input
                  required
                  type="datetime-local"
                  value={editing.fields.starts_at}
                  onChange={(e) => change("starts_at", e.target.value)}
                />
              </label>
              <label>
                Kết thúc
                <input
                  required
                  type="datetime-local"
                  value={editing.fields.ends_at}
                  onChange={(e) => change("ends_at", e.target.value)}
                />
              </label>
              <label>
                Trạng thái
                <select
                  value={editing.fields.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  {Object.entries(STATES).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {editing.kind === "CAMPAIGN" ? (
              <>
                <fieldset className="promo-services">
                  <legend>Dịch vụ áp dụng</legend>
                  {Object.entries(PROMOTION_SERVICES).map(([k, v]) => (
                    <label key={k}>
                      <input
                        type="checkbox"
                        checked={editing.fields.services.includes(k)}
                        onChange={(e) =>
                          change(
                            "services",
                            e.target.checked
                              ? [...editing.fields.services, k]
                              : editing.fields.services.filter((s) => s !== k),
                          )
                        }
                      />
                      {v}
                    </label>
                  ))}
                </fieldset>
                <label>
                  Điều kiện chương trình
                  <textarea
                    required
                    minLength={20}
                    maxLength={6000}
                    rows={5}
                    value={editing.fields.terms}
                    onChange={(e) => change("terms", e.target.value)}
                    placeholder="Phạm vi, mức ưu đãi, điều kiện hưởng và trách nhiệm bên tài trợ"
                  />
                </label>
              </>
            ) : (
              <>
                <label className="profile-check">
                  <input
                    type="checkbox"
                    checked={editing.fields.first_order_only}
                    onChange={(e) =>
                      change("first_order_only", e.target.checked)
                    }
                  />
                  Chỉ đơn đầu được hệ thống ghi nhận
                </label>
                <label className="profile-check">
                  <input
                    type="checkbox"
                    checked={editing.fields.public_code}
                    onChange={(e) => change("public_code", e.target.checked)}
                  />
                  Cho hiển thị mã công khai trong chương trình
                </label>
                <label>
                  Khách hàng cụ thể (không chọn = tất cả)
                  <select
                    multiple
                    value={editing.fields.customer_ids}
                    onChange={(e) =>
                      change(
                        "customer_ids",
                        [...e.target.selectedOptions].map((o) => o.value),
                      )
                    }
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <p className="profile-note">
              Coupon không giảm tiền cọc/ký quỹ. Coupon cho phí RELOO tính trước
              thuế. Chương trình giao nhận chỉ áp dụng khi giao dịch dịch vụ đó
              sẵn sàng.
            </p>
            <div className="promo-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditing(null)}
              >
                Đóng
              </button>
              <button className="btn btn-primary" disabled={busy}>
                <Save size={17} />
                {busy ? "Đang lưu…" : "Lưu khai báo"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
