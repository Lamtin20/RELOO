"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Square, Video } from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { nativeCameraPermission } from "@/lib/mobile/client";
import {SHORT_MAX_BYTES} from '@/lib/shorts/limits';
export function ShortRecorder({ onFile }) {
  const video = useRef(null),
    media = useRef(null),
    recorder = useRef(null),
    normalized = useRef(null),
    drawFrame = useRef(0),
    timer = useRef(null),
    alive = useRef(true),
    [recording, setRecording] = useState(false),
    [preparing, setPreparing] = useState(false),
    [seconds, setSeconds] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearInterval(timer.current);
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      media.current?.getTracks().forEach((t) => t.stop());
      normalized.current?.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(drawFrame.current);
    };
  }, []);
  async function start() {
    if (preparing || recording) return;
    setPreparing(true);
    setError("");
    try {
      if (!window.MediaRecorder)
        throw new Error(
          "Trình duyệt chưa hỗ trợ quay video. Bạn có thể chọn video đã quay bằng camera.",
        );
      await nativeCameraPermission();
      media.current = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          aspectRatio: { ideal: 9 / 16 },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          frameRate: { ideal: 30,max:30 },
        },
        audio: true,
      });
      video.current.srcObject = media.current;
      await video.current.play();
      let recordingStream = media.current;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2,Math.floor(Math.min(1080,video.current.videoWidth,video.current.videoHeight*9/16)/2)*2);
      canvas.height = Math.floor(canvas.width*16/9/2)*2;
      if (video.current.videoWidth>video.current.videoHeight*1.1&&typeof canvas.captureStream === "function") {
        const context = canvas.getContext("2d");
        const draw = () => {
          const width = video.current.videoWidth,
            height = video.current.videoHeight;
          if (width && height) {
            const cropWidth = Math.min(width, (height * 9) / 16),
              cropHeight = Math.min(height, (width * 16) / 9);
            context.drawImage(
              video.current,
              (width - cropWidth) / 2,
              (height - cropHeight) / 2,
              cropWidth,
              cropHeight,
              0,
              0,
              canvas.width,
              canvas.height,
            );
          }
          drawFrame.current = requestAnimationFrame(draw);
        };
        draw();
        normalized.current = new MediaStream([
          ...canvas.captureStream(30).getVideoTracks(),
          ...media.current.getAudioTracks(),
        ]);
        recordingStream = normalized.current;
      }
      const mime = [
        "video/mp4",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      recorder.current = new MediaRecorder(
        recordingStream,
        {...(mime?{mimeType:mime}:{}),videoBitsPerSecond:video.current.videoWidth>=1080?6000000:4500000,audioBitsPerSecond:128000},
      );
      const chunks = [];
      let size = 0;
      recorder.current.ondataavailable = (e) => {
        if (e.data.size) {
          chunks.push(e.data);
          size += e.data.size;
          if (size > SHORT_MAX_BYTES-1024*1024) stop();
        }
      };
      recorder.current.onstop = () => {
        clearInterval(timer.current);
        cancelAnimationFrame(drawFrame.current);
        media.current?.getTracks().forEach((t) => t.stop());
        normalized.current?.getTracks().forEach((t) => t.stop());
        if (!alive.current) return;
        setRecording(false);
        if (size > SHORT_MAX_BYTES) {
          setError("Video vượt 80 MB. Hãy quay clip ngắn hơn.");
          return;
        }
        const type = recorder.current.mimeType || "video/webm";
        onFile(
          new File(
            chunks,
            type.startsWith("video/mp4")
              ? "camera-short.mp4"
              : "camera-short.webm",
            { type: type.split(";")[0] },
          ),
        );
      };
      recorder.current.start(1000);
      setSeconds(0);
      setRecording(true);
      let elapsed = 0;
      timer.current = setInterval(() => {
        elapsed++;
        setSeconds(elapsed);
        if (elapsed >= 180) stop();
      }, 1000);
    } catch (e) {
      cancelAnimationFrame(drawFrame.current);
      media.current?.getTracks().forEach((t) => t.stop());
      normalized.current?.getTracks().forEach((t) => t.stop());
      setError(
        e.name === "NotAllowedError"
          ? "Cấp quyền máy ảnh và microphone để quay video."
          : e.message,
      );
    } finally {
      if (alive.current) setPreparing(false);
    }
  }
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
    clearInterval(timer.current);
  }
  return (
    <div className="short-recorder">
      <video ref={video} muted playsInline />
      <p>
        {recording
          ? `Đang quay · ${seconds}s / 180s`
          : "Quay video dọc để giới thiệu món đồ của bạn."}
      </p>
      {error && (
        <p role="alert" className="ops-error">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary"
        onClick={recording ? stop : start}
        disabled={preparing}
      >
        <MorphIcon icon={recording ? Square : Camera} size={18} />
        {preparing
          ? "Đang mở camera..."
          : recording
            ? "Dừng & dùng video"
            : "Mở camera & quay"}
      </button>
      <small>
        <MorphIcon icon={Video} size={14} /> Video từ 2–180 giây, tối đa 80 MB.
      </small>
    </div>
  );
}
