"use client";
import { useEffect, useState } from "react";
import {SmartKeyPanel} from "@/components/security/SmartKeyPanel";
import { Trash2 } from "lucide-react";
export function DeleteAccount() {
  const [data, setData] = useState(null),
    [open, setOpen] = useState(false),
    [verified,setVerified]=useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const a = new AbortController();
    fetch("/api/profile/deletion", { signal: a.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        setData(d);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError("Chưa kiểm tra được điều kiện xóa tài khoản.");
      });
    return () => a.abort();
  }, []);
  return (
    <section className="identity-delete">
      <h3>Xóa tài khoản</h3>
      <p>
        Hồ sơ căn cước và thông tin cá nhân được xóa khi yêu cầu đủ điều kiện.
        Chứng từ giao dịch cần lưu theo pháp luật được giữ riêng.
      </p>
      {data?.reasons.map((r) => (
        <p key={r} className="profile-note">
          • {r}
        </p>
      ))}
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      <button
        className="btn btn-secondary"
        disabled={!data?.allowed || busy}
        onClick={() => setOpen((v) => !v)}
      >
        <Trash2 size={17} />
        Xóa tài khoản
      </button>
      {open && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const r = await fetch("/api/profile/deletion", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({}),
                }),
                d = await r.json();
              if (!r.ok) throw Error(d.error);
              window.location.assign("/auth?deleted=1");
            } catch (e) {
              setError(e.message);
              setOpen(false);
            } finally {
              setBusy(false);
            }
          }}
        >
          <SmartKeyPanel onVerified={()=>setVerified(true)}/>
          <button
            className="btn btn-primary"
            disabled={busy || !verified}
          >
            Xác nhận xóa
          </button>
        </form>
      )}
    </section>
  );
}
