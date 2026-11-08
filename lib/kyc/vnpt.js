import { randomUUID } from "node:crypto";

const BASE = "https://api.idg.vnpt.vn";
function requestStage(path) {
  if (path.startsWith("/file-service/")) return "UPLOAD";
  if (path.includes("/ocr/")) return "OCR";
  if (path.endsWith("/face/compare")) return "FACE_COMPARE";
  if (path.includes("/card/")) return "CARD_LIVENESS";
  return "FACE_LIVENESS";
}
export function vnptConfigured(config = process.env) {
  return Boolean(
    config.VNPT_TOKEN_ID && config.VNPT_TOKEN_KEY && config.VNPT_ACCESS_TOKEN,
  );
}
export class VnptError extends Error {
  constructor(code, status = 503, providerCode = null, stage = null) {
    super(code);
    this.code = code;
    this.status = status;
    this.providerCode = providerCode;
    this.stage = stage;
  }
}
async function call(path, body, multipart = false, config = process.env) {
  const stage = requestStage(path);
  if (!vnptConfigured(config)) throw new VnptError("VNPT_NOT_CONFIGURED", 503, null, stage);
  const token = config.VNPT_ACCESS_TOKEN.replace(/^bearer\s+/i, "").trim();
  const headers = {
    Authorization: `Bearer ${token}`,
    "Token-id": config.VNPT_TOKEN_ID,
    "Token-key": config.VNPT_TOKEN_KEY,
    "mac-address": "RELOO_SERVER",
  };
  if (!multipart) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(BASE + path, {
      method: "POST",
      headers,
      body: multipart ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
  } catch (cause) {
    throw new VnptError(
      "VNPT_UNAVAILABLE",
      503,
      /^[A-Z_0-9]+$/.test(cause.cause?.code || "") ? cause.cause.code : null,
      stage,
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new VnptError("VNPT_INVALID_RESPONSE", 503, null, stage);
  }
  if (!response.ok || data.message !== "IDG-00000000" || !data.object)
    throw new VnptError(
      response.status === 401 || response.status === 403
        ? "VNPT_AUTH_REQUIRED"
        : "VNPT_REQUEST_FAILED",
      response.status,
      /^IDG-[A-Z0-9]+$/.test(data.message || "") ? data.message : null,
      stage,
    );
  return data.object;
}
export async function uploadVnpt(buffer, kind, config) {
  const form = new FormData();
  form.set("file", new Blob([buffer], { type: "image/jpeg" }), `${kind}.jpg`);
  form.set("title", `RELOO ${kind}`);
  form.set("description", "Consented identity verification");
  const result = await call("/file-service/v1/addFile", form, true, config);
  if (typeof result.hash !== "string" || result.hash.length > 1000)
    throw new VnptError("VNPT_UPLOAD_INVALID");
  return result.hash;
}
export function evaluateVnptResults(
  { ocr, compare, frontCard, backCard, faceLive, activeLive },
  claimedId = "",
) {
  function calendarDate(value) {
    const parts =
      typeof value === "string"
        ? value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        : null;
    if (!parts) return null;
    const [day, month, year] = parts.slice(1).map(Number),
      date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
      ? date
      : null;
  }
  const score = Number(compare?.prob);
  const scoreValid = compare?.prob!==null&&compare?.prob!==undefined&&String(compare.prob).trim()!==''&&Number.isFinite(score) && score >= 0 && score <= 100;
  const faceMatch = compare?.msg === "MATCH" && scoreValid && score > 80;
  const number = String(ocr?.id || "").trim();
  const idMatches =
    /^\d{12}$/.test(number) && (!claimedId || number === claimedId);
  const documentValid =
    ocr?.msg === "OK" &&
    ocr?.msg_back === "OK" &&
    ocr?.id_fake_warning === "no" &&
    ocr?.expire_warning === "no" &&
    ocr?.back_expire_warning === "no" &&
    ocr?.tampering?.is_legal === "yes" &&
    !ocr.warning?.length &&
    !ocr.tampering?.warning?.length;
  const cardReal = [frontCard, backCard].every(
    (card) =>
      card?.liveness === "success" &&
      card.face_swapping === false &&
      card.fake_liveness === false,
  );
  const passiveLive = faceLive?.liveness === "success";
  const videoPassed = activeLive?.status === "PASSED";
  const trustedActiveLive=videoPassed&&activeLive.provider==='VNPT'&&activeLive.serverVerified===true;
  const birthDate = calendarDate(ocr?.birth_day),
    expiryDate = calendarDate(ocr?.valid_date);
  const fieldsPresent =
    typeof ocr?.name === "string" &&
    ocr.name.trim().length >= 3 &&
    birthDate &&
    birthDate.getTime() < Date.now() &&
    (!expiryDate || expiryDate.getTime() + 86400000 > Date.now());
  let idProbs = ocr?.id_probs;
  try {
    if (typeof idProbs === "string") idProbs = JSON.parse(idProbs);
  } catch {
    idProbs = null;
  }
  const ocrConfidence =
    Number(ocr?.name_prob) >= 0.9 &&
    Number(ocr?.birth_day_prob) >= 0.9 &&
    Array.isArray(idProbs) &&
    idProbs.length === 12 &&
    idProbs.every((p) => typeof p === "number" && p >= 0.9 && p <= 1);
  const eligible = Boolean(
    faceMatch &&
      idMatches &&
      documentValid &&
      cardReal &&
      passiveLive &&
      videoPassed &&
      trustedActiveLive &&
      fieldsPresent &&
      ocrConfidence,
  );
  return {
    eligible,
    fields: {
      nationalId: number,
      fullName: ocr?.name || null,
      dateOfBirth: ocr?.birth_day || null,
      sex: ocr?.gender || null,
      nationality: ocr?.nationality || null,
      residence: ocr?.recent_location || null,
      expiryDate: ocr?.valid_date || null,
      issueDate: ocr?.issue_date || null,
    },
    checks: {
      idMatches,
      documentValid,
      cardReal,
      passiveLive,
      videoPassed,
      trustedActiveLive,
      fieldsPresent: Boolean(fieldsPresent),
      ocrConfidence,
    },
    face: {
      source: "VNPT",
      status: "PROCESSED",
      verified: faceMatch,
      similarityPercent: scoreValid ? score : null,
      thresholdPercent: 80,
      nationalIdMatches: idMatches,
      liveness: trustedActiveLive && passiveLive ? "PASSED" : "REVIEW",
      activeLive: activeLive || { status: "NOT_ESTABLISHED" },
      requiresHumanReview: !eligible,
    },
  };
}
export async function analyzeVnpt(
  { front, back, selfie, claimedId, activeLive, sessionId = randomUUID() },
  config = process.env,
) {
  const hashes = {};
  for (const [kind, buffer] of Object.entries({ front, back, selfie }))
    hashes[kind] = await uploadVnpt(buffer, kind, config);
  const session = `WEB_RELOO_NextJS_Device_1.0_${sessionId.replaceAll("-", "")}_${Date.now()}`;
  const token = sessionId.replaceAll("-", "");
  const common = { client_session: session, token };
  const ocr = await call(
    "/ai/v1/ocr/id",
    {
      ...common,
      img_front: hashes.front,
      img_back: hashes.back,
      type: -1,
      crop_param: "0,0",
      validate_postcode: true,
    },
    false,
    config,
  );
  const compare = await call(
    "/ai/v1/face/compare",
    { ...common, img_front: hashes.front, img_face: hashes.selfie },
    false,
    config,
  );
  const frontCard = await call(
    "/ai/v1/card/liveness",
    { ...common, img: hashes.front },
    false,
    config,
  );
  const backCard = await call(
    "/ai/v1/card/liveness",
    { ...common, img: hashes.back },
    false,
    config,
  );
  const faceLive = await call(
    "/ai/v1/face/liveness",
    { ...common, img: hashes.selfie },
    false,
    config,
  );
  return {
    ...evaluateVnptResults(
      { ocr, compare, frontCard, backCard, faceLive, activeLive },
      claimedId,
    ),
    providerResults: { ocr, compare, frontCard, backCard, faceLive },
    providerSession: session,
    hashes,
  };
}
