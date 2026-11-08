import test from "node:test";
import assert from "node:assert/strict";
import { parseCheckScam, parseChongLuaDao, identifierScreeningStatus } from "../lib/security/source-results.js";
import { normalizeIdentifier, lookupLinks } from "../lib/security/identifiers.js";
import { encryptPrivate, decryptPrivate, privateHash } from "../lib/operations/crypto.js";
import { parseForecast } from "../lib/weather.js";
import { clientIp, readMultipart } from "../lib/server/http.js";
import { traceRoute } from "../lib/operations/trace.js";
process.env.RELOO_PRIVATE_DATA_KEY = "a1".repeat(32);
test("public website warnings require a count and the queried identity", () => {
  assert.equal(parseCheckScam("Có 2 cảnh báo liên quan đến 0567832024", "0567832024", "https://checkscam.vn/").status, "MATCH");
  assert.equal(parseCheckScam("Có 2 cảnh báo liên quan đến 0987654321", "0567832024", "https://checkscam.vn/").status, "UNKNOWN");
  assert.equal(parseCheckScam("Có 0 cảnh báo liên quan đến 0567832024", "0567832024", "https://checkscam.vn/").status, "UNKNOWN");
});
test("not found and unreadable pages cannot become a fraud match", () => {
  assert.equal(parseChongLuaDao("iCallme KHÔNG TÌM THẤY Scam.vn KHÔNG TÌM THẤY", "https://chongluadao.vn/", "misc").status, "NO_MATCH");
  assert.equal(parseChongLuaDao("Mô tả không đủ dữ kiện", "https://chongluadao.vn/", "misc").status, "UNKNOWN");
  assert.equal(parseChongLuaDao("Dịch vụ ẩn danh Có", "https://chongluadao.vn/", "ip").network, "ANONYMOUS");
  assert.equal(parseChongLuaDao("Dịch vụ ẩn danh Không", "https://chongluadao.vn/", "ip").network, "ORDINARY");
});
test('phone policy accepts both negative cards, requires matching input and preserves positive warnings', () => {
  const accepted = { ...parseChongLuaDao('iCallme KHÔNG TÌM THẤY Scam.vn KHÔNG TÌM THẤY', 'https://chongluadao.vn/analyze/?q=0912345678&type=misc', 'phone'), matchedInput: true };
  assert.equal(identifierScreeningStatus([{ source: 'checkscam', status: 'UNAVAILABLE' }, accepted], 'PHONE'), 'NO_MATCH');
  assert.equal(identifierScreeningStatus([accepted], 'BANK'), 'UNKNOWN');
  assert.equal(identifierScreeningStatus([{ ...accepted, matchedInput: false }], 'PHONE'), 'UNKNOWN');
  assert.equal(identifierScreeningStatus([{ ...accepted, expiresAt: '2000-01-01' }], 'PHONE'), 'STALE');
  assert.equal(identifierScreeningStatus([accepted, { source: 'checkscam', status: 'MATCH' }], 'PHONE'), 'MATCH');
  assert.equal(parseChongLuaDao('iCallme KHÔNG TÌM THẤY', 'https://chongluadao.vn/', 'phone').status, 'UNKNOWN');
});
test("bank identity includes bank scope and lookup URLs encode input", () => {
  assert.throws(() => normalizeIdentifier("BANK", "27792771", ""));
  assert.equal(normalizeIdentifier("BANK", "2779 2771", "vcb").bankCode, "VCB");
  assert.notEqual(privateHash("BANK:VCB", "27792771"), privateHash("BANK:TCB", "27792771"));
  assert.equal(new URL(lookupLinks("EMAIL", "a+b@example.com").chongluadao).searchParams.get("q"), "a+b@example.com");
});
test("private evidence encrypts with authenticated randomized encryption", () => {
  const first = encryptPrivate("fixture-only"), second = encryptPrivate("fixture-only");
  assert.notEqual(first, second); assert.equal(decryptPrivate(first), "fixture-only");
  const bytes = Buffer.from(first, "base64"); bytes[30] ^= 1;
  assert.throws(() => decryptPrivate(bytes.toString("base64")));
});
test("Windy units are explicit and missing temperature never becomes zero", () => {
  assert.equal(parseForecast({ ts: [1000], units: { "temp-surface": "K" }, "temp-surface": [300.15] }, 1000).temperature, 27);
  assert.throws(() => parseForecast({ ts: [1000], "temp-surface": [null] }));
  assert.throws(() => parseForecast({ ts: [1000], units: { "temp-surface": "unknown" }, "temp-surface": [30] }));
});
test("untrusted forwarded IPs and trace query data are excluded", () => {
  process.env.TRUST_PROXY = "false"; process.env.RELOO_EDGE_SECRET = "edge-fixture";
  assert.equal(clientIp(new Request("https://reloo.vn", { headers: { "x-forwarded-for": "1.2.3.4", "x-reloo-client-ip": "1.2.3.4" } })), null);
  assert.equal(clientIp(new Request("https://reloo.vn", { headers: { "x-reloo-edge": "edge-fixture", "x-reloo-client-ip": "1.2.3.4" } })), "1.2.3.4");
  assert.equal(traceRoute("/api/auth/google?token=secret"), "/api/auth/google");
});
test("multipart limits apply even without a content length header", async () => {
  const request = new Request("https://reloo.vn/api/kyc", { method: "POST", body: new Uint8Array(500), headers: { "content-type": "multipart/form-data; boundary=test" } });
  await assert.rejects(() => readMultipart(request, 100), (error) => error.status === 413);
});
