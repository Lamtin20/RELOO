"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { IdCard } from "lucide-react";
import { useAuth } from "@/lib/store";
export function IdentityExpiryNotice() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const check = async () => {
      try {
        const data = await fetch("/api/kyc/status").then((r) => r.json());
        if (!cancelled && data.ok) setStatus(data.identity);
      } catch {}
    };
    check();
    const timer = setInterval(check, 60000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.id]);
  if (!user || !["EXPIRING", "EXPIRED"].includes(status?.status)) return null;
  return (
    <aside
      className={`identity-expiry-notice ${status.status === "EXPIRED" ? "is-expired" : ""}`}
      role="status"
    >
      <IdCard size={22} />
      <div>
        <strong>
          {status.status === "EXPIRED"
            ? "Căn cước đã hết hạn"
            : `Căn cước sắp hết hạn trong ${status.daysRemaining} ngày`}
        </strong>
        <p>
          {status.status === "EXPIRED"
            ? "Các thao tác cần xác thực đang tạm khóa. Hãy bổ sung căn cước còn hiệu lực để admin xét duyệt."
            : "Bạn nên cập nhật căn cước mới trước ngày hết hạn để tiếp tục giao dịch."}
        </p>
      </div>
      <Link href="/dashboard/kyc/verify" className="btn btn-secondary">
        Cập nhật căn cước
      </Link>
    </aside>
  );
}
