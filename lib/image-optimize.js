/**
 * Tối ưu ảnh upload: resize + chuyển WebP (fallback JPEG) trước khi lưu
 */

const MAX_EDGE = 1920;
const WEBP_QUALITY = 0.82;
const JPEG_QUALITY = 0.85;

/** Placeholder SVG khi không upload ảnh */
export const LISTING_PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect fill="#eef2f6" width="800" height="600"/>
      <text x="400" y="300" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="28">RELOO</text>
    </svg>`
  );

function scaleDimensions(width, height, maxEdge) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Không đọc được file ảnh."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, format: 'webp'|'jpeg', originalBytes: number, optimizedBytes: number }>}
 */
export async function optimizeImageFile(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Chỉ chấp nhận file hình ảnh.");
  }

  const img = await loadImageFromFile(file);
  const { width, height } = scaleDimensions(img.naturalWidth, img.naturalHeight, MAX_EDGE);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");

  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  let format = "webp";

  if (!blob) {
    blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    format = "jpeg";
  }

  if (!blob) throw new Error("Không thể nén ảnh.");

  const dataUrl = await blobToDataUrl(blob);

  return {
    dataUrl,
    format,
    originalBytes: file.size,
    optimizedBytes: blob.size,
  };
}

export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
