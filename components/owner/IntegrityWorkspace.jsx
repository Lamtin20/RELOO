"use client";
import { useEffect, useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
export function IntegrityWorkspace() {
  const [items, setItems] = useState([]),
    [error, setError] = useState(""),
    [selected, setSelected] = useState(null),
    [reason, setReason] = useState("");
  async function load() {
    const response = await fetch("/api/crm/integrity"),
      data = await response.json();
    if (!response.ok) throw new Error(data.error);
    setItems(data.incidents);
  }
  useEffect(() => {
    const timer = setTimeout(
      () => load().catch((cause) => setError(cause.message)),
      0,
    );
    return () => clearTimeout(timer);
  }, []);
  async function decide(event) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/crm/integrity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...selected, reason }),
        }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSelected(null);
      await load();
    } catch (cause) {
      setError(cause.message);
    }
  }
  return (
    <section>
      {error && <p className="ops-error">{error}</p>}
      <p className="profile-note">
        Lỗi toàn vẹn kho dữ liệu được ghi nhận là cảnh báo hệ thống. Chỉ vụ giả
        mạo có bằng chứng xác định đúng người thực hiện và được xét duyệt mới
        tính cảnh báo tài khoản.
      </p>
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>Loại cảnh báo</th>
              <th>Đối tượng được xác định</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  {item.code === "RENTAL_HISTORY_CHANGED"
                    ? "Lịch sử cần đối chiếu toàn vẹn"
                    : item.code}
                </td>
                <td>
                  {item.alleged_actor_id ||
                    "Chưa xác định, không tính cảnh báo người dùng"}
                </td>
                <td>
                  {item.status === "CONFIRMED"
                    ? "Đã xác nhận"
                    : item.status === "DISMISSED"
                      ? "Đã loại trừ"
                      : "Chờ đối chiếu"}
                </td>
                <td>
                  {item.status === "REVIEW" && item.alleged_actor_id && (
                    <div className="ops-actions">
                      <button
                        className="icon-tool"
                        title="Xác nhận giả mạo với bằng chứng"
                        onClick={() => {
                          setSelected({ id: item.id, decision: "CONFIRMED" });
                          setReason("");
                        }}
                      >
                        <ShieldAlert size={17} />
                      </button>
                      <button
                        className="icon-tool"
                        title="Loại trừ cảnh báo"
                        onClick={() => {
                          setSelected({ id: item.id, decision: "DISMISSED" });
                          setReason("");
                        }}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <form className="integration-editor" onSubmit={decide}>
          <label>
            Căn cứ, bằng chứng và cách xác định người thực hiện
            <textarea
              className="input"
              required
              minLength={30}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="btn btn-primary">
            <Check size={17} />
            Lưu quyết định
          </button>
        </form>
      )}
    </section>
  );
}
