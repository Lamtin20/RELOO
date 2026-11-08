import { HttpError } from "../server/http.js";
export {SHORT_MAX_BYTES} from './limits.js';
export function validateShort(input) {
  if (
    typeof input.caption !== "string" ||
    input.caption.trim().length < 1 ||
    input.caption.length > 1200 ||
    !Array.isArray(input.products) ||
    input.products.length > 5 ||
    typeof input.draft !== "boolean" ||
    !/^[a-f0-9-]{36}$/i.test(input.mediaId || "")
  )
    throw new HttpError(400, "Nhập mô tả, chọn video và tối đa 5 sản phẩm.");
  const seen = new Set();
  const products = input.products.map((tag) => {
    let row;
    if (
      tag.kind === "RENTAL" &&
      typeof tag.assetId === "string" &&
      /^[a-z0-9_-]{1,100}$/i.test(tag.assetId)
    )
      row = { kind: "RENTAL", assetId: tag.assetId };
    else if(tag.kind==='EXTERNAL')throw new HttpError(400,"Gắn liên kết ngoài đang tạm ngừng. Hãy chọn sản phẩm RELOO.",'SHORT_EXTERNAL_DISABLED');
    else throw new HttpError(400, "Sản phẩm gắn vào video không hợp lệ.");
    const key = row.assetId || row.href;
    if (seen.has(key))
      throw new HttpError(400, "Mỗi sản phẩm chỉ gắn một lần.");
    seen.add(key);
    return row;
  });
  return {
    mediaId: input.mediaId,
    caption: input.caption.trim(),
    products,
    draft: input.draft,
  };
}
export function validateVideoProbe(probe) {
  const videos = (probe.streams || []).filter((s) => s.codec_type === "video");
  const duration = Number(probe.format?.duration);
  if (
    videos.length !== 1 ||
    !Number.isFinite(duration) ||
    duration < 2 ||
    duration > 180
  )
    throw new HttpError(
      400,
      "Video cần dài từ 2 đến 180 giây và có một luồng hình ảnh.",
    );
  const v = videos[0],
    rotation = Number(
      v.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ||
        v.tags?.rotate ||
        0,
    ),
    rotated = Math.abs(rotation) % 180 === 90,
    width = rotated ? v.height : v.width,
    height = rotated ? v.width : v.height;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 180 ||
    height < 240 ||
    width > 4096 ||
    height > 4096 ||
    width > height * 1.1
  )
    throw new HttpError(
      400,
      "Chọn video dọc, rõ hình ảnh, kích thước tối đa 4096px.",
    );
  return { duration, width, height };
}
export function videoInputFormat(bytes) {
  if (bytes.subarray(4, 8).toString("ascii") === "ftyp") return "mov";
  if (bytes.subarray(0, 4).toString("hex") === "1a45dfa3") return "matroska";
  throw new HttpError(
    400,
    "Nội dung tệp không phải MP4, MOV hoặc WebM hợp lệ.",
  );
}
export function parseByteRange(value, size) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return false;
  let start, end;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return false;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start < size &&
    end >= start
    ? { start, end }
    : false;
}
