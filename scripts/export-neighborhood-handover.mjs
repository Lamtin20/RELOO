// Exports review artifacts only; never reads environment values or account data.
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { EVENTS, POPUPS, text } from "../lib/neighborhood/content.js";
const root = "output/neighborhood";
await mkdir(root, { recursive: true });
const recipients = {
  RESIDENCY_REQUESTED:
    "Người gửi hồ sơ; xác nhận đã ghi nhận yêu cầu. Nhân sự có quyền xem hàng chờ CRM, chưa có push/email riêng cho người duyệt.",
  RESIDENCY_UPDATED:
    "Chủ hồ sơ; kết quả, thu hồi, hết hạn hoặc thay đổi khu/tòa.",
  ITEM_MATCH: "Người đăng nhu cầu còn hiệu lực, đã bật nhận tin khớp nhu cầu.",
  NEED_MATCH:
    "Chủ đồ đang có sản phẩm hợp lệ, phù hợp khu/lịch và đã bật nhận tin khớp nhu cầu.",
  OFFER_NEW: "Người đăng nhu cầu nhận đề xuất; đề xuất chưa giữ lịch.",
  RENTAL_REQUESTED:
    "Chủ đồ và người thuê của đơn vừa commit; khi gửi bản nháp, thông báo hai bên.",
  OWNER_ACCEPTED: "Hai bên của đơn; chủ đồ chấp thuận trong hạn giữ lịch.",
  OWNER_REJECTED: "Hai bên của đơn; chủ đồ từ chối và có lý do.",
  HOLD_REMINDER:
    "Bên cần phản hồi/thanh toán; hold còn hạn và chưa được nhắc mốc này.",
  PAYMENT_PENDING:
    "Các bên tham gia đơn; trạng thái tiền đang chờ, không phải xác nhận đã thu.",
  PAYMENT_CONFIRMED:
    "Các bên tham gia đơn; đã có xác nhận tiền đúng luồng hiện hành.",
  PAYMENT_FAILED: "Người thuê; kết quả thanh toán sandbox thất bại.",
  ORDER_CONFIRMED:
    "Người thuê; tiền/cọc cần thiết đã xác nhận. Chủ đồ nhận sự kiện xác nhận tiền/cọc.",
  HANDOVER_REMINDER: "Các bên tham gia đơn; chuẩn bị hoặc tới mốc nhận đồ.",
  HANDOVER_COMPLETED:
    "Các bên tham gia đơn; đủ xác nhận và bằng chứng hai bên.",
  RETURN_REMINDER: "Các bên tham gia đơn; tới mốc trả hoặc đã yêu cầu trả.",
  EXTENSION_REQUESTED: "Chủ đồ; người thuê gửi gia hạn, hạn cũ chưa đổi.",
  EXTENSION_UPDATED:
    "Các bên tham gia đơn; kết quả duyệt/tiền bổ sung/áp dụng gia hạn.",
  OVERDUE:
    "Các bên tham gia đơn; quá hạn trả thực tế, trạng thái thuê gốc giữ nguyên.",
  RETURN_CONFIRMED:
    "Các bên tham gia đơn; đủ xác nhận trả và không có tranh chấp chặn hoàn tất.",
  DEPOSIT_UPDATED:
    "Các bên tham gia đơn; ghi nhận cọc/hoàn cọc, không tự khấu trừ.",
  REFUND_UPDATED:
    "Các bên tham gia đơn; báo hoàn và bên nhận xác nhận tiền hoàn trực tiếp.",
  ORDER_CANCELLED:
    "Các bên tham gia đơn; hủy hợp lệ/hết hold và đối soát tiền riêng.",
  DISPUTE_UPDATED:
    "Hai bên tham gia đơn; không đưa bằng chứng vào thông báo. Vận hành xem hàng chờ theo quyền, chưa gửi kênh ngoài riêng.",
  REVIEW_INVITED: "Người thuê của đơn hoàn tất; đánh giá gắn giao dịch thật.",
  PROMOTION:
    "Chỉ thành viên đồng ý quảng bá, theo eligibility của chương trình; catalog dự phòng, chưa có chiến dịch gửi thực tế.",
};
const md = (v) =>
  String(v ?? "—")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const events = Object.values(EVENTS).map((e) => ({
  ...e,
  recipientRule: recipients[e.id],
  titleVi: text("vi-VN", e.title),
  titleEn: text("en-US", e.title),
}));
if (events.some((e) => !e.recipientRule))
  throw Error("EVENT_RECIPIENT_DESCRIPTION_MISSING");
