"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Check, LoaderCircle, RotateCcw, X } from "lucide-react";
import {nativeCameraPermission} from '@/lib/mobile/client';
export function LivePhotoCapture({ onCaptured, disabled }) {
  const video = useRef(null),
    stream = useRef(null),
    generation = useRef(0),
    url = useRef(null),
    session = useRef(null);
  const [state, setState] = useState("IDLE"),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  function stop() {
    generation.current += 1;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
  }
  useEffect(
    () => () => {
      stop();
      if (url.current) URL.revokeObjectURL(url.current);
    },
    [],
  );
  useEffect(() => {
    const stopHiddenCamera = () => {
      if (document.hidden && stream.current) {
        stop();
        setState("IDLE");
      }
    };
    document.addEventListener("visibilitychange", stopHiddenCamera);
    return () =>
      document.removeEventListener("visibilitychange", stopHiddenCamera);
  }, []);
  async function start() {
    stop();
    const run = generation.current;
    onCaptured(null);
    setPreview("");
    setError("");
    setState("PREPARING");
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
    try {
      await nativeCameraPermission();
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error(
          "Cần mở RELOO bằng HTTPS và cấp quyền máy ảnh để chụp chân dung.",
        );
      const media = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720, max: 1280 },
          height: { ideal: 960, max: 1280 },
        },
        audio: false,
      });
      if (run !== generation.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      video.current.srcObject = media;
      await video.current.play();
      const response = await fetch("/api/kyc/photo-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true }),
      });
      const result = await response.json();
      if (run !== generation.current) return;
      if (!response.ok) throw new Error(result.error);
      session.current = result.session;
      setState("READY");
    } catch (cause) {
      if (run !== generation.current) return;
      stop();
      setState("IDLE");
      setError(
        cause.name === "NotAllowedError"
          ? "Bạn cần cho phép truy cập máy ảnh để chụp chân dung."
          : cause.name === "NotFoundError"
            ? "Không tìm thấy máy ảnh. Hãy mở RELOO trên thiết bị có camera."
            : cause.message,
      );
    }
  }
  async function capture() {
    const run = generation.current;
    setState("CAPTURING");
    setError("");
    try {
      if (
        !video.current.videoWidth ||
        !video.current.videoHeight ||
        Date.parse(session.current?.expires_at) <= Date.now()
      )
        throw new Error(
          "Lượt chụp đã hết hạn hoặc máy ảnh chưa sẵn sàng. Hãy mở lại máy ảnh.",
        );
      const canvas = document.createElement("canvas"),
        ratio = Math.min(
          1,
          1280 / Math.max(video.current.videoWidth, video.current.videoHeight),
        );
      canvas.width = Math.round(video.current.videoWidth * ratio);
      canvas.height = Math.round(video.current.videoHeight * ratio);
      canvas
        .getContext("2d")
        .drawImage(video.current, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      if (run !== generation.current) return;
      if (!blob || blob.size > 2000000)
        throw new Error("Chưa lưu được ảnh chân dung. Hãy chụp lại.");
      const sessionId = session.current.id;
      stop();
      url.current = URL.createObjectURL(blob);
      setPreview(url.current);
      setState("CAPTURED");
      onCaptured({
        selfie: new File([blob], "camera-portrait.jpg", { type: "image/jpeg" }),
        sessionId,
      });
    } catch (cause) {
      if (run === generation.current) {
        setState("READY");
        setError(cause.message);
      }
    }
  }
  const active = ["PREPARING", "READY", "CAPTURING"].includes(state);
  return (
    <section className="live-capture photo-capture">
      <div className="profile-section-heading">
        <h2>
          <Camera size={20} /> Ảnh chân dung
        </h2>
        {state === "CAPTURED" && (
          <span className="profile-tag">
            <Check size={15} /> Đã chụp
          </span>
        )}
      </div>
      <p className="profile-note">
        Chụp trực tiếp bằng camera trước. Nhìn thẳng, để rõ khuôn mặt và chọn
        nơi đủ sáng.
      </p>
      <div className={`live-camera ${active ? "live-camera--active" : ""}`}>
        <video ref={video} muted playsInline className="live-feed" />
        {preview && (
          <img
            src={preview}
            alt="Ảnh chân dung vừa chụp"
            className="live-preview"
          />
        )}
        {!active && !preview && (
          <div className="live-placeholder">
            <Camera size={38} />
          </div>
        )}
        {state === "PREPARING" && (
          <div className="live-prompt">
            <LoaderCircle size={22} className="spin" />
            <strong>Đang mở máy ảnh...</strong>
          </div>
        )}
      </div>
      <div className="profile-actions">
        {state === "READY" || state === "CAPTURING" ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={disabled || state === "CAPTURING"}
            onClick={capture}
          >
            <Camera size={18} /> Chụp chân dung
          </button>
        ) : (
          !active && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={disabled}
              onClick={start}
            >
              {preview ? <RotateCcw size={18} /> : <Camera size={18} />}{" "}
              {preview ? "Chụp lại chân dung" : "Mở camera chụp chân dung"}
            </button>
          )
        )}
        {active && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              stop();
              setState("IDLE");
            }}
          >
            <X size={18} /> Đóng camera
          </button>
        )}
      </div>
      {error && (
        <p className="ops-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
