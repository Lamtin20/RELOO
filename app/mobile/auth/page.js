import { Suspense } from "react";
import { MobileAuthReturn } from "@/components/mobile/MobileAuthReturn";
export const metadata = {
  title: "Trở về ứng dụng RELOO",
  robots: { index: false, follow: false },
};
export default function MobileAuthPage() {
  return (
    <Suspense fallback={<p>Đang chuẩn bị đăng nhập...</p>}>
      <MobileAuthReturn />
    </Suspense>
  );
}
