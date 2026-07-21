import { Be_Vietnam_Pro } from "next/font/google";
import { RelooProvider } from "@/lib/store";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-app",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "RELOO - Cho thuê đồ dùng, thiết bị tại TP.HCM",
  description:
    "Tìm và cho thuê máy ảnh, đồ camping, đồ Mẹ & Bé, thời trang tại TP.HCM. Kiểm tra tình trạng trước giao, thanh toán qua VietQR.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi" className={beVietnam.variable}>
      <body>
        <RelooProvider>{children}</RelooProvider>
      </body>
    </html>
  );
}
