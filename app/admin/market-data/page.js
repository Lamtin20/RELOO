"use client";
import { useCallback, useEffect, useState } from "react";
import { Database, RefreshCw, Upload } from "lucide-react";
import { PRICE_KINDS, PRICE_SOURCES } from "@/lib/pricing/sources";
import { CATEGORIES, LISTING_CONDITIONS } from "@/lib/constants";
export default function MarketDataAdmin() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [target, setTarget] = useState({
    sourceId: "chotot",
    url: "",
    brand: "",
    model: "",
    variant: "",
    category: "dien-thoai",
    condition: "good",
    priceKind: "used_asking",
    intervalMinutes: 360,
    permissionNote: "",
  });
  const [source, setSource] = useState({
      id: "chotot",
      enabled: false,
      accessBasis: "",
    }),
    [feed, setFeed] = useState(null),
    [license, setLicense] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/market-data");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (cause) {
      setError(cause.message);
    }
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/market-data")
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        return result;
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  async function write(payload) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/market-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setMessage("Đã lưu thay đổi và lịch sử quản trị.");
      await load();
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusy(false);
    }
  }
  function update(key, value) {
    setTarget((current) => ({ ...current, [key]: value }));
  }
  return (
    <div className="market-data-admin">
      <header>
        <Database size={25} />
        <div>
          <h1>Dữ liệu giá & sản phẩm đối tác</h1>
          <p>Nguồn, lịch thu thập và feed affiliate.</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          title="Tải lại dữ liệu"
          onClick={load}
        >
          <RefreshCw size={17} />
        </button>
      </header>
      {error && (
        <p className="feature-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <section>
        <h2>Nguồn định giá</h2>
        <div className="market-data-table">
          {(data?.sources || PRICE_SOURCES).map((item) => (
            <div key={item.id}>
              <strong>{item.name}</strong>
              <span>{item.enabled ? "Đã bật" : "Chưa bật"}</span>
              <span>{item.status || "NOT_CONNECTED"}</span>
              <span>
                {item.last_success_at
                  ? new Date(item.last_success_at).toLocaleString("vi-VN")
                  : "Chưa ghi nhận"}
              </span>
            </div>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            write({ action: "source", ...source });
          }}
        >
          <label>
            Nguồn
            <select
              value={source.id}
              onChange={(event) =>
                setSource((current) => ({ ...current, id: event.target.value }))
              }
            >
              {PRICE_SOURCES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Căn cứ truy cập / quyền sử dụng dữ liệu
            <input
              required
              minLength={10}
              maxLength={1000}
              value={source.accessBasis}
              onChange={(event) =>
                setSource((current) => ({
                  ...current,
                  accessBasis: event.target.value,
                }))
              }
            />
          </label>
          <label className="market-data-checkbox">
            <input
              type="checkbox"
              checked={source.enabled}
              onChange={(event) =>
                setSource((current) => ({
                  ...current,
                  enabled: event.target.checked,
                }))
              }
            />
            Cho phép worker thu thập các URL đã cấu hình
          </label>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Lưu nguồn
          </button>
        </form>
      </section>
      <section>
        <h2>Thêm sản phẩm cần theo dõi giá</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            write({ action: "target", ...target });
          }}
        >
          <div className="pricing-inputs">
            <label>
              Nguồn
              <select
                value={target.sourceId}
                onChange={(event) => update("sourceId", event.target.value)}
              >
                {PRICE_SOURCES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Loại giá
              <select
                value={target.priceKind}
                onChange={(event) => update("priceKind", event.target.value)}
              >
                {PRICE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {
                      {
                        new_retail: "Bán mới",
                        used_asking: "Rao bán đồ cũ",
                        buyback: "Thu mua",
                        rental_daily: "Cho thuê/ngày",
                      }[kind]
                    }
                  </option>
                ))}
              </select>
            </label>
            {["brand", "model", "variant"].map((key, index) => (
              <label key={key}>
                {["Thương hiệu", "Model", "Phiên bản"][index]}
                <input
                  required={key !== "variant"}
                  maxLength={key === "model" ? 150 : 100}
                  value={target[key]}
                  onChange={(event) => update(key, event.target.value)}
                />
              </label>
            ))}
            <label>
              Danh mục
              <select
                value={target.category}
                onChange={(event) => update("category", event.target.value)}
              >
                {CATEGORIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tình trạng đã đối chiếu
              <select
                value={target.condition}
                onChange={(event) => update("condition", event.target.value)}
              >
                {Object.values(LISTING_CONDITIONS).map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Khoảng lặp (phút)
              <input
                type="number"
                required
                min={60}
                max={10080}
                value={target.intervalMinutes}
                onChange={(event) =>
                  update("intervalMinutes", Number(event.target.value))
                }
              />
            </label>
            <label className="pricing-inputs__wide">
              URL sản phẩm
              <input
                type="url"
                required
                maxLength={2000}
                value={target.url}
                onChange={(event) => update("url", event.target.value)}
              />
            </label>
            <label className="pricing-inputs__wide">
              Ghi chú cấu hình, tình trạng và phạm vi sử dụng
              <input
                required
                minLength={10}
                maxLength={1000}
                value={target.permissionNote}
                onChange={(event) =>
                  update("permissionNote", event.target.value)
                }
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            Đưa vào lịch thu thập
          </button>
        </form>
      </section>
      <section>
        <h2>Feed sản phẩm affiliate</h2>
        <label className="market-data-file">
          <Upload size={18} />
          Chọn feed JSON
          <input
            type="file"
            accept="application/json,.json"
            onChange={async (event) => {
              try {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 900000) throw new Error("Feed tối đa 900 KB.");
                const parsed = JSON.parse(await file.text());
                if (!Array.isArray(parsed))
                  throw new Error("Feed cần là danh sách sản phẩm.");
                setFeed(parsed);
                setError("");
              } catch (cause) {
                setError(cause.message);
                setFeed(null);
              }
            }}
          />
        </label>
        <p>
          {feed ? `${feed.length} sản phẩm chờ nhập` : "Chưa chọn feed đối tác"}
        </p>
        <label className="market-data-checkbox">
          <input
            type="checkbox"
            checked={license}
            onChange={(event) => setLicense(event.target.checked)}
          />
          Feed được đối tác cấp quyền hiển thị, giá và hoa hồng còn hiệu lực
        </label>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!feed || !license || busy}
          onClick={() =>
            write({
              action: "catalog",
              products: feed,
              licenseConfirmed: license,
            })
          }
        >
          Nhập sản phẩm
        </button>
      </section>
      <section>
        <h2>URL theo dõi</h2>
        <div className="market-data-table">
          {data?.targets.map((item) => (
            <div key={item.id}>
              <strong>
                {item.model} {item.variant}
              </strong>
              <span>{item.source_id}</span>
              <span>{item.last_status || "Chờ lượt thu thập"}</span>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                Xem nguồn
              </a>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Lịch thu thập gần nhất</h2>
        {!data?.runs.length ? (
          <p>Chưa có lượt thu thập.</p>
        ) : (
          <div className="market-data-table">
            {data.runs.map((item) => (
              <div key={item.id}>
                <strong>{item.source_id}</strong>
                <span>{item.status}</span>
                <span>{item.reason_code || ""}</span>
                <span>
                  {new Date(item.observed_at).toLocaleString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