await writeFile(root + "/events.json", JSON.stringify(events, null, 2));
await writeFile(
  root + "/EVENT-NOTIFICATION-MATRIX.md",
  [
    "# Event và thông báo Nội Khu",
    "",
    "Xuất từ content registry. SQL ghi outbox trong cùng transaction; worker chỉ gửi sau commit. Event ID, correlation ID và aggregate ID được lưu trong outbox. Đường dẫn luôn tải lại resource hiện hành và kiểm tra quyền.",
    "",
    "| Event | Người nhận / điều kiện | Tiêu đề vi-VN / en-US | Loại; ưu tiên; TTL | Deep link |",
    "|---|---|---|---|---|",
    ...events.map(
      (e) =>
        `| ${e.id} | ${md(e.recipientRule)} | ${md(e.titleVi)} / ${md(e.titleEn)} | ${e.category}; ${e.priority}; ${e.ttlHours}h | ${md(e.deepLink)} |`,
    ),
    "",
    "Kênh đang hoạt động: in-app. Push/email/SMS chưa có transport/enrollment thực; adapter từ chối khi thiếu consent hoặc idempotency. Thông báo Nội Khu không đi qua email trigger chung.",
    "",
    "Tin giao dịch cần thiết không bị chặn bởi quiet hours/cap quảng bá. Tin match/marketing mặc định tắt; kiểm tra lại opt-in, quiet hours (mặc định 22:00–07:00 Việt Nam) và daily cap cấu hình. Tin hết TTL/không còn phù hợp bị bỏ; cap dời tới ngày sau, quiet dời một giờ. Không xóa thông báo cũ để giả thành trạng thái mới.",
    "",
    "Dedup: khóa nghiệp vụ + người nhận khi emit, notification ID duy nhất khi deliver. Retry lỗi nội bộ: tối đa 5 lần, backoff min(3600, 30 × 2^attempts) giây; sau đó DEAD và admin retry. Không retry mù một cuộc gọi có thể đã tính phí.",
    "",
    "Nội dung lock-screen an toàn: không OTP, số căn hộ, giấy tờ, ảnh bằng chứng, thông tin tài chính nhạy cảm. Body hiện yêu cầu mở ứng dụng xem trạng thái hiện tại; không khẳng định còn lịch khi người dùng bấm tin cũ.",
  ].join("\n"),
);
const triggers = {
  location: "Người dùng bấm gợi ý vị trí; có lựa chọn thủ công.",
  denied: "Không cấp GPS hoặc GPS không dùng được.",
  selection: "Chọn khu đang xem/nơi sống, giải thích không tự xác minh.",
  unsupported: "Khu chưa có danh mục đã duyệt.",
  verify: "Gửi/tra cứu xác minh cư trú.",
  booking: "Xác nhận báo giá và snapshot trước đặt.",
  conflict: "Lịch bị chiếm tại thời điểm commit.",
  expired: "Chủ đồ/thanh toán quá hạn hold.",
  payment: "Ghi nhận thanh toán trực tiếp hoặc kết quả chưa rõ.",
  cancellation: "Hủy theo chính sách đã snapshot.",
  pickup: "Nhận/trả đồ; checklist riêng từng món.",
  damage: "Thiếu phụ kiện hoặc sai tình trạng.",
  extension: "Gia hạn cần duyệt và tiền bổ sung trước đổi hạn.",
  dispute: "Báo sự cố, lưu bằng chứng và chuyển hỗ trợ.",
  promotion: "Không đủ điều kiện ưu đãi.",
  network: "Mất mạng/timeout; kiểm tra trạng thái trước gửi lại.",
  session: "Phiên hết hạn, yêu cầu đăng nhập lại.",
  duplicate: "Gửi trùng hoặc fingerprint khác cùng operation key.",
};
const popups = Object.entries(POPUPS).map(([id, p]) => ({
  id,
  ...p,
  trigger: triggers[id] || "Theo tình huống trong registry",
  vi: {
    title: text("vi-VN", p.title),
    body: text("vi-VN", p.body),
    primary: text("vi-VN", p.primary),
    secondary: p.secondary ? text("vi-VN", p.secondary) : null,
  },
  en: {
    title: text("en-US", p.title),
    body: text("en-US", p.body),
    primary: text("en-US", p.primary),
    secondary: p.secondary ? text("en-US", p.secondary) : null,
  },
}));
await writeFile(root + "/popups.json", JSON.stringify(popups, null, 2));
await writeFile(
  root + "/POPUP-CATALOG.md",
  [
    "# Nội dung hướng dẫn và popup",
    "",
    "Registry là nguồn nội dung, không có nghĩa mọi tình huống đều mở modal. Lỗi trường dùng inline validation, phản hồi nhẹ dùng status/notice, quyết định nghiệp vụ dùng dialog. CTA không khả dụng phải giải thích chính xác.",
    "",
    "| ID / tình huống | Tiêu đề / giải thích vi-VN | CTA chính / phụ | Mức / đóng |",
    "|---|---|---|---|",
    ...popups.map(
      (p) =>
        `| ${md(p.id + " — " + p.trigger)} | ${md(p.vi.title + " — " + p.vi.body)} | ${md(p.vi.primary)} / ${md(p.vi.secondary)} | ${p.level} / ${p.close} |`,
    ),
    "",
    "Bản en-US và khóa nội dung đầy đủ ở popups.json. Nội dung bàn giao không thay checklist và bằng chứng hai bên. Trạng thái thanh toán chưa rõ không báo thành công. Không đủ GPS vẫn chọn khu thủ công được.",
  ].join("\n"),
);
async function walk(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? walk(path + "/" + e.name) : [path + "/" + e.name],
      ),
    )
  ).flat();
}
const modules = (
  await Promise.all(
    [
      "lib/neighborhood",
      "components/neighborhood",
      "app/noi-khu",
      "app/api/neighborhood",
      "app/api/crm/neighborhood",
    ].map(walk),
  )
).flat();
const sql = (await readdir("deploy/vietnam"))
  .filter((n) => n === "neighborhood.sql" || n.startsWith("neighborhood-"))
  .map((n) => "deploy/vietnam/" + n);
