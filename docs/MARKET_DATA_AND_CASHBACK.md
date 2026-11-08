# Định giá, dữ liệu thị trường và hoàn tiền

## Đã triển khai

- `/pricing`: tự tính lại khi nhập thương hiệu, model, cấu hình, tình trạng, tuổi sản phẩm và giá mua tùy chọn. Kết quả gồm giá trị món đồ, khoảng giá, giá thuê/ngày, nguồn và cách tính.
- Bước “Giá cho thuê” ở `/lend`: dùng cùng bộ định giá; chủ đồ chủ động bấm “Dùng giá đề xuất”, có thể chỉnh lại giá.
- `/admin/market-data`: bật/tắt nguồn, khai báo URL sản phẩm cần theo dõi, xem trạng thái thu thập và nhập feed affiliate được cấp quyền. Mọi thao tác ghi đều kiểm tra admin ở backend và lưu audit cùng transaction.
- Worker `scripts/collect-prices.mjs`: hàng đợi có lease chống chạy trùng, lịch lặp theo từng URL, robots.txt, nhịp ít nhất 5 giây/host, timeout, giới hạn dung lượng, TLS và kiểm tra IP công khai. Mỗi redirect kiểm tra lại URL và robots. Không vượt CAPTCHA, 403, đăng nhập hoặc gọi API nội bộ chưa được cấp quyền.
- Lưu lịch sử `price_snapshots` và `price_collection_runs`: tên, nội dung sản phẩm, giá, nguồn, loại giá, tình trạng, URL, thời điểm, dấu kiểm tra nội dung. Không thu hồ sơ người bán hoặc số điện thoại liên hệ. Không lưu toàn bộ HTML.
- `/cashback`: lọc Shopee/TikTok, tìm kiếm, sắp xếp và tải thêm bằng cursor. Danh mục lấy từ feed được cấp quyền và API TikTok của ACCESSTRADE. Mỗi lần mua vẫn tạo link riêng gắn với người dùng; không dùng link chung để tính hoàn tiền.
- Cookie: từ chối, chấp nhận hoặc tùy chỉnh; nhớ lựa chọn 180 ngày, có nút đổi lại trong footer và `/cms/privacy`. Cookie quảng bá/đo lường mặc định tắt. Chưa có pixel hoặc analytics được cấu hình.

## Quan sát nguồn tham khảo ngày 09/10/2026

