import { UUID, validateGeometry, normalizeAdministrative } from "./domain.js";
import { CATEGORIES } from "../constants.js";
export const USER_ACTIONS = [
  "SUGGEST_AREA",
  "MEMBERSHIP",
  "VERIFY",
  "PREFERENCES",
  "LISTING",
  "BLOCK",
  "REMOVE_BLOCK",
  "NEED",
  "EDIT_NEED",
  "CLOSE_NEED",
  "OFFER",
  "BOOK",
  "BOOK_DRAFT",
  "SUBMIT_DRAFT",
  "ACCEPT",
  "REJECT",
  "CANCEL",
  "PAYMENT_REPORT",
  "PAYMENT_ACK",
  "DEPOSIT_ACK",
  "READY",
  "REQUEST_RETURN",
  "ISSUE_OTP",
  "HANDOVER",
  "EXTEND",
  "EXTENSION_ACCEPT",
  "EXTENSION_REJECT",
  "EXTENSION_PAID",
  "ISSUE",
  "REFUND_REPORT",
  "REFUND_ACK",
  "DEPOSIT_RETURN",
  "DEPOSIT_RETURN_ACK",
  "REVIEW",
];
export const ADMIN_ACTIONS = [
  "ADMIN_PROMOTION",
  "ADMIN_SOURCE",
  "ADMIN_PLACE",
  "ADMIN_PLACE_REVIEW",
  "ADMIN_LOCK",
  "ADMIN_MERGE",
  "ADMIN_POLICY",
  "ADMIN_ENABLE",
  "ADMIN_VERIFY",
  "ADMIN_INVITE",
  "ADMIN_LISTING",
  "ADMIN_CHANGE",
  "ADMIN_RETRY",
  "ADMIN_SYNC",
  "RESOLVE",
];
const invalid = () => {
  throw Error("INVALID_INPUT");
};
const string = (v, min = 0, max = 2000) =>
  typeof v === "string" && v.trim().length >= min && v.length <= max;
const integer = (v, min, max) =>
  Number.isSafeInteger(v) && v >= min && v <= max;
