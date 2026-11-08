"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, LoaderCircle, Upload, X } from "lucide-react";
import { optimizeImageFile } from "@/lib/image-optimize";
import {useLocale} from '@/components/settings/LocaleProvider';
const DEFAULT_MAX_IMAGES = 8;

export function ListingImageUpload({
  images = [],
  onChange,
  maxImages = DEFAULT_MAX_IMAGES,
}) {
  const {locale}=useLocale(),en=locale==='en-US';
  const id = useId(),
    galleryRef = useRef(null),
    captureRef = useRef(null),
    videoRef = useRef(null),
    streamRef = useRef(null),
    working = useRef(false),
    cameraPending = useRef(false),
    mounted = useRef(true);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [cameraOpen, setCameraOpen] = useState(false),
    [cameraReady, setCameraReady] = useState(false);
  const atLimit = images.length >= maxImages;
  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!cameraOpen || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current
      .play()
      .catch(() =>
        setError(
          "Không mở được video từ camera. Bạn vẫn có thể chọn ảnh từ thiết bị.",
        ),
      );
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keyboard(event) {
      if (event.key === "Escape") {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraOpen(false);
      }
      if (event.key === "Tab") {
        const buttons = [
          ...videoRef.current
            .closest(".camera-dialog__panel")
            .querySelectorAll("button:not(:disabled)"),
        ];
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [cameraOpen]);
  async function ingestFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length || working.current) return;
    working.current = true;
    setLoading(true);
    setError("");
    const next = [...images],
      issues = [];
    try {
      for (const file of files) {
        if (next.length >= maxImages) {
          issues.push(`Tối đa ${maxImages} ảnh.`);
          break;
        }
        try {
          const result = await optimizeImageFile(file);
          if (!next.includes(result.dataUrl)) next.push(result.dataUrl);
        } catch (cause) {
          issues.push(`${file.name.slice(0, 60)}: ${cause.message}`);
        }
      }
      if (mounted.current) {
        onChange?.(next);
        setError(issues.join(" "));
      }
    } finally {
      working.current = false;
      if (mounted.current) setLoading(false);
      if (galleryRef.current) galleryRef.current.value = "";
      if (captureRef.current) captureRef.current.value = "";
    }
  }
  async function openCamera() {
    if (atLimit || working.current || cameraPending.current) return;
    setError("");
    if (window.matchMedia("(pointer: coarse)").matches) {
      captureRef.current?.click();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) {
      setError(
        "Camera cần HTTPS và trình duyệt hỗ trợ. Bạn có thể chọn ảnh từ thiết bị.",
      );
      return;
    }
    cameraPending.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      if (!mounted.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setCameraReady(false);
      setCameraOpen(true);
    } catch (cause) {
      setError(
        cause.name === "NotAllowedError"
          ? "Bạn chưa cho phép camera. Hãy cấp quyền camera hoặc chọn ảnh từ thiết bị."
          : cause.name === "NotFoundError"
            ? "Thiết bị chưa có camera khả dụng. Hãy chọn ảnh có sẵn."
            : "Camera đang bận hoặc chưa mở được. Hãy thử lại hoặc chọn ảnh có sẵn.",
      );
    } finally {
      cameraPending.current = false;
    }
  }
  async function takePhoto() {
    const video = videoRef.current;
    if (!video?.videoWidth || working.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9),
    );
    if (!blob) {
      setError("Chưa chụp được ảnh. Hãy thử lại.");
      return;
    }
    stopCamera();
    setCameraOpen(false);
    await ingestFiles([
      new File([blob], "anh-mon-do.jpg", { type: "image/jpeg" }),
    ]);
  }
  return (
    <div className="listing-image-upload" aria-busy={loading}>
      <div className="dashboard-image-upload__actions">
        <label
          htmlFor={`${id}-gallery`}
          className={`dashboard-image-upload__trigger upload-native ${loading || atLimit ? "is-disabled" : ""}`}
        >
          {loading ? (
            <LoaderCircle size={18} className="spin" />
          ) : (
            <Upload size={18} />
          )}
          <span>{loading ? (en?'Adding photos…':'Đang thêm ảnh…') : (en?'Choose from library':'Chọn từ thư viện')}</span>
          <input
            id={`${id}-gallery`}
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            disabled={loading || atLimit}
            aria-label={en?'Choose item photos from your device':'Chọn ảnh món đồ từ thiết bị'}
            onChange={(event) => ingestFiles(event.target.files)}
          />
        </label>
        <button
          type="button"
          className="dashboard-image-upload__trigger dashboard-image-upload__trigger--camera"
          onClick={openCamera}
          disabled={loading || atLimit}
        >
          <Camera size={18} />
          <span>{en?'Take a photo':'Chụp ảnh'}</span>
        </button>
      </div>
      <input
        ref={captureRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label={en?'Photo of your item':'Ảnh chụp món đồ'}
        onChange={(event) => ingestFiles(event.target.files)}
      />
      <span className="input-hint" role="status">
        {images.length}/{maxImages} ảnh
      </span>
      {error && (
        <p className="upload-error" role="alert">
          {error}
        </p>
      )}
      {images.length > 0 ? (
        <div className="dashboard-image-list mt-2">
          {images.map((url, index) => (
            <div
              key={`${index}-${url.slice(-20)}`}
              className="dashboard-image-list__item"
            >
              <img src={url} alt={`Ảnh món đồ ${index + 1}`} />
              <button
                type="button"
                disabled={loading}
                className="dashboard-image-list__remove"
                title={`Xóa ảnh ${index + 1}`}
                aria-label={`Xóa ảnh ${index + 1}`}
                onClick={() => onChange?.(images.filter((_, i) => i !== index))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="dashboard-image-empty">
          <ImagePlus size={16} />
          <span className="text-xs text-muted">
            Thêm ảnh thực tế của món đồ
          </span>
        </div>
      )}
      {cameraOpen &&
        createPortal(
          <div
            className="camera-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Chụp ảnh món đồ"
          >
            <div className="camera-dialog__panel">
              <header>
                <h2>Chụp ảnh món đồ</h2>
                <button
                  type="button"
                  title="Đóng camera"
                  aria-label="Đóng camera"
                  onClick={() => {
                    stopCamera();
                    setCameraOpen(false);
                  }}
                  autoFocus
                >
                  <X size={20} />
                </button>
              </header>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedData={() => setCameraReady(true)}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={takePhoto}
                disabled={!cameraReady}
              >
                <Camera size={19} />
                Chụp & dùng ảnh
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
export { DEFAULT_MAX_IMAGES };
