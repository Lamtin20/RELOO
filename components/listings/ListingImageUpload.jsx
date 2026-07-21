"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Upload, X } from "lucide-react";
import { optimizeImageFile, formatBytes } from "@/lib/image-optimize";

const DEFAULT_MAX_IMAGES = 8;

/**
 * Upload / chụp ảnh — tự nén sang WebP trước khi lưu
 */
export function ListingImageUpload({
  images = [],
  onChange,
  maxImages = DEFAULT_MAX_IMAGES,
}) {
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastOptimize, setLastOptimize] = useState(null);

  async function ingestFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setError("");
    setLoading(true);
    setLastOptimize(null);

    try {
      const next = [...images];

      for (const file of files) {
        if (next.length >= maxImages) {
          setError(`Tối đa ${maxImages} ảnh.`);
          break;
        }

        const result = await optimizeImageFile(file);
        if (!next.includes(result.dataUrl)) {
          next.push(result.dataUrl);
          setLastOptimize({
            format: result.format.toUpperCase(),
            size: formatBytes(result.optimizedBytes),
            original: formatBytes(result.originalBytes),
          });
        }
      }

      onChange?.(next);
    } catch (err) {
      setError(err.message || "Không xử lý được ảnh. Vui lòng thử lại.");
    } finally {
      setLoading(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  function removeAt(index) {
    onChange?.(images.filter((_, i) => i !== index));
    setLastOptimize(null);
  }

  const atLimit = images.length >= maxImages;

  return (
    <div className="listing-image-upload">
      <div className="dashboard-image-upload__actions">
        <button
          type="button"
          className="dashboard-image-upload__trigger"
          onClick={() => galleryRef.current?.click()}
          disabled={loading || atLimit}
        >
          <Upload size={18} />
          <span>{loading ? "Đang tối ưu…" : "Chọn từ thiết bị"}</span>
        </button>
        <button
          type="button"
          className="dashboard-image-upload__trigger dashboard-image-upload__trigger--camera"
          onClick={() => cameraRef.current?.click()}
          disabled={loading || atLimit}
        >
          <Camera size={18} />
          <span>Chụp ảnh</span>
        </button>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => ingestFiles(e.target.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => ingestFiles(e.target.files)}
      />

      <span className="input-hint">
        Ảnh tự động nén sang WebP để tải nhanh · {images.length}/{maxImages} ảnh
      </span>

      {lastOptimize && !loading && (
        <span className="input-hint text-green">
          Đã tối ưu {lastOptimize.format} · {lastOptimize.original} → {lastOptimize.size}
        </span>
      )}

      {error && (
        <span className="input-hint" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}

      {images.length > 0 && (
        <div className="dashboard-image-list mt-2">
          {images.map((url, index) => (
            <div key={`img-${index}`} className="dashboard-image-list__item">
              <img src={url} alt={`Ảnh ${index + 1}`} />
              <button
                type="button"
                className="dashboard-image-list__remove"
                onClick={() => removeAt(index)}
                aria-label="Xóa ảnh"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="dashboard-image-empty">
          <ImagePlus size={16} />
          <span className="text-xs text-muted">
            Chưa có ảnh — sẽ dùng ảnh mặc định nếu bỏ trống
          </span>
        </div>
      )}
    </div>
  );
}

export { DEFAULT_MAX_IMAGES };
