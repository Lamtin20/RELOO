# Kết nối Supabase — RELOO

Hướng dẫn thiết lập PostgreSQL trên Supabase cho nền tảng Trust Platform.

## 1. Tạo project Supabase

1. Vào [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Chọn region gần VN (ví dụ **Singapore**)
3. Lưu **Database password** (dùng cho CLI / psql nếu cần)

## 2. Lấy API keys

**Project Settings → API**:

| Biến | Mô tả |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public — client + RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | service role — **chỉ server**, không commit |

Thêm vào `reloo-app/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## 3. Chạy migration schema

**Cách A — SQL Editor (nhanh nhất)**

1. Supabase Dashboard → **SQL Editor** → New query
2. Copy toàn bộ nội dung file:
   `supabase/migrations/20260718100000_initial_schema.sql`
3. **Run**

**Cách B — Supabase CLI**

```bash
npm install -g supabase
supabase login
cd reloo-app
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 4. Kiểm tra kết nối

```bash
cd reloo-app
npm run db:check
```

Hoặc khi app đang chạy:

```
GET http://localhost:3000/api/supabase/health
```

Kết quả mong đợi: `ok: true`, `schemaReady: true`, các bảng `profiles`, `assets`, `transactions`, `chronicle` đều OK.

## 5. Cấu trúc code

```
lib/supabase/
  env.js      — biến môi trường
  client.js   — browser client (Client Components)
  server.js   — server client (Route Handlers, RSC)
  admin.js    — service role (seed, cron, admin API)

lib/db/
  connection.js — checkSupabaseConnection()

app/api/supabase/health/route.js — health check API
```

## 6. Schema (bảng chính)

| Bảng | Mục đích |
|------|----------|
| `profiles` | Người dùng (sẽ liên kết `auth.users`) |
| `identity_profiles` | eKYC |
| `assets` | Tin cho thuê (listings) |
| `asset_passports` | NFT Passport |
| `transactions` | Đơn thuê |
| `chronicle` | Event store **INSERT ONLY** (R009) |
| `audit_events` | Green Audit hash (R008) |
| `behavior_logs` | Hành vi người dùng |
| `decision_logs` | Decision Engine |
| `cms_pages` | Nội dung CMS |
| `platform_settings` | Cấu hình sàn |

Chi tiết kiến trúc: `docs/TRUST_PLATFORM_ARCHITECTURE.md`, `lib/trust-platform/schema.js`.

## 7. Row Level Security (RLS)

- **Anon key**: đọc `assets` (status = available), passport, CMS published
- **Service role**: bypass RLS — dùng cho seed, Chronicle writer, admin
- **Chronicle**: không cho anon đọc/ghi; chỉ backend service role insert

## 8. Lộ trình tiếp theo

1. ✅ Client Supabase + schema + health check
2. ✅ Script seed `npm run db:seed` (đẩy `seed-data.js` lên DB)
3. ✅ Repository layer — `lib/db/listings.js` + `/api/db/bootstrap` (Explore/Product đọc Supabase)
4. ⬜ Supabase Auth thay demo login
5. ⬜ Realtime / Storage cho ảnh listing & Green Audit

## 9. Lưu ý bảo mật

- **Không** commit `.env.local` hoặc `SUPABASE_SERVICE_ROLE_KEY`
- Service role chỉ gọi từ server (`lib/supabase/admin.js`, API routes, scripts)
- Chronicle & audit_events: không UPDATE/DELETE (trigger + R009/R008)
