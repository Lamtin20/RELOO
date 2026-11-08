import test from "node:test";
import assert from "node:assert/strict";
import {
  authLink,
  safeNextPath,
  oauthMessage,
} from "../lib/auth-navigation.js";

test("auth navigation keeps local rental work and rejects external redirects", () => {
  assert.equal(
    safeNextPath("/rent/listing_001?date=2026-10-10"),
    "/rent/listing_001?date=2026-10-10",
  );
  for (const value of [
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/\nevil.example",
    null,
  ])
    assert.equal(safeNextPath(value, "/safety"), "/safety");
});
test("switching registration and login preserves intent and draft destination", () => {
  const url = new URL(
    authLink("/auth/register", "/lend", "lender"),
    "https://reloo.vn",
  );
  assert.equal(url.searchParams.get("next"), "/lend");
  assert.equal(url.searchParams.get("intent"), "lender");
  assert.equal(authLink("/auth", "https://evil.example", "admin"), "/auth");
});
test("OAuth callback messages never reflect arbitrary provider/query errors", () => {
  assert.match(oauthMessage("oauth_cancelled"), /đăng nhập/);
  assert.equal(oauthMessage("__proto__"), "");
  assert.equal(oauthMessage("constructor"), "");
  assert.equal(oauthMessage("<script>"), "");
});

