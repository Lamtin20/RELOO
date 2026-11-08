"use client";
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  LoaderCircle,
  RotateCcw,
  Square,
  Video,
} from "lucide-react";
const POSE_LABELS = {
  STRAIGHT: "Nhìn thẳng vào máy ảnh",
  LEFT: "Xoay mặt sang trái",
  RIGHT: "Xoay mặt sang phải",
};
export function LiveFaceCapture({ onCaptured, disabled }) {
  const element = useRef(null),
    stream = useRef(null),
    recorder = useRef(null),
    timer = useRef(null),
    abort = useRef(false),
    generation = useRef(0),
    url = useRef(null);
  const [state, setState] = useState("IDLE"),
    [pose, setPose] = useState("STRAIGHT"),
    [step, setStep] = useState(0),
    [preview, setPreview] = useState(""),
    [error, setError] = useState("");
  function stop() {
    abort.current = true;
    generation.current += 1;
    clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
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
  async function start() {
    stop();
    abort.current = false;
    const runId = generation.current;
    setError("");
    setPreview("");
    onCaptured(null);
    if (url.current) {
      URL.revokeObjectURL(url.current);
      url.current = null;
    }
    setState("PREPARING");
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined"
      )
        throw new Error(
          "Trình duyệt chưa hỗ trợ quay xác minh. Hãy dùng Chrome hoặc Safari mới nhất.",
        );
      const response = await fetch("/api/kyc/challenge", { method: "POST" }),
        result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const challenge = result.challenge;
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720, max: 960 },
          height: { ideal: 720, max: 960 },
          frameRate: { ideal: 24, max: 30 },
        },
        audio: false,
      });
      if (abort.current || runId !== generation.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = nextStream;
      element.current.srcObject = stream.current;
      await element.current.play();
      if (abort.current || runId !== generation.current) return;
      const canvas = document.createElement("canvas");
      canvas.width = element.current.videoWidth;
      canvas.height = element.current.videoHeight;
      if (!canvas.width || !canvas.height)
        throw new Error("Máy ảnh chưa sẵn sàng. Hãy thử lại.");
      canvas.getContext("2d").drawImage(element.current, 0, 0);
      const selfie = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.9),
      );
      const mime = [
        "video/webm;codecs=vp8",
        "video/mp4;codecs=avc1.42E01E",
        "video/mp4",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Định dạng quay chưa được hỗ trợ.");
      const chunks = [];
      recorder.current = new MediaRecorder(stream.current, {
        mimeType: mime,
        videoBitsPerSecond: 1800000,
      });
      recorder.current.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.current.onstop = () => {
        if (runId !== generation.current) return;
        clearInterval(timer.current);
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (abort.current) return;
        const blob = new Blob(chunks, { type: mime.split(";")[0] });
        if (blob.size > 8000000 || !selfie) {
          setError("Video vượt dung lượng. Hãy quay lại.");
          setState("IDLE");
          return;
        }
        const video = new File(
          [blob],
          mime.includes("mp4") ? "live.mp4" : "live.webm",
          { type: blob.type },
        );
        url.current = URL.createObjectURL(video);
        setPreview(url.current);
        setState("CAPTURED");
        onCaptured({
          video,
          selfie: new File([selfie], "live-selfie.jpg", { type: "image/jpeg" }),
          challengeId: challenge.id,
        });
      };
      recorder.current.onerror = () => {
        if (runId !== generation.current) return;
        stop();
        setState("IDLE");
        setError("Chưa quay được video. Hãy kiểm tra quyền máy ảnh.");
      };
      const began = Date.now();
      setStep(0);
      setPose(challenge.poses[0]);
      setState("RECORDING");
      recorder.current.start(500);
      timer.current = setInterval(() => {
        const index = Math.floor((Date.now() - began) / 3500);
        if (index >= challenge.poses.length) {
          clearInterval(timer.current);
          recorder.current.stop();
          return;
        }
        setStep(index);
        setPose(challenge.poses[index]);
      }, 150);
    } catch (cause) {
      if (runId !== generation.current) return;
      stop();
      setState("IDLE");
      setError(
        cause.name === "NotAllowedError"
          ? "Cần cấp quyền máy ảnh để quay xác minh."
          : cause.message,
      );
    }
  }
  const recording = state === "RECORDING",
    preparing = state === "PREPARING";
  return (
    <section className="live-capture">
      <div className="profile-section-heading">
        <h2>
          <Video size={20} />
          Kiểm tra khuôn mặt
        </h2>
        {state === "CAPTURED" && (
          <span className="profile-tag">
            <Check size={15} />
            Đã quay, chờ đối chiếu
          </span>
        )}
      </div>
      <div
        className={`live-camera ${recording || preparing ? "live-camera--active" : ""}`}
      >
        <video ref={element} muted playsInline className="live-feed" />
        {preview && (
          <video
            src={preview}
            controls
            playsInline
            preload="metadata"
            className="live-preview"
          />
        )}
        {!recording && !preparing && !preview && (
          <div className="live-placeholder">
            <Camera size={38} />
          </div>
        )}
        {recording && (
          <div className="live-prompt">
            <span>{step + 1} / 4</span>
            <strong>{POSE_LABELS[pose]}</strong>
          </div>
        )}
        {preparing && (
          <div className="live-prompt">
            <LoaderCircle size={22} className="spin" />
            <strong>Đang mở máy ảnh...</strong>
          </div>
        )}
      </div>
      <div className="profile-actions">
        {recording || preparing ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              stop();
              setState("IDLE");
            }}
          >
            <Square size={16} />
            Dừng quay
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            onClick={start}
          >
            {preview ? <RotateCcw size={18} /> : <Camera size={18} />}{" "}
            {preview ? "Quay lại" : "Bắt đầu quay xác minh"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
    </section>
  );
}
