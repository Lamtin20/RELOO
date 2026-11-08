// Local artifact packaging only. No deployment, credentials or provider calls.
import { readFile, writeFile, copyFile, stat } from "node:fs/promises";
import { join } from "node:path";
import assert from "node:assert/strict";
const out = "output/neighborhood";
const readText = async (path) => {
  const b = await readFile(path);
  return (
    b[0] === 255 && b[1] === 254 ? b.toString("utf16le") : b.toString("utf8")
  ).replace(/^\uFEFF/, "");
};
const cliResult = async (path) =>
  JSON.parse(
    (await readText(path))
      .split("### Result")[1]
      .split("### Ran Playwright code")[0]
      .trim(),
  );
const browser = await cliResult(out + "/browser-record.log");
browser.states = await cliResult(out + "/browser-states.log");
await writeFile(out + "/browser-checks.json", JSON.stringify(browser, null, 2));
const latest = JSON.parse(
  await readText("output/neighborhood-test/latest.json"),
);
await copyFile(
  join(latest.root, "api-results.json"),
  out + "/api-results.json",
);
const api = JSON.parse(await readText(out + "/api-results.json"));
assert.equal(api.checks.length, 13);
assert.ok(api.checks.every((c) => c.result === "PASS"));
const pg = JSON.parse(await readText(out + "/postgres-concurrency.json"));
const production = JSON.parse(
  await readText(out + "/production-isolation.json"),
);
const lint = JSON.parse(await readText("output/neighborhood-eslint.json"));
const regression = await readText(out + "/regression.tap");
const build = await readText(out + "/build.log");
assert.match(regression, /tests 29/);
assert.match(regression, /pass 29/);
assert.match(regression, /fail 0/);
assert.equal(pg.checks.length, 6);
assert.ok(pg.checks.every((c) => c.result === "PASS"));
assert.equal(production.checks.length, 5);
assert.ok(production.checks.every((c) => c.result === "PASS"));
assert.equal(
  lint.reduce((n, f) => n + f.errorCount + f.warningCount, 0),
  0,
);
assert.match(build, /Generating static pages.*133\/133/);
assert.ok(browser.checks.length >= 5);
assert.equal(browser.states.retry, "PASS");
const summary = {
  packagedAt: new Date().toISOString(),
  mode: "LOCAL TEST — not deployed",
  regression: { pass: 29, fail: 0 },
  http: api,
  postgres: pg,
  productionGuards: production,
  lint: { errors: 0, warnings: 0 },
  build: {
    result: "PASS",
    log: "build.log",
    modifiedAt: (await stat(out + "/build.log")).mtime.toISOString(),
  },
  browser,
  externalMessages: 0,
  realPayments: 0,
};
await writeFile(
  out + "/verification-summary.json",
  JSON.stringify(summary, null, 2),
);
const gallery = [
  ["neighborhood-home-desktop.png", "Trang Nội Khu · desktop"],
  ["neighborhood-home-mobile-viewport.png", "Trang Nội Khu · mobile"],
  ["neighborhood-search-mobile.png", "Chọn lịch thuê trên mobile"],
  ["neighborhood-quote-final-desktop.png", "Báo giá và chính sách · desktop"],
  ["neighborhood-quote-final-mobile.png", "Báo giá · mobile"],
  ["neighborhood-quote-policy-mobile.png", "Chính sách và xác nhận"],
  ["neighborhood-listing-preview-mobile.png", "Chủ đồ xem trước tin đăng"],
  ["neighborhood-owner-mobile.png", "Khu vực chủ đồ"],
  ["neighborhood-order-desktop.png", "Đơn thuê · desktop"],
  ["neighborhood-order-mobile.png", "Đơn thuê · mobile"],
  ["neighborhood-admin-desktop.png", "Vận hành Nội Khu"],
  ["neighborhood-admin-mobile.png", "Vận hành trên mobile"],
  ["neighborhood-mobile-en.png", "Giao diện tiếng Anh"],
  ["neighborhood-empty-mobile.png", "Không có sản phẩm phù hợp"],
  ["neighborhood-error-mobile.png", "Mất mạng và thử lại"],
  ["neighborhood-loading-mobile.png", "Đang tải"],
];
for (const [file] of gallery) await stat("output/playwright/" + file);
await writeFile(
  out + "/index.html",
  `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RELOO Nội Khu · Bàn giao bản test</title><style>
 *{box-sizing:border-box}body{margin:0;background:#edf4ef;color:#193f31;font:16px/1.65 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:36px 22px}a{color:#007d5e;text-underline-offset:4px}header{padding:30px;background:#fff;border:1px solid #d3e2d8;border-radius:20px}h1{font-size:clamp(28px,4vw,44px);line-height:1.2;margin:14px 0}h2{margin:32px 0 14px}.label{font-size:12px;letter-spacing:.07em;font-weight:700;color:#956019}.metrics{display:flex;flex-wrap:wrap;gap:14px;margin:24px 0}.metrics span{padding:10px 15px;background:#e4f2e9;border-radius:10px}.links{display:flex;gap:20px;flex-wrap:wrap}.notice{padding:18px;background:#fff7de;border-radius:12px;border:1px solid #e4d5a4}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}figure{margin:0;background:#fff;border:1px solid #d3e2d8;border-radius:14px;overflow:hidden}figure a{display:block;background:#e2eae6;height:330px;padding:12px}figure img{width:100%;height:100%;object-fit:contain}figcaption{padding:14px;font-weight:600}.docs{background:#fff;padding:24px;border-radius:14px}.docs li{margin:8px 0}small{color:#577465}
 </style><main><header><span class="label">MÔI TRƯỜNG TEST · CHƯA TRIỂN KHAI PRODUCTION</span><h1>RELOO Nội Khu</h1><p>Thuê gần nhà, dùng ngay khi cần.</p><p>Bản tích hợp trong RELOO: danh mục khu/tòa, cư trú, đăng đồ, nhu cầu và đề xuất, đặt thuê, bàn giao, thông báo và CRM.</p><div class="metrics"><span><strong>29/29</strong> regression</span><span><strong>13/13</strong> HTTP</span><span><strong>6/6</strong> PostgreSQL đồng thời</span><span>Build và lint đạt</span></div><nav class="links"><a href="http://127.0.0.1:4518/noi-khu">Mở ứng dụng test</a><a href="ACCEPTANCE.md">Báo cáo kiểm tra</a><a href="../../docs/NEIGHBORHOOD_OPERATIONS.md">Hướng dẫn vận hành</a></nav></header>
 <h2>Phần cần cấu hình trước khi chạy thực tế</h2><p class="notice">Chưa có Supabase staging/Auth thực, dữ liệu khu được cấp quyền và duyệt, provider thanh toán Nội Khu hay transport push/email/SMS. Hiện dùng in-app, ghi nhận thanh toán trực tiếp và sandbox riêng. Không gửi tin cho người thật, không giữ tiền, không tạo app native mới.</p>
 <h2>Ảnh chụp giao diện thật</h2><p>Ảnh từ trình duyệt test; tên, giá và hình upload đều là dữ liệu TEST. Ảnh đơn sắc chỉ kiểm tra pipeline upload. Ảnh dài mobile có thể hiển thị thanh cố định giữa trang do cơ chế chụp full-page; ảnh viewport thể hiện vị trí thực.</p><div class="gallery">${gallery.map(([file, title]) => `<figure><a href="../playwright/${file}" target="_blank" rel="noopener"><img loading="lazy" src="../playwright/${file}" alt="${title}"></a><figcaption>${title}</figcaption></figure>`).join("")}</div>
 <h2>Hồ sơ bàn giao</h2><div class="docs"><ul><li><a href="ACCEPTANCE.md">Phạm vi, 20 tình huống, giới hạn và kết quả thực tế</a></li><li><a href="FILES.md">Module, tích hợp, migration và danh mục file</a></li><li><a href="../../docs/NEIGHBORHOOD_OPERATIONS.md">Sơ đồ luồng, bảng trạng thái, nguồn dữ liệu, cấu hình và rollout/rollback</a></li><li><a href="EVENT-NOTIFICATION-MATRIX.md">26 event và ma trận thông báo</a></li><li><a href="POPUP-CATALOG.md">18 tình huống hướng dẫn, nội dung vi/en</a></li><li><a href="verification-summary.json">Tổng hợp receipts kiểm thử</a></li></ul></div><p><small>Chỉ là bàn giao trong workspace. Không có tài khoản cư dân, giấy tờ, OTP hoặc khóa API trong các file này.</small></p></main></html>`,
);
console.log("Packaged verified local handover and 16 screenshot links.");
