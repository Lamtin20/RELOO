import test from "node:test";
import assert from "node:assert/strict";
import { evaluateVnptResults } from "../lib/kyc/vnpt.js";
import { validChallenge } from "../lib/kyc/challenge.js";
import {
  holderNamesMatch,
  validateAddress,
} from "../lib/profile/validation.js";
import { validateEntity } from "../lib/operations/settings.js";
const fixture = () => ({
  ocr: {
    id: "012345678901",
    name: "TRAN VAN AN",
    birth_day: "01/01/1990",
    valid_date: "01/01/2030",
    msg: "OK",
    msg_back: "OK",
    id_fake_warning: "no",
    expire_warning: "no",
    back_expire_warning: "no",
    tampering: { is_legal: "yes", warning: [] },
    name_prob: 0.99,
    birth_day_prob: 0.99,
    id_probs: Array(12).fill(0.99),
  },
  compare: { msg: "MATCH", prob: 90 },
  frontCard: {
    liveness: "success",
    face_swapping: false,
    fake_liveness: false,
  },
  backCard: { liveness: "success", face_swapping: false, fake_liveness: false },
  faceLive: { liveness: "success" },
  activeLive: { status: "PASSED",provider:'VNPT',serverVerified:true },
});
test("face percent alone cannot approve forged, mismatched, low confidence or absent live evidence", () => {
  assert.equal(evaluateVnptResults(fixture(), "012345678901").eligible, true);
  for (const score of [80, 79, null, undefined, 101, "invalid"]) {
    const input = fixture();
    input.compare.prob = score;
    assert.equal(evaluateVnptResults(input).eligible, false);
  }
  const mutations = [
    (input) => (input.compare.msg = "NOMATCH"),
    (input) => (input.activeLive = { status: "NOT_ESTABLISHED" }),
    (input) => (input.activeLive = {status:'PASSED',certified:false}),
    (input) => (input.frontCard.fake_liveness = true),
    (input) => (input.ocr.tampering.is_legal = "no"),
    (input) => (input.ocr.name_prob = 0.5),
    (input) => (input.ocr.id_probs[8] = 0.6),
    (input) => (input.ocr.birth_day = "31/02/1990"),
    (input) => (input.ocr.valid_date = "01/01/2020"),
  ];
  for (const mutate of mutations) {
    const input = fixture();
    mutate(input);
    assert.equal(evaluateVnptResults(input).eligible, false);
  }
  assert.equal(evaluateVnptResults(fixture(), "999999999999").eligible, false);
});
test("live challenge is scoped, expires and cannot be used again", () => {
  const now = Date.now(),
    c = {
      profile_id: "owner",
      consumed_at: null,
      issued_at: new Date(now - 1000).toISOString(),
      expires_at: new Date(now + 5000).toISOString(),
      poses: ["STRAIGHT", "RIGHT", "LEFT", "STRAIGHT"],
    };
  assert.equal(validChallenge(c, "owner", now), true);
  assert.equal(validChallenge(c, "another", now), false);
  assert.equal(
    validChallenge(
      { ...c, consumed_at: new Date(now).toISOString() },
      "owner",
      now,
    ),
    false,
  );
  assert.equal(validChallenge(c, "owner", now + 6000), false);
  assert.equal(
    validChallenge({ ...c, poses: ["STRAIGHT"] }, "owner", now),
    false,
  );
});
test("bank declared names normalize Vietnamese accents but do not accept reordered or partial identities", () => {
  assert.equal(holderNamesMatch("Trần Văn An", "TRAN VAN AN"), true);
  assert.equal(holderNamesMatch("Đặng Thị Ánh", "DANG THI ANH"), true);
  assert.equal(holderNamesMatch("AN TRAN VAN", "TRAN VAN AN"), false);
  assert.equal(holderNamesMatch("TRAN VAN", "TRAN VAN AN"), false);
});
test("address uses genuine catalog names and requires a ward belonging to the province", async () => {
  const catalog = {
    provinces: async () => [{ code: 79, name: "Thành phố Hồ Chí Minh" }],
    wards: async (code) =>
      code === 79 ? [{ code: 123, name: "Phường Mẫu" }] : [],
  };
  const input = {
    province: { code: 79, name: "Forged" },
    ward: { code: 123, name: "Forged" },
    house: "12",
    street: "Example Street",
    hamlet: "",
    note: "",
    type: "HOME",
  };
  assert.equal(
    (await validateAddress(input, catalog)).province.name,
    "Thành phố Hồ Chí Minh",
  );
  await assert.rejects(
    validateAddress({ ...input, ward: { code: 999 } }, catalog),
  );
  await assert.rejects(validateAddress({ ...input, house: "" }, catalog));
  await assert.rejects(validateAddress({ ...input, street: "" }, catalog));
  assert.equal((await validateAddress({...input,house:"Opposite the school"},catalog)).house,"Opposite the school");
});
test("legal configuration rejects fabricated registration URLs and malformed tax identifiers", () => {
  assert.throws(() => validateEntity({ taxId: "ABC" }));
  assert.throws(() =>
    validateEntity({
      commerceRegistrationUrl: "https://online.gov.vn.example.com/",
    }),
  );
  assert.throws(() => validateEntity({ unknown: "field" }));
  assert.equal(validateEntity({}).legalName, null);
});