[Trang định giá của Đồ Chất](https://www.dochat.com.vn/gia-thu-mua) công khai rằng bảng tham khảo đến từ TGDD, có model, dung lượng, nhóm tình trạng và kỳ hiệu lực. Trang còn phân biệt bảng đã lưu với báo giá hiện tại. Không có căn cứ công khai để kết luận thuật toán backend riêng của họ; RELOO dùng quy tắc độc lập, hiển thị được ở `/pricing/method`.

[Outlet Đồ Chất](https://www.dochat.com.vn/outlet/) hiển thị danh mục sản phẩm và phân biệt nguồn Outlet thương hiệu với Shopee. Khoản giảm giá trên hàng Outlet không đồng nghĩa với khoản hoàn affiliate. Không thể suy ra API/private credentials của họ từ giao diện; RELOO kết nối hợp đồng đối tác của chính mình.

[robots của Chợ Tốt](https://www.chotot.com/robots.txt) có các URL không cho thu thập, bao gồm nhiều query tìm kiếm/lọc và khu vực tài khoản. [CellphoneS](https://cellphones.com.vn/robots.txt) cũng loại nhiều query; [FPT Shop](https://fptshop.com.vn/robots.txt) có các đường dẫn bị chặn. TGDD/Điện Máy Xanh trả 403 khi kiểm tra robots từ môi trường này. Worker ghi lỗi nguồn thay vì vượt chặn hoặc giả lập dữ liệu. Robots cho phép không tự cấp quyền tái phân phối toàn bộ nội dung: cần đối chiếu điều khoản/cấp quyền của nguồn trước khi bật.

**Chưa chạy cào toàn bộ Chợ Tốt.** Triển khai hiện tại theo dõi URL sản phẩm được cấu hình, không có tự động duyệt toàn bộ danh mục hay lưu tất cả người bán. Thu thập toàn bộ nguồn cần feed/API được cấp phép và hạn mức tương ứng. Với trang không có Product/Offer JSON-LD rõ ràng, worker trả `NO_STRUCTURED_PRICE`, không dò một con số bất kỳ trong HTML làm giá.

## Quy tắc giá

1. Chỉ gộp cùng brand/model/variant/category; loại model có khác biến thể Pro, Max, Plus, dung lượng. Với đồ đã dùng, phải cùng tình trạng đã đối chiếu.
2. Không gộp giá bán mới, giá rao đồ cũ, giá thu mua, giá thuê. Giá rao không phải giá đã giao dịch.
3. Dùng URL gần nhất, giá bán mới tối đa 2 ngày, giá rao/thuê tối đa 7 ngày; hết hàng và giá sai định dạng không được dùng. Mỗi nhóm cần ít nhất 3 URL hợp lệ. Loại lệch lớn bằng trung vị và độ lệch tuyệt đối trung vị.
4. Nếu chưa đủ giá rao nhưng có giá mới, áp dụng hệ số tình trạng/hao mòn. Nếu chưa có dữ liệu nguồn, chỉ ước tính khi chủ đồ nhập giá mua và ghi rõ `OWNER_INPUT_RULE`. Không có giá đầu vào thì trả `INSUFFICIENT_DATA`.
5. Hệ số thử nghiệm: mới 1, như mới 0.85, tốt 0.72, khá 0.5; đồ đã dùng giữ giá 0.88 mỗi năm. Khoảng ±15%. Giá thuê dùng hệ số danh mục hiện có trong `lib/constants.js` nếu không đủ tin giá thuê. Cần hiệu chỉnh bằng dữ liệu thực tế; không coi hệ số này là “AI biết giá thị trường”.
6. Lỗi chức năng yêu cầu kiểm tra trực tiếp, không đưa offer tự động. Đây là đề xuất cho chủ đồ, không phải cam kết mua lại/đảm bảo sinh lời.

## Chạy nguồn giá

Project Supabase đã được khôi phục ngày 09/10/2026 sau khi xác định bị tạm dừng. Kết nối Auth/database hoạt động lại và migration dữ liệu thị trường đã được áp dụng. Nguồn giá và affiliate vẫn cần được cấp quyền/cấu hình riêng; khôi phục database không tự tạo dữ liệu thị trường hay mở cashback. Không có giá thật nào được giả lập để lấp chỗ trống.

```powershell
node scripts/apply-feature-migration.mjs
node scripts/collect-prices.mjs
node scripts/collect-prices.mjs --watch
```

Migration mới: `20261009120000_market_data.sql`, áp dụng sau các schema/auth/security hiện có. Mặc định nguồn đều tắt. Sau khi có quyền truy cập, admin ghi căn cứ, bật nguồn, thêm URL/model đúng, đặt nhịp từ 60 phút đến 7 ngày. Nên khởi đầu 6 giờ/URL. Chạy `--watch` bằng service manager hoặc gọi lượt đơn theo lịch Task Scheduler/cron; không mở terminal worker liên tục từ web request. Worker không tạo giá từ dữ liệu test.

`PRICE_WORKER_BATCH` mặc định 10, tối đa 30 target/lượt. Nguồn bị chặn vẫn giữ lịch sử thành công cũ nhưng chỉ được dùng trong thời hạn đã nêu. Bật/tắt nguồn không thay đổi lịch sử giá. Các tests SQL dùng PostgreSQL fixture riêng, không phải database dự phòng cho app.

## Bạn cần cung cấp gì cho cashback?

| Thông tin | Mục đích |
| --- | --- |
| Nhà cung cấp: ACCESSTRADE hay Shopee/TikTok trực tiếp | Chọn hợp đồng API và luồng đối soát đúng |
| Publisher ID/tài khoản đối tác đã duyệt reloo.vn | Chứng minh quyền tham gia chương trình |
| Xác nhận cho phép traffic cashback/incentivized | Affiliate thông thường không mặc định cho phép chia hoàn tiền |
| API access key, campaign ID Shopee; quyền API TikTok | Tạo link, lấy sản phẩm và báo cáo đơn |
| Feed sản phẩm hoặc quyền catalog/export của từng chiến dịch | Hiển thị nhiều hàng hóa với giá, ảnh, phân loại, tồn kho, commission và thời hạn |
| Mẫu báo cáo đơn, tracking field được trả về, trạng thái hủy/duyệt | Kiểm tra click ID/sub-ID, tránh cộng nhầm hoặc cộng trùng |
| Tỷ lệ chia commission và điều kiện payout | Chốt chính sách hoàn, ngưỡng rút, lịch trả và kênh chi trả |

**Không gửi khóa bí mật trong chat, ảnh hoặc file commit.** Đặt vào file môi trường server:

```env
ACCESSTRADE_ACCESS_KEY=
ACCESSTRADE_SHOPEE_CAMPAIGN_ID=
AFFILIATE_CASHBACK_APPROVED=false
AFFILIATE_REWARD_SHARE=0.7
ACCESSTRADE_TIKTOK_COMMISSION_UNIT=
AFFILIATE_CATALOG_KEYWORDS=đồ dùng,camping,máy ảnh,laptop
```

Đặt approval=true chỉ khi đối tác đã xác nhận mô hình. 0.7 là chia 70% **commission được duyệt**, không phải hoàn 70% giá đơn. Xác nhận đơn vị `commission.rate` trong hợp đồng/mẫu JSON TikTok rồi đặt `ACCESSTRADE_TIKTOK_COMMISSION_UNIT=bps` hoặc `percent`. Khi chưa xác nhận, sản phẩm vẫn có thể hiển thị giá nhưng không quảng bá một tỷ lệ hoàn suy đoán. Nếu chọn API Shopee/TikTok trực tiếp, cần tài liệu hợp đồng và bộ credentials của họ; adapter hiện tại là ACCESSTRADE, chưa giả nhận tích hợp trực tiếp.

[API TikTok product search v2](https://developers.accesstrade.vn/api-publisher-vietnamese/tich-hop-api-publisher-at-cho-chien-dich-tiktok-shop/version-2-updated-version/tiktok-product-search-v2) dùng `page_token`/`next_page_token`. Worker catalog đọc tối đa 5 trang cho mỗi từ khóa, 10 từ khóa/lượt và lưu giá trong 24 giờ:

```powershell
node scripts/sync-affiliate-catalog.mjs
```

Shopee dùng feed/export được đối tác cấp quyền; chưa có một API catalog Shopee phổ quát được xác minh trong workspace. Nhập JSON tại `/admin/market-data`; không có sản phẩm hoặc tỷ lệ commission bịa để làm đầy trang. Format:

```json
[
  {
    "id": "provider-product-id",
    "provider": "accesstrade",
    "merchant": "shopee",
    "title": "Tên sản phẩm từ feed",
    "originalUrl": "https://shopee.vn/product/123/456",
    "image": "https://partner.example/image.jpg",
    "price": 100000,
    "category": "Điện tử",
    "commissionBps": 1000,
    "inStock": true,
    "observedAt": "2026-10-09T08:00:00Z",
    "expiresAt": "2026-10-10T08:00:00Z",
    "sourceReference": "https://partner.example/authorized-feed"
  }
]
```

Ví dụ là schema, không phải hàng hóa thật. `commissionBps=1000` nghĩa là commission 10%; với share 0.7 thì hoàn **dự kiến** 7% nếu campaign, sản phẩm và đơn đủ điều kiện. Hàng hết hiệu lực/hết hàng không được hiển thị; commission chưa xác nhận không được quảng bá như mức hoàn chắc chắn. Sau mua vẫn cần đối soát báo cáo và ledger đã triển khai. Chưa có payout tiền thật tự động.

## Kiểm tra

```powershell
node --test tests/market-data.test.mjs tests/features.test.mjs tests/auth-validation.test.mjs tests/auth-navigation.test.mjs
node scripts/verify-feature-schema.mjs
npm run build
```

Browser test kiểm tra native file chooser, ảnh có lỗi trong batch, camera, cookie từ chối/tùy chỉnh/reload, header đã bỏ, định giá ghi nhãn rõ và catalog phân trang qua fixture tách biệt. Fixture không chứng minh Google, affiliate hay crawler đã kết nối thật.
