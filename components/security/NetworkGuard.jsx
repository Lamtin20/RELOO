"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/lib/store";
export function NetworkGuard() {
  const { user } = useAuth();
  const [anonymous, setAnonymous] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => {
    if (!user) return;
    let stopped = false;
    async function check() { try { const device = localStorage.getItem('reloo-security-device') || crypto.randomUUID(); localStorage.setItem('reloo-security-device', device); const data = await fetch("/api/security/network", { headers: { 'X-Reloo-Device': device } }).then((response) => response.json()); if (!stopped && data.ok) setAnonymous(data.result === "ANONYMOUS"); } catch {} }
    check(); const timer = setInterval(check, 60000);
    return () => { stopped = true; clearInterval(timer); };
  }, [user?.id]);
  useEffect(() => {
    if (!anonymous) return;
    function intercept(event) {
      const anchor = event.target.closest('a[href]'), button = event.target.closest('button');
      const protectedLink = anchor && /^\/(rent\/|checkout\/|dashboard\/messages)/.test(anchor.getAttribute('href'));
      const protectedButton = button && /Gửi yêu cầu|Gửi tin nhắn/.test(button.textContent);
      if (protectedLink || protectedButton) { event.preventDefault(); event.stopPropagation(); setOpen(true); }
    }
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [anonymous]);
  if (!open) return null;
  return <div className="reloo-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="vpn-title" className="reloo-modal"><button className="icon-tool" title="Đóng" aria-label="Đóng" onClick={() => setOpen(false)}><X size={20}/></button><ShieldAlert size={28}/><h2 id="vpn-title">Tắt dịch vụ VPN để tiếp tục</h2><p>Phiên truy cập này có tín hiệu sử dụng dịch vụ ẩn danh. Bạn vẫn có thể xem website; hãy tắt VPN hoặc proxy trước khi gửi yêu cầu thuê và trao đổi với người dùng khác.</p><button className="btn btn-primary" onClick={() => setOpen(false)}>Đóng</button></section></div>;
}
