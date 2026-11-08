"use client";
import { useState } from "react";
import { KycReview } from "./KycReview";
export function CustomerManager({ customers = [] }) {
  const [query, setQuery] = useState(""),
    [detail, setDetail] = useState(null),
    [editing, setEditing] = useState(null),
    [reason, setReason] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [review, setReview] = useState(null),
    [group, setGroup] = useState(null),
    [busy, setBusy] = useState(false);
  async function open(id) {
    setError("");
    setEditing(null);
    setGroup(null);
    const r = await fetch(
      "/api/crm/customers?id=" + encodeURIComponent(id),
    ).then((r) => r.json());
    if (!r.ok) throw new Error(r.error);
    setDetail(r);
  }
  async function save(action) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/crm/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          id: detail.customer.id,
          updates: editing,
          group,
          reason,
        }),
      }).then((r) => r.json());
      if (!r.ok) throw new Error(r.error);
      setReason("");
      setNotice("Đã ghi nhận thao tác và nhật ký người thực hiện.");
      await open(detail.customer.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const rows = customers.filter((c) =>
    `${c.name} ${c.phone} ${c.email}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section>
      <div className="ops-toolbar">
        <input
          className="input"
          placeholder="Tìm tên, điện thoại hoặc email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Email · điện thoại</th>
              <th>Trạng thái</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>
                  {c.email}
                  <br />
                  {c.phone}
                </td>
                <td>
                  {c.activation_status === "RESTRICTED"
                    ? "Đang hạn chế"
                    : c.activation_status === "ACTIVE"
                      ? "Đang hoạt động"
                      : "Chờ xác minh"}
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    onClick={() => open(c.id).catch((e) => setError(e.message))}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail && (
        <section className="ops-editor customer-detail">
          <header className="profile-section-heading">
            <h2>{detail.customer.name}</h2>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setDetail(null);
                setReview(null);
              }}
            >
              Đóng
            </button>
          </header>
          <div className="ops-actions">
            {detail.permissions.edit && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  const c = detail.customer;
                  setEditing({
                    name: c.name,
                    phone: c.phone || "",
                    bio: c.profile_data?.bio || "",
                    address: c.profile_data?.address || "",
                    dateOfBirth: c.profile_data?.dateOfBirth || "",
                    gender: c.profile_data?.gender || "",
                  });
                  setGroup(null);
                }}
              >
                Chỉnh thông tin
              </button>
            )}
            {detail.permissions.groups && (
              <>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setGroup("BLACKLIST");
                    setEditing(null);
                  }}
                >
                  Đưa vào danh sách đen
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setGroup("NORMAL");
                    setEditing(null);
                  }}
                >
                  Chuyển về danh sách thường
                </button>
              </>
            )}
          </div>
          <dl className="customer-fields">
            <div>
              <dt>Email đăng ký</dt>
              <dd>{detail.customer.email}</dd>
            </div>
            <div>
              <dt>Số điện thoại</dt>
              <dd>{detail.customer.phone || "Chưa có"}</dd>
            </div>
            <div>
              <dt>Ngày đăng ký</dt>
              <dd>
                {new Date(detail.customer.created_at).toLocaleString("vi-VN")}
              </dd>
            </div>
            <div>
              <dt>Căn cước</dt>
              <dd>
                {detail.identity?.nationalId || "Chưa được duyệt"}
                {detail.identity?.expiryDate &&
                  ` · Hết hạn ${detail.identity.expiryDate}`}
              </dd>
            </div>
            <div>
              <dt>Địa chỉ</dt>
              <dd>
                {detail.customer.profile_data?.address || "Chưa khai báo"}
              </dd>
            </div>
            <div>
              <dt>Giới thiệu</dt>
              <dd>{detail.customer.profile_data?.bio || "Chưa khai báo"}</dd>
            </div>
          </dl>
          <h3>Ngân hàng đã khai báo</h3>
          {detail.banks.map((b) => (
            <p key={b.id}>
              {b.bank_name} · {b.accountNumber || b.masked_account} ·{" "}
              {b.holderName || ""} · {b.is_default ? "Mặc định" : ""}
            </p>
          ))}
          {!detail.banks.length && <p>Chưa khai báo.</p>}
          {detail.permissions.identity && (
            <>
              <h3>Hồ sơ căn cước & ảnh</h3>
              {detail.submissions.map((s) => (
                <p key={s.id}>
                  {new Date(s.created_at).toLocaleString("vi-VN")} · {s.status}{" "}
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/crm/kyc?id=" + s.id).then(
                          (r) => r.json(),
                        );
                        if (!r.ok) throw new Error(r.error);
                        setReview(r);
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Xem ba ảnh căn cước
                  </button>
                </p>
              ))}
            </>
          )}
          {review && (
            <KycReview detail={review} onClose={() => setReview(null)} />
          )}
          <h3>Nhóm & lịch sử hạn chế</h3>
          {detail.blacklist.map((b) => (
            <p key={b.id}>
              {b.status === "CLEARED" ? "Đã gỡ" : "Danh sách đen"} · {b.reason}
            </p>
          ))}
          {!detail.blacklist.length && <p>Chưa có mục hạn chế.</p>}
          {(editing || group) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save(group ? "GROUP" : "EDIT");
              }}
            >
              <h3>
                {editing
                  ? "Chỉnh thông tin có ghi nhật ký"
                  : group === "BLACKLIST"
                    ? "Xác nhận hạn chế khách hàng"
                    : "Xác nhận gỡ danh sách đen sau đối chiếu"}
              </h3>
              {editing && (
                <div className="ops-form-grid">
                  {Object.entries({
                    name: "Họ tên",
                    phone: "Số điện thoại",
                    address: "Địa chỉ",
                    bio: "Giới thiệu",
                    dateOfBirth: "Ngày sinh",
                    gender: "Giới tính",
                  }).map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        className="input"
                        type={key === "dateOfBirth" ? "date" : "text"}
                        value={editing[key]}
                        onChange={(e) =>
                          setEditing({ ...editing, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              {group === "NORMAL" && (
                <p>
                  Thao tác sẽ gỡ các mục blacklist và hồ sơ rủi ro của khách này
                  sau khi admin đã đối chiếu. Căn cước hết hạn vẫn cần xác minh
                  lại.
                </p>
              )}
              <label>
                Lý do / bằng chứng đã đối chiếu
                <textarea
                  className="input"
                  required
                  minLength={20}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button className="btn btn-primary" disabled={busy}>
                Ghi nhận thao tác
              </button>
            </form>
          )}
          <h3>Nhật ký chỉnh sửa</h3>
          {detail.changes.map((log) => (
            <p key={log.id}>
              {new Date(log.created_at).toLocaleString("vi-VN")} ·{" "}
              {log.profiles?.name || log.actor_id} · {log.fields.join(", ")} ·{" "}
              {log.reason}
            </p>
          ))}
          {!detail.changes.length && <p>Chưa có chỉnh sửa từ admin.</p>}
        </section>
      )}
    </section>
  );
}
