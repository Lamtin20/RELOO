/**
 * Tối ưu ảnh upload: resize + chuyển WebP trước khi lưu
 */

const MAX_EDGE = 1920;
const WEBP_QUALITY = 0.82;

/** Placeholder SVG khi không upload ảnh */
export const LISTING_PLACEHOLDER_IMAGE =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect fill="#eef2f6" width="800" height="600"/>
      <text x="400" y="300" text-anchor="middle" fill="#94a3b8" font-family="sans-serif" font-size="28">RELOO</text>
    </svg>`,
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
    const timer = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Ảnh mất quá lâu để mở. Hãy chọn ảnh JPG, PNG hoặc WebP khác.",
        ),
      );
    }, 15000);
    img.onload = () => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
      reject(
        new Error(
          "Không đọc được ảnh. Hãy chuyển ảnh HEIC/HEIF sang JPG hoặc chọn PNG, WebP.",
        ),
      );
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
async function optimizeOnServer(file){
 const form=new FormData();form.set('file',file);
 const response=await fetch('/api/images/optimize',{method:'POST',body:form});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.error||'Chưa chuyển được ảnh sang WebP. Vui lòng thử lại.');}
 const blob=await response.blob();
 if(blob.type!=='image/webp')throw new Error('Máy chủ chưa xuất được ảnh WebP.');
 return {dataUrl:await blobToDataUrl(blob),format:'webp',originalBytes:file.size,optimizedBytes:blob.size};
}

/**
 * @param {File} file
 * @returns {Promise<{ dataUrl: string, format: 'webp', originalBytes: number, optimizedBytes: number }>}
 */
export async function optimizeImageFile(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Chỉ chấp nhận file hình ảnh.");
  }
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Ảnh tối đa 15 MB. Hãy chọn ảnh có dung lượng nhỏ hơn.");

  let img;
  try{img=await loadImageFromFile(file);}catch{return optimizeOnServer(file);}
  if (
    !img.naturalWidth ||
    !img.naturalHeight ||
    img.naturalWidth * img.naturalHeight > 50000000
  )
    throw new Error("Kích thước ảnh quá lớn hoặc ảnh bị lỗi.");
  const { width, height } = scaleDimensions(
    img.naturalWidth,
    img.naturalHeight,
    MAX_EDGE,
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");

  ctx.drawImage(img, 0, 0, width, height);

  let blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (!blob || blob.type !== 'image/webp') return optimizeOnServer(file);

  for (let attempt = 0; blob.size > 285000 && attempt < 5; attempt++) {
    canvas.width = Math.max(
      1,
      Math.round(width * Math.pow(0.78, attempt + 1)),
    );
    canvas.height = Math.max(1, Math.round((height * canvas.width) / width));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, "image/webp", 0.72);
    if (!blob || blob.type !== 'image/webp') throw new Error("Không thể xuất ảnh WebP.");
  }
  const dataUrl = await blobToDataUrl(blob);
  if (dataUrl.length > 400000)
    throw new Error("Ảnh chưa nén đủ nhỏ. Hãy chọn ảnh khác.");

  return {
    dataUrl,
    format: 'webp',
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
