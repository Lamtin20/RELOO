# RELOO - Sàn cho thuê P2P bảo chứng Blockchain

Phạm vi RELOO Real hiện tại: [Product specification](docs/RELOO_PRODUCT_SPEC.md), [tiến độ thực và trở ngại](docs/RELOO_PROGRESS.md), [rule index](docs/RELOO_BUSINESS_RULES.md), [staging runbook](docs/RELOO_STAGING_RUNBOOK.md). Tầm nhìn mới có bốn mini app; không đồng nghĩa cả bốn đã mở giao dịch. Các mô tả demo/NFT/PayOS/fee cố định bên dưới là ghi chú lịch sử, **không phải trạng thái tích hợp hay chính sách production đã được duyệt**. Mã auth hiện tại không dùng role-switch demo.

Phân hệ mới: [RELOO Real · Đặt phòng — bản thử local](docs/BOOKING_IMPLEMENTATION_20261022.md). Chạy `npm run stays:preview`, kiểm thử `npm run test:stays`. Có khảo sát Dayladau bằng REA/Samsung, đặc tả, migration backend-only và demo có nhãn; **chưa mở bán hoặc triển khai production**.

Nền tảng thương mại điện tử cho thuê tài sản ngang hàng (P2P Rental) theo mô hình kinh tế tuần hoàn. Xây dựng trên Next.js với đầy đủ luồng Marketplace, Dashboard người dùng và hệ thống CMS/CRM quản trị.

## Chạy ứng dụng

```bash
cd reloo-app
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Tài khoản demo

Vào `/auth` hoặc dùng menu avatar để chuyển nhanh:

| Vai trò | User | Mục đích |
|--------|------|----------|
| Admin | RELOO Admin | CMS / CRM / Risk Ops / Finance |
| Người cho thuê | Minh Nguyễn (KYC L3, Trust ~850) | Kho đồ, Ads, Thu nhập cho thuê |
| Người thuê | Lan Trần (KYC L2, Trust ~720) | Thuê đồ, Green Audit nhận hàng |

## Module chính

### Marketplace
- Trang chủ, khám phá, lọc danh mục
- Chi tiết sản phẩm + NFT Passport + Trust Score
- Checkout với tách dòng tiền (thuê / cọc / Reloo Care / phí sàn 15%)
- Thanh toán mock PayOS VietQR

### Dashboard người dùng
- Kho đồ, đăng tin, đẩy tin / Pro Store
- Đơn hàng + timeline trạng thái
- Green Audit wizard (5 góc + chữ ký số)
- Thu nhập cho thuê (chỉ rút về ngân hàng, không nạp tiền trước)
- eKYC đa tầng & Trust Score

### Admin CMS + CRM
- CRM: người dùng, leads, tickets CSKH
- CMS: trang nội dung, FAQ, banner
- Ops: Risk / Geofencing / Demand Letter
- Finance: GMV, escrow, xuất báo cáo NĐ91
- Cài đặt phí sàn, Reloo Care, feature flags

## Stack

- Next.js 16 (App Router) + React 19
- Lucide icons, Sora + Manrope
- State: Context + localStorage (`reloo-store-v1`) — **đang migrate sang Supabase**
- Database: [Supabase PostgreSQL](docs/SUPABASE_SETUP.md) — schema Trust Platform
- Dữ liệu demo seed trong `lib/seed-data.js`

## Ghi chú

Module bổ sung: [Rental Care và cá nhân hóa](docs/RENTAL_CARE_OPERATIONS.md), cài đặt tại `/account/calendar` và `/account/personalization`. Mã nguồn có OAuth Calendar riêng, adapter native và bộ đề xuất rule-based có consent. Chưa bật production; xem trạng thái tích hợp thật/test và migration trong tài liệu.

Module bổ sung: [RELOO Nội Khu](docs/NEIGHBORHOOD_OPERATIONS.md) tại `/noi-khu`, có API chung và kiểm thử lưu dữ liệu riêng bằng `npm run test:neighborhood:web`. Module này dùng xác nhận thanh toán trực tiếp, không tuyên bố escrow/bảo hiểm hay dịch vụ thanh toán thật. Chưa bật production; đọc hướng dẫn migration/rollout trước khi dùng. Những mô tả demo bên dưới không phải trạng thái tích hợp của Nội Khu.

Đây là bản demo đầy đủ chức năng phía frontend với business logic RELOO (phí 15%, Reloo Care 3–5%, Trust Score → cọc, Green Audit hash, escrow 85/15). Các tích hợp thật (PayOS, eKYC FPT/VNPT, Polygon, GHTK/Ahamove) được mô phỏng sẵn để nối API production sau.