export function validateInput(action, input, { admin = false } = {}) {
  if (
    !(admin ? ADMIN_ACTIONS : USER_ACTIONS).includes(action) ||
    !input ||
    Array.isArray(input) ||
    typeof input !== "object"
  )
    invalid();
  const d = structuredClone(input);
  if (d.category !== undefined && !CATEGORIES.some((c) => c.id === d.category))
    invalid();
  for (const k of [
    "id",
    "area",
    "subzone",
    "building",
    "point",
    "membership",
    "need",
    "offer",
    "extension",
    "source",
    "target",
    "parent",
    "promotion",
  ])
    if (d[k] !== undefined && d[k] !== "" && !UUID.test(d[k])) invalid();
  for (const k of ["asset", "profile"])
    if (
      d[k] !== undefined &&
      d[k] !== "" &&
      !/^[a-zA-Z0-9_-]{1,150}$/.test(d[k])
    )
      invalid();
  for (const k of [
    "note",
    "description",
    "instructions",
    "condition",
    "reason",
    "name",
    "title",
    "address",
    "addressRaw",
    "terms",
    "attribution",
  ])
    if (
      d[k] !== undefined &&
      typeof d[k] !== "object" &&
      !string(d[k], 0, k === "description" ? 4000 : 2000)
    )
      invalid();
  for (const k of ["start", "end"])
    if (
      d[k] !== undefined &&
      (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(Z|[+-]\d\d:\d\d)$/.test(
        d[k],
      ) ||
        !Number.isFinite(Date.parse(d[k])))
    )
      invalid();
  for (const k of ["rate", "deposit", "budget", "total"])
    if (
      d[k] !== undefined &&
      d[k] !== null &&
      d[k] !== "" &&
      !integer(d[k], 0, 1000000000)
    )
      invalid();
  if (
    d.images !== undefined &&
    (!Array.isArray(d.images) ||
      d.images.length > 4 ||
      d.images.some(
        (v) =>
          typeof v !== "string" ||
          v.length > 3500000 ||
          !/^(data:image\/(jpeg|png|webp);base64,|\/api\/media\/[a-f0-9-]{36}$)/i.test(
            v,
          ),
      ))
  )
    invalid();
  if (
    d.scope !== undefined &&
    !["BUILDING", "SUBZONE", "AREA"].includes(d.scope)
  )
    invalid();
  if (d.phase !== undefined && !["PICKUP", "RETURN"].includes(d.phase))
    invalid();
  for (const k of [
    "verifiedOnly",
    "instant",
    "visible",
    "enabled",
    "locked",
    "agreed",
    "checked",
    "storageAllowed",
    "match",
    "marketing",
  ])
    if (d[k] !== undefined && typeof d[k] !== "boolean") invalid();
  if (d.handoverStart !== undefined && !integer(d.handoverStart, 0, 23))
    invalid();
  if (d.handoverEnd !== undefined && !integer(d.handoverEnd, 1, 24)) invalid();
  if (d.code !== undefined && !/^\d{6}$/.test(d.code)) invalid();
  if (d.invite !== undefined && !/^[a-zA-Z0-9_-]{8,64}$/.test(d.invite))
    invalid();
  if (
    ["NEED", "EDIT_NEED"].includes(action) &&
    (!UUID.test(d.area) ||
      !string(d.title, 3, 160) ||
      !string(d.category, 2, 80) ||
      !d.start ||
      !d.end ||
      !d.scope)
  )
    invalid();
  if (
    action === "LISTING" &&
    (!UUID.test(d.area) ||
      !UUID.test(d.point) ||
      !string(d.condition, 3, 1000) ||
      !Array.isArray(d.accessories) ||
      d.accessories.length > 30 ||
      d.accessories.some((a) => !string(a, 1, 100)) ||
      ![60, 1440].includes(d.unitMinutes) ||
      !integer(d.rate, 1, 1000000000) ||
      !integer(d.deposit, 0, 1000000000) ||
      !integer(d.minMinutes, 60, 129600) ||
      !integer(d.bufferMinutes, 0, 1440) ||
      !d.scope ||
      (!d.asset &&
        (!string(d.title, 3, 160) ||
          !string(d.category, 2, 80) ||
          !d.images?.length)))
  )
    invalid();
  if (
    action === "PREFERENCES" &&
    (!["vi-VN", "en-US"].includes(d.locale) ||
      !integer(d.quietStart, 0, 23) ||
      !integer(d.quietEnd, 0, 23) ||
      !integer(d.cap, 1, 10))
  )
    invalid();
  if (action === "ADMIN_PLACE") {
    if (
      !["AREA", "SUBZONE", "BUILDING", "HANDOVER"].includes(d.kind) ||
      !string(d.name, 2, 160)
    )
      invalid();
    d.geometry = validateGeometry(d.geometry);
    d.administrative = normalizeAdministrative(d.administrative || {});
    if (d.aliases && !Array.isArray(d.aliases)) invalid();
  }
  if (
    action === "ADMIN_POLICY" &&
    (!string(d.terms?.["vi-VN"], 30, 6000) ||
      !string(d.terms?.["en-US"], 30, 6000) ||
      !integer(d.holdMinutes, 5, 1440) ||
      !integer(d.paymentMinutes, 5, 1440) ||
      !integer(d.cancelBeforeHours, 0, 720) ||
      !integer(d.feeBps, 0, 10000))
  )
    invalid();
  if (
    action === "ADMIN_SOURCE" &&
    (!string(d.name, 2, 160) ||
      !string(d.terms, 20, 2000) ||
      !integer(d.syncMinutes, 60, 43200) ||
      d.storageAllowed !== true)
  )
    invalid();
  if (
    action === "ADMIN_PROMOTION" &&
    (!string(d.title?.["vi-VN"], 3, 160) ||
      !string(d.title?.["en-US"], 3, 160) ||
      !string(d.terms?.["vi-VN"], 30, 2000) ||
      !string(d.terms?.["en-US"], 30, 2000) ||
      !integer(d.budget, 1, 1000000000) ||
      !integer(d.amount, 1, d.budget) ||
      !Number.isFinite(Date.parse(d.expires)) ||
      Date.parse(d.expires) <= Date.now())
  )
    invalid();
  if (
    action === "ADMIN_INVITE" &&
    (!UUID.test(d.area) || !integer(d.hours, 1, 168))
  )
    invalid();
  if (action === "REVIEW" && !integer(d.rating, 1, 5)) invalid();
  // Secret hashes can ONLY be generated by the server, never accepted from clients.
  delete d.codeHash;
  delete d.inviteHash;
  return d;
}
