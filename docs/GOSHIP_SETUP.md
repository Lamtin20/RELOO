# Goship API — RELOO

Tích hợp tra cước và tạo vận đơn qua [Goship API](https://doc.goship.io/getting-started/introduction).

## Cấu hình `.env.local`

```env
GOSHIP_API_URL=https://sandbox.goship.io/api/v2
GOSHIP_ACCESS_TOKEN=eyJ...   # Bearer token từ Goship
GOSHIP_CLIENT_ID=299
GOSHIP_CLIENT_SECRET=...
```

- **Token**: Lấy từ đăng nhập API hoặc dashboard Goship (Bearer, header `Authorization`).
- **Sandbox**: Mặc định `sandbox.goship.io`. Production: `https://api.goship.io/api/v2`.
- **Client ID / Secret**: Dùng khi refresh token qua `POST /login` (tùy chọn nếu đã có access token dài hạn).

## Luồng RELOO

1. **Trang sản phẩm** → nút **Thuê ngay** → `/rent/[listingId]`
2. **Trang đặt thuê**: chọn ngày, Reloo Care, **địa chỉ lấy hàng (read-only từ tin đăng)**, **địa chỉ giao (từ Hồ sơ cá nhân)**, chọn biểu phí
3. **API nội bộ** proxy Goship:
   - `GET /api/goship/cities`
   - `GET /api/goship/cities/[code]/districts`
   - `GET /api/goship/districts/[code]/wards`
   - `POST /api/goship/rates`
   - `POST /api/goship/resolve` — ghép tỉnh/phường tin đăng → mã Goship
   - `POST /api/goship/webhooks` — nhận cập nhật trạng thái vận đơn
   - `GET /api/goship/tracking/[orderId]` — đồng bộ tracking cho dashboard
4. **Checkout**: phí vận chuyển từ Goship + xác nhận CCCD khi giao hàng
5. **Dashboard đơn hàng**: người thuê hủy được khi trạng thái `paid` (chủ đồ chưa xác nhận); theo dõi vận chuyển khi `shipping`

## Webhook Goship

Đăng ký endpoint: `https://your-domain.com/api/goship/webhooks`

Payload mẫu (trạng thái vận đơn): `order_id` = mã đơn RELOO (`RL-...`). Xác thực header `x-goship-hmac-sha256` bằng `GOSHIP_CLIENT_SECRET`.

Tài liệu: [Goship Webhooks](https://doc.goship.io/api/shipment/webhooks)

## Bảo mật

Không commit token/secret vào git. Rotate key nếu đã lộ trong chat.
