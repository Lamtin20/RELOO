# RELOO Real — design system index v1

Nguồn token duy nhất: `lib/design/palette.js`, `app/reloo-palette.css`; đọc [RELOO_COLOR_SYSTEM.md](RELOO_COLOR_SYSTEM.md), [USER_LANGUAGE_20261017.md](USER_LANGUAGE_20261017.md). Không dựng theme song song. Font hiện tại từ `app/layout.js`; không khẳng định README Sora là runtime nếu source đang dùng Be Vietnam Pro.

- CTA xanh primary/hover, canvas/card/divider/mint/trust/error theo token sẵn có. Component namespaced CSS, không global override làm hỏng marketplace cũ.
- Touch target thiết kế >=44 CSS px; focus visible, labels/description/errors gần trường, aria-live cho kết quả; icon có text/accessible name, màu không là tín hiệu duy nhất.
- Motion chỉ phản hồi tác vụ; loading thật, không delay giả; reduced-motion. Skeleton không có số review/giá giả.
- Responsive 320/390/768/1440; safe-area bottom và keyboard trong native cần device test riêng. Back giữ query và scroll theo domain; không dùng history.back không có fallback.
- Card chung cấu trúc media/title/location/action; room gắn tổng thời gian, rental unit/cọc, used condition/sale, job shift/pay unit. Không sort cả bốn theo giá.
- Header có inbox/bell; mobile nav Home/Explore/Post/Transactions/Account. Auth continuation server-safe và host-only cookies. Không ẩn entry Guest rồi coi auth đã kiểm tra.
- Forms group, draft/preview; không auto-select policy phí/hoàn chưa duyệt. Nội dung mới dictionary vi/en, không language state riêng. Nội dung chủ đăng không tự dịch.

Mục tiêu WCAG2.2AA cần đo; không tự gọi certified AA từ lint. Test matrix ghi tương phản, keyboard, screen reader và native nào còn NOT_RUN. Mục tiêu LCP/INP/CLS là PROPOSED, lab không phải RUM p75.


## UI checkpoint ? 23/10/2026

Xem [RELOO_UI_REDESIGN_20261023.md](RELOO_UI_REDESIGN_20261023.md). Shared design/component refresh ?? tri?n khai local; 54 browser render checks v? 8 interaction checks PASS, 57 selected regression tests PASS. To?n b? 98 route/authenticated/native v?n PARTIAL; kh?ng b?o deployed. Build/lint xem artifact cu?i.
