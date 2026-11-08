"use client";
import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/store";
export function AccountStatusBanner() {
  const { user } = useAuth();
  if (!user || user.activationStatus === "ACTIVE") return null;
  return (
    <div className="account-status-banner">
      <ShieldAlert size={18} />
      <span>
        {user.profileComplete === false
          ? "Bổ sung số điện thoại để hoàn tất hồ sơ tài khoản."
          : "Tài khoản đang chờ xác minh. Đăng tin và giao dịch chưa được kích hoạt."}
      </span>
      <Link
        href={user.profileComplete === false ? "/auth/complete" : "/safety"}
      >
        Xem hồ sơ <ArrowRight size={14} />
      </Link>
    </div>
  );
}
