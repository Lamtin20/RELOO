// Local packaging only. Never reads real environment secrets or deploys anything.
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const out = "output/rental-care";
async function text(path) {
  const b = await readFile(path);
  return (
    b[0] === 255 && b[1] === 254 ? b.toString("utf16le") : b.toString("utf8")
  ).replace(/^\uFEFF/, "");
}
async function result(path) {
  return JSON.parse(
    (await text(path))
      .split("### Result")[1]
      .split("### Ran Playwright code")[0]
      .trim(),
  );
}
const http = JSON.parse(await text(out + "/http-results.json")),
  production = JSON.parse(await text(out + "/production-isolation.json")),
  lint = JSON.parse(await text(out + "/eslint.json")),
  browser = await result(out + "/browser-results.log"),
  visual = await result(out + "/visual-results.log");
assert.equal(http.checks.length, 12);
assert.ok(http.checks.every((c) => c.result === "PASS"));
assert.equal(production.checks.length, 13);
assert.ok(production.checks.every((c) => c.result === "PASS"));
assert.equal(
  lint.reduce((n, f) => n + f.errorCount + f.warningCount, 0),
  0,
);
assert.equal(browser.checks.length, 9);
assert.ok(visual.checks.length >= 3);
const regression = await text(out + "/regression.tap"),
  build = await text(out + "/build.log"),
  android = await text(out + "/android-compile.log");
