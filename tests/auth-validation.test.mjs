import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhone } from "../lib/phone.js";
import { passwordChecks, validatePassword } from "../lib/password-policy.js";
import {
  validateSignupInput,
  validateProfileInput,
} from "../lib/auth/validation.js";

test("Vietnam mobile prefixes and international forms normalize consistently", () => {
  for (const phone of [
    "0831234567",
    "+84 83 123 45 67",
    "84831234567",
    "0084831234567",
  ])
    assert.equal(normalizePhone(phone), "0831234567");
  for (const phone of [
    "0711234567",
    "0111234567",
    "02812345678",
    "831234567",
    "+16502530000",
    "call 0831234567",
    "0831234567 ext.12",
    "08312345678",
  ])
    assert.equal(normalizePhone(phone), null, phone);
});
test("exactly eight characters pass only with uppercase, digit and special character", () => {
  assert.equal(validatePassword("Abcdef1!"), null);
  assert.equal(validatePassword("Đabcde1!"), null);
  assert.equal(validatePassword("ABCD123!"), null);
  for (const password of [
    "Abcde1!",
    "abcdef1!",
    "Abcdefg!",
    "Abcdef12",
    "Abcdef1 ",
    "",
    "A1!" + "x".repeat(126),
  ])
    assert.notEqual(validatePassword(password), null, password.length);
  assert.equal(
    passwordChecks("Abcdef1!").every((check) => check.passed),
    true,
  );
});
test("signup validates credentials before any external call", () => {
  const input = {
    name: "Test Account",
    email: "Test@Example.invalid",
    phone: "+84 83 123 45 67",
    password: "Abcdef1!",
    role: "both",
    agree: true,
  };
  const result = validateSignupInput(input);
  assert.equal(result.phone, "0831234567");
  assert.equal(result.email, "test@example.invalid");
  for (const patch of [
    { password: "abcdef1!" },
    { phone: "0711234567" },
    { role: "admin" },
    { agree: false },
    { email: "invalid" },
  ])
    assert.throws(
      () => validateSignupInput({ ...input, ...patch }),
      (error) => error.status === 400,
    );
});
test("Google profile completion cannot grant an administrative role", () => {
  const input = {
    name: "Google User",
    phone: "0831234567",
    role: "lender",
    agree: true,
  };
  assert.equal(validateProfileInput(input).role, "lender");
  assert.throws(() => validateProfileInput({ ...input, role: "admin" }));
  assert.throws(() => validateProfileInput({ ...input, agree: false }));
});
