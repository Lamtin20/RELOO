"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/lib/store";
export function RestrictionDialog() {
  const { user } = useAuth();
  const [closed, setClosed] = useState(false);
  const restricted = user?.activationStatus === "RESTRICTED";
  useEffect(() => { document.documentElement.dataset.relooRestricted = restricted ? "true" : "false"; }, [restricted]);
  if (!restricted || closed) return null;
  return <div className="reloo-modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="restriction-title" className="reloo-modal"><button className="icon-tool" aria-label="Đóng" title="Đóng" onClick={() => setClosed(true)}><X size={20}/></button><ShieldAlert size={30}/><h2 id="restriction-title">Tài khoản của bạn đang tạm thời bị hạn chế</h2><p>Hệ thống ghi nhận một số thông tin liên quan đến tài khoản của bạn có dấu hiệu rủi ro cao. Để bảo vệ cộng đồng và đảm bảo an toàn giao dịch, RELOO tạm thời hạn chế một số chức năng của tài khoản trong thời gian xác minh.</p><p>Nếu cho rằng đây là nhầm lẫn, bạn có thể gửi yêu cầu xem xét và bổ sung thông tin để được hỗ trợ.</p><div className="ops-actions"><Link href="/safety" className="btn btn-primary" onClick={() => setClosed(true)}>Yêu cầu xem xét</Link><button className="btn btn-secondary" onClick={() => setClosed(true)}>Đóng</button></div></section></div>;
}