assert.match(regression, /tests 42/);
assert.match(regression, /pass 42/);
assert.match(regression, /fail 0/);
assert.ok(build.includes("Finalizing page optimization"));
assert.match(android, /BUILD SUCCESSFUL/);
await writeFile(
  out + "/browser-results.json",
  JSON.stringify({ ...browser, visual }, null, 2),
);
async function walk(path) {
  return (
    await Promise.all(
      (await readdir(path, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(path + "/" + e.name) : [path + "/" + e.name],
      ),
    )
  ).flat();
}
const roots = [
  "lib/rental-care",
  "lib/personalization",
  "components/rental-care",
  "app/api/rental-care",
  "app/api/personalization",
  "app/account/calendar",
  "app/account/personalization",
];
const extra = [
  "lib/mobile/calendar.js",
  "deploy/vietnam/rental-care.sql",
  "deploy/vietnam/personalization.sql",
  "deploy/vietnam/neighborhood-functions.sql",
  "docs/RENTAL_CARE_PERSONALIZATION.md",
  "docs/RENTAL_CARE_OPERATIONS.md",
  "tests/rental-care.test.mjs",
  "tests/rental-care-fixture.mjs",
  "scripts/rental-care-test.mjs",
  "scripts/verify-rental-care-api.mjs",
  "scripts/verify-rental-care-production.mjs",
  "scripts/finalize-rental-care-handover.mjs",
];
const integrations = [
  "app/layout.js",
  "app/account/page.js",
  "app/explore/page.js",
  "app/product/[id]/page.js",
  "app/rent/[id]/page.js",
  "components/mobile/MarketHome.jsx",
  "components/mobile/AppAccount.jsx",
  "components/mobile/NativeBridge.jsx",
  "components/listings/ListingCard.jsx",
  "components/listings/ListingImage.jsx",
  "components/neighborhood/Neighborhood.jsx",
  "components/privacy/CookieConsent.jsx",
  "components/search/SearchBox.jsx",
  "lib/hooks/useMarketplaceFollows.js",
  "lib/neighborhood/server.js",
  "lib/search-history.js",
  "lib/user-preferences.js",
  "scripts/operations-worker.mjs",
  "next.config.mjs",
  "package.json",
  "tsconfig.json",
  ".gitignore",
  ".env.example",
  "README.md",
];
const native = [
  "mobile/android/app/src/main/AndroidManifest.xml",
  "mobile/android/app/src/main/java/vn/reloo/app/MainActivity.java",
  "mobile/android/app/src/main/java/vn/reloo/app/RelooCalendarPlugin.java",
  "mobile/android/app/src/main/java/vn/reloo/app/RelooCalendarEngine.java",
  "mobile/android/app/src/main/java/vn/reloo/app/RelooCalendarJob.java",
  "mobile/ios/App/App/SceneDelegate.swift",
  "mobile/ios/App/App/AppDelegate.swift",
  "mobile/ios/App/App/Info.plist",
  "mobile/ios/App/App/vi.lproj/InfoPlist.strings",
  "mobile/ios/App/App/en.lproj/InfoPlist.strings",
  "mobile/ios/App/App.xcodeproj/project.pbxproj",
];
const paths = [
  ...new Set([
    ...(await Promise.all(roots.map(walk))).flat(),
    ...extra,
    ...integrations,
    ...native,
  ]),
].sort();
const files = await Promise.all(
  paths.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(path))
      .digest("hex"),
    scope: integrations.includes(path)
      ? "integration; also contains earlier workspace work"
      : native.includes(path)
        ? "native source/configuration"
        : "feature source/migration/test/docs",
  })),
);
await writeFile(out + "/files.json", JSON.stringify(files, null, 2));
await writeFile(
  out + "/FILES.md",
  [
    "# Danh mục file",
    "",
    "Scoped inventory, không phải toàn bộ dirty tree. SSOT cha được bổ sung mục 42 trong ../RELOO_Master_Specification_v2.0.md. Không có .env.local, token, runtime.secret.json hoặc database test trong danh mục.",
    "",
    ...files.map((f) => "- `" + f.path + "` — " + f.scope),
  ].join("\n"),
);
const chunks = (await walk(".next/static")).filter((p) => p.endsWith(".js"));
const secretMarkers = ["RELOO_CALENDAR_CLIENT_SECRET", "credentials_encrypted"];
const hits = [];
for (const path of chunks) {
  const data = await text(path);
  for (const marker of secretMarkers)
    if (data.includes(marker)) hits.push({ path, marker });
}
assert.equal(
  hits.length,
  0,
  "Calendar server-only markers leaked into static JS",
);
const summary = {
  packagedAt: new Date().toISOString(),
  mode: "LOCAL TEST; no production deployment",
  regression: { pass: 42, fail: 0 },
  http,
  production,
  browser,
  visual,
  lint: { errors: 0, warnings: 0 },
  build: "PASS",
  androidCompile: "PASS; no phone calendar access",
  ios: "SOURCE/PLIST/PROJECT CHECKED; NOT XCODE BUILT",
  staticCalendarSecretMarkers: hits,
  externalCalendarApiCalls: 0,
  realDeviceCalendarWrites: 0,
};
await writeFile(
  out + "/verification-summary.json",
  JSON.stringify(summary, null, 2),
);
const gallery = [
  ["rental-care-calendar-desktop.png", "Lịch và nhắc hạn · desktop"],
  [
    "rental-care-personalization-desktop.png",
    "Cá nhân hóa và đề xuất · desktop",
  ],
  [
    "rental-care-calendar-mobile-vi-viewport.png",
    "Calendar · mobile tiếng Việt",
  ],
  [
    "rental-care-personalization-mobile-vi-viewport.png",
    "Sở thích · mobile tiếng Việt",
  ],
  ["rental-care-recommendations-mobile-vi.png", "Dành cho bạn · mobile"],
  ["rental-care-reset-dialog-mobile-en.png", "Xác nhận xóa · keyboard focus"],
  ["rental-care-calendar-mobile-en-viewport.png", "Calendar · mobile English"],
  [
    "rental-care-personalization-mobile-en.png",
    "Personalization · mobile English",
  ],
  ["rental-care-reauth-mobile-vi.png", "Cần cấp lại quyền"],
];
for (const [name] of gallery) await stat("output/playwright/" + name);
await writeFile(
  out + "/index.html",
  `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RELOO · Rental Care và cá nhân hóa</title><style>*{box-sizing:border-box}body{margin:0;background:#eef5f0;color:#193e30;font:16px/1.65 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 22px}header,.docs{background:white;padding:28px;border:1px solid #d4e5da;border-radius:18px}h1{font-size:clamp(28px,4vw,44px);line-height:1.2}h2{margin-top:32px}.label{font-size:12px;color:#936018;font-weight:700;letter-spacing:.08em}.metrics,.links{display:flex;flex-wrap:wrap;gap:15px}.metrics span{background:#e7f5ec;padding:10px 15px;border-radius:10px}.links{margin-top:22px}a{color:#00785a;text-underline-offset:4px}.notice{background:#fff6dc;padding:20px;border:1px solid #e9d69b;border-radius:12px}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}figure{margin:0;background:white;border:1px solid #d4e5da;border-radius:14px;overflow:hidden}figure a{display:block;height:330px;padding:12px;background:#e3ece6}figure img{width:100%;height:100%;object-fit:contain}figcaption{padding:14px;font-weight:600}.docs li{margin:10px 0}small{color:#617b6d}</style><main><header><span class="label">TEST WORKSPACE · CHƯA DEPLOY PRODUCTION</span><h1>Rental Care và cá nhân hóa</h1><p>Lịch nhắc trả theo trạng thái đơn thật. Đề xuất theo lựa chọn đồng ý, có lý do và quyền xóa/đặt lại.</p><div class="metrics"><span><strong>42/42</strong> regression</span><span><strong>12/12</strong> HTTP</span><span><strong>9</strong> nhóm browser checks</span><span>Android compile đạt</span></div><nav class="links"><a href="http://127.0.0.1:4520/account/calendar">Mở bản test lịch</a><a href="http://127.0.0.1:4520/account/personalization">Mở bản test đề xuất</a><a href="ACCEPTANCE.md">Báo cáo 15 ca</a></nav></header><h2>Trạng thái tích hợp</h2><p class="notice">Google OAuth/Calendar và ghi lịch điện thoại chưa nghiệm thu thật. Google transport và device receipt được mô phỏng có nhãn; Android đã compile, iOS chưa build bằng Xcode. Cần staging HTTPS, cấu hình OAuth và grant/thiết bị phù hợp. Không chuyển tiền, gửi email hay ghi vào lịch cá nhân trong các test này.</p><h2>Giao diện đã kiểm tra</h2><p>Ảnh từ trình duyệt thật với dữ liệu TEST; placeholder hình sản phẩm là có chủ đích trong fixture. Ảnh viewport tránh hiện tượng thanh fixed ở giữa ảnh full-page.</p><div class="gallery">${gallery.map(([name, title]) => `<figure><a href="../playwright/${name}" target="_blank" rel="noopener"><img loading="lazy" src="../playwright/${name}" alt="${title}"></a><figcaption>${title}</figcaption></figure>`).join("")}</div><h2>Hồ sơ bàn giao</h2><div class="docs"><ul><li><a href="ACCEPTANCE.md">Phạm vi, kết quả thật/mô phỏng và ma trận 15 yêu cầu</a></li><li><a href="../../docs/RENTAL_CARE_OPERATIONS.md">Cấu hình, migration, lifecycle, privacy, chạy và rollback</a></li><li><a href="FILES.md">Danh mục file đã xây dựng/tích hợp</a></li><li><a href="verification-summary.json">Receipts tổng hợp</a></li></ul></div><p><small>Không public cả thư mục output hoặc các file khóa/database test. Preview này không phải hệ thống production đã được bật.</small></p></main></html>`,
);
console.log(
  "Packaged",
  files.length,
  "scoped files and",
  gallery.length,
  "verified screenshot links.",
);
