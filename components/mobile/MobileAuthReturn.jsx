"use client";
import { useEffect,useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/store";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthShell } from "@/components/auth/AuthShell";
import {AppleAuthButton} from '@/components/auth/AppleAuthButton';
import {LoginSecurityPanel} from '@/components/security/LoginSecurityPanel';
import Link from 'next/link';
export function MobileAuthReturn() {
  const params = useSearchParams(),
    flow = params.get("flow"),
    { user, hydrated } = useAuth(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [url, setUrl] = useState("");
  const userId=user?.id,enroll=params.get('enroll')==='1',[allowed,setAllowed]=useState(false);
  const next = "/mobile/auth?flow=" + encodeURIComponent(flow || "")+(enroll?'&enroll=1':'');
  useEffect(()=>{if(!enroll||!userId)return;let live=true;fetch('/api/mobile/auth/start?flow='+encodeURIComponent(flow)).then(r=>r.json()).then(d=>{if(live){setAllowed(d.allowed===true);if(!d.allowed)setError('Hãy đăng nhập đúng tài khoản đang dùng trong app.');}}).catch(()=>{if(live)setError('Chưa kiểm tra được tài khoản ứng dụng.');});return()=>{live=false;};},[enroll,userId,flow]);
  async function complete() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/mobile/auth/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flow }),
        }),
        d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setUrl(d.url);
      window.location.assign(d.url);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <h2>Đăng nhập ứng dụng RELOO</h2>
      <p>Đăng nhập bằng trình duyệt, sau đó trở về ứng dụng để tiếp tục.</p>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
      {!flow || !/^[a-f0-9-]{36}$/i.test(flow) ? (
        <p>Hãy bắt đầu đăng nhập từ ứng dụng RELOO.</p>
      ) : !hydrated ? (
        <p>Đang kiểm tra tài khoản...</p>
      ) : user ? (
        <>
          <p>
            Tài khoản: <strong>{user.name}</strong>
          </p>
          {enroll&&allowed&&<LoginSecurityPanel passkeyOnly onEnrolled={complete}/>}
          <button
            className="btn btn-primary"
            onClick={complete}
            disabled={busy||enroll&&!allowed}
          >
            Tiếp tục về ứng dụng
          </button>
          {url && <a href={url}>Mở lại ứng dụng RELOO</a>}
          <GoogleAuthButton next={next} onError={setError} />
        </>
      ) : (
        <><GoogleAuthButton next={next} onError={setError}/><AppleAuthButton next={next} onError={setError}/><Link href={'/auth?next='+encodeURIComponent(next)}>Đăng nhập bằng mật khẩu</Link></>
      )}
    </AuthShell>
  );
}
