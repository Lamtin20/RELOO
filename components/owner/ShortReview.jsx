"use client";
import { useEffect, useState } from "react";
export function ShortReview() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [reasons, setReasons] = useState({}),
    [busy, setBusy] = useState("");
  async function load() {
    const r = await fetch("/api/crm/shorts"),
      d = await r.json();
    if (!r.ok) throw new Error(d.error);
    setData(d);
  }
  useEffect(() => {
    const t = setTimeout(() => load().catch((e) => setError(e.message)), 0);
    return () => clearTimeout(t);
  }, []);
  async function review(item, publish) {
    setBusy(item.id);
    try {
      const r = await fetch("/api/crm/shorts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            version: item.version,
            publish,
            reason: reasons[item.id] || "",
          }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <section>
      <h2>Video ngắn & sản phẩm</h2>
      <p>
        Duyệt nội dung, quyền sử dụng âm thanh/hình ảnh và sản phẩm trước khi
        hiển thị. Nội dung bị báo cáo có thể ẩn để kiểm tra.
      </p>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="short-review-grid">
            {data.videos.map((v) => (
              <article className="short-create-card" key={v.id}>
                <video
                  src={"https://reloo.vn/api/shorts/media/" + v.media_id}
                  controls
                  preload="none"
                  playsInline
                />
                <strong>
                  {v.profiles?.name} ·{" "}
                  {v.status === "PENDING"
                    ? "Chờ duyệt"
                    : v.status === "PUBLISHED"
                      ? "Đang hiển thị"
                      : "Cần chỉnh sửa"}
                </strong>
                <p>{v.caption}</p>
                {v.short_video_products.map((p, i) => (
                  <a
                    key={i}
                    href={
                      p.href.startsWith("/")
                        ? "https://reloo.vn" + p.href
                        : p.href
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </a>
                ))}
                {data.reports
                  .filter((r) => r.video_id === v.id)
                  .map((r) => (
                    <p className="ops-error" key={r.id}>
                      Báo cáo: {r.reason}
                    </p>
                  ))}
                {["PENDING", "PUBLISHED"].includes(v.status) && (
                  <>
                    <label>
                      Lý do duyệt / xử lý
                      <textarea
                        value={reasons[v.id] || ""}
                        maxLength={2000}
                        onChange={(e) =>
                          setReasons({ ...reasons, [v.id]: e.target.value })
                        }
                      />
                    </label>
                    <div className="profile-actions">
                      {v.status === "PENDING" && (
                        <button
                          className="btn btn-primary"
                          disabled={busy === v.id}
                          onClick={() => review(v, true)}
                        >
                          Duyệt hiển thị
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        disabled={busy === v.id}
                        onClick={() => review(v, false)}
                      >
                        {v.status === "PUBLISHED" ? "Ẩn video" : "Từ chối"}
                      </button>
                    </div>
                  </>
                )}
              </article>
            ))}
          </div>
          {!data.videos.length && (
            <p className="ops-empty">Chưa có video cần duyệt.</p>
          )}
        </>
      )}
    </section>
  );
}
