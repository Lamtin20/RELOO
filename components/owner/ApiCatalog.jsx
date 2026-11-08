"use client";
import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
export function ApiCatalog() {
  const [data, setData] = useState(null),
    [q, setQ] = useState(""),
    [category, setCategory] = useState(""),
    [https, setHttps] = useState(true),
    [noAuth, setNoAuth] = useState(false),
    [offset, setOffset] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(),
      timer = setTimeout(() => {
        const params = new URLSearchParams({
          q,
          category,
          https: String(https),
          noAuth: String(noAuth),
          offset: String(offset),
        });
        fetch("/api/crm/api-catalog?" + params, { signal: controller.signal })
          .then(async (response) => {
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setData(result);
            setError("");
          })
          .catch((cause) => {
            if (!controller.signal.aborted) setError(cause.message);
          });
      }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [q, category, https, noAuth, offset]);
  return (
    <section>
      <div className="catalog-toolbar">
        <label>
          <Search size={17} />
          <input
            className="input"
            aria-label="Tìm API"
            placeholder="Tìm tên hoặc mô tả API"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOffset(0);
            }}
          />
        </label>
        <select
          className="input"
          aria-label="Danh mục API"
          value={category}
          onChange={(event) => {
            setCategory(event.target.value);
            setOffset(0);
          }}
        >
          <option value="">Tất cả danh mục</option>
          {data?.categories.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label>
          <input
            type="checkbox"
            checked={https}
            onChange={(event) => {
              setHttps(event.target.checked);
              setOffset(0);
            }}
          />
          HTTPS
        </label>
        <label>
          <input
            type="checkbox"
            checked={noAuth}
            onChange={(event) => {
              setNoAuth(event.target.checked);
              setOffset(0);
            }}
          />
          Không cần khóa
        </label>
      </div>
      {error && <p className="ops-error">{error}</p>}
      <div className="ops-table-wrap">
        <table className="ops-table">
          <thead>
            <tr>
              <th>API</th>
              <th>Nội dung</th>
              <th>Danh mục</th>
              <th>Xác thực</th>
              <th>Liên kết</th>
            </tr>
          </thead>
          <tbody>
            {data?.entries.map((item, index) => (
              <tr key={item.url + index}>
                <td>{item.name}</td>
                <td>{item.description}</td>
                <td>{item.category}</td>
                <td>{item.auth === "None" ? "Không cần khóa" : item.auth}</td>
                <td>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Mở tài liệu API"
                    aria-label={`Mở tài liệu ${item.name}`}
                  >
                    <ExternalLink size={18} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && (
        <>
          <div className="profile-actions">
            <button
              className="btn btn-secondary"
              disabled={!offset}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              Trước
            </button>
            <span>
              {Math.min(offset + 1, data.total)}–
              {Math.min(offset + 50, data.total)} / {data.total}
            </span>
            <button
              className="btn btn-secondary"
              disabled={offset + 50 >= data.total}
              onClick={() => setOffset(offset + 50)}
            >
              Sau
            </button>
          </div>
          <p className="profile-note">
            Nguồn:{" "}
            <a href={data.source} target="_blank" rel="noopener noreferrer">
              public-apis
            </a>{" "}
            · Bản cập nhật{" "}
            {new Date(data.generatedAt).toLocaleDateString("vi-VN")}. Danh mục
            tham khảo, chưa xác nhận dịch vụ đang hoạt động hoặc được phép xử lý
            dữ liệu người dùng.
          </p>
        </>
      )}
    </section>
  );
}