const extra = [
  "docs/NEIGHBORHOOD_IMPLEMENTATION.md",
  "docs/NEIGHBORHOOD_OPERATIONS.md",
  "tests/neighborhood-fixture.mjs",
  "tests/neighborhood.test.mjs",
  "tests/neighborhood-safety.test.mjs",
  "scripts/neighborhood-test.mjs",
  "scripts/verify-neighborhood-api.mjs",
  "scripts/verify-neighborhood-postgres.mjs",
  "scripts/verify-neighborhood-production.mjs",
  "scripts/export-neighborhood-handover.mjs",
  "scripts/finalize-neighborhood-handover.mjs",
];
const integrations = [
  "lib/operations/access.js",
  "lib/operations/navigation.js",
  "lib/operations/trace.js",
  "components/owner/CrmWorkspace.jsx",
  "components/layout/Header.jsx",
  "components/mobile/MarketHome.jsx",
  "scripts/operations-worker.mjs",
  "next.config.mjs",
  "package.json",
  "package-lock.json",
  ".gitignore",
  ".env.example",
  "tsconfig.json",
  "README.md",
];
const inventory = await Promise.all(
  [...modules, ...sql, ...extra, ...integrations].sort().map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    kind: integrations.includes(path)
      ? "existing integration; contains other workspace work"
      : "feature module/migration/test/docs",
  })),
);
await writeFile(root + "/files.json", JSON.stringify(inventory, null, 2));
await writeFile(
  root + "/FILES.md",
  [
    "# Danh mục file",
    "",
    "Danh mục scoped, không phải danh sách toàn bộ thay đổi từ các tác vụ trước. Hash ở files.json dùng đối chiếu nội dung hiện tại; không có giá trị cấu hình bí mật. SSOT cha được bổ sung mục 41 tại ../RELOO_Master_Specification_v2.0.md.",
    "",
    ...inventory.map((f) => `- \`${f.path}\` — ${f.kind}`),
  ].join("\n"),
);
console.log(
  `Exported ${events.length} events, ${popups.length} popup definitions and ${inventory.length} file records.`,
);
