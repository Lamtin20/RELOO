"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Camera,
  Video,
  Sparkles,
  MapPin,
  PenTool,
  Copy,
  Check,
} from "lucide-react";
import { useAuth, useOrders } from "@/lib/store";
import { EmptyState } from "@/components/ui";
import { generateMockHash } from "@/lib/utils";

const ANGLES = [
  { key: "front", label: "Mặt trước" },
  { key: "back", label: "Mặt sau" },
  { key: "left", label: "Cạnh trái" },
  { key: "right", label: "Cạnh phải" },
  { key: "detail", label: "Chi tiết / Cận cảnh" },
];

const STEPS = [
  { id: "visual", label: "5 góc kiểm tra", icon: Camera },
  { id: "video", label: "Video chức năng", icon: Video },
  { id: "hygiene", label: "Vệ sinh", icon: Sparkles },
  { id: "gps", label: "GPS & Thời gian", icon: MapPin },
  { id: "signature", label: "Chữ ký số", icon: PenTool },
];

const MOCK_COORDS = { lat: 10.8231, lng: 106.6297 };

export default function AuditWizardPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { getOrderById, getOrderListing, completeAudit } = useOrders();

  const order = getOrderById(orderId);
  const listing = getOrderListing(order);

  const [currentStep, setCurrentStep] = useState(0);
  const [angles, setAngles] = useState(
    ANGLES.reduce((acc, a) => ({ ...acc, [a.key]: false }), {})
  );
  const [videoChecked, setVideoChecked] = useState(false);
  const [hygieneChecked, setHygieneChecked] = useState(false);
  const [gpsData, setGpsData] = useState(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultHash, setResultHash] = useState(null);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#0f7a4b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [currentStep]);

  if (!user) return null;

  if (!order) {
    return (
      <div className="dashboard-page animate-fade-up">
        <EmptyState
          icon="FileQuestion"
          title="Không tìm thấy đơn hàng"
          description="Đơn hàng này không tồn tại."
          action={
            <Link href="/dashboard/audit" className="btn btn-primary">
              Về Green Audit
            </Link>
          }
        />
      </div>
    );
  }

  const auditType =
    order.lenderId === user.id && order.status === "paid"
      ? "pickup"
      : order.renterId === user.id && order.status === "in_use"
      ? "return"
      : null;

  if (!auditType && !submitted) {
    return (
      <div className="dashboard-page animate-fade-up">
        <div className="panel mt-6">
          <EmptyState
            icon="ShieldOff"
            title="Không cần kiểm định lúc này"
            description="Đơn hàng này không ở trạng thái cần thực hiện Green Audit đối với bạn."
            action={
              <Link href={`/dashboard/orders/${order.id}`} className="btn btn-primary">
                Xem chi tiết đơn hàng
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const toggleAngle = (key) =>
    setAngles((a) => ({ ...a, [key]: !a[key] }));

  const allAnglesDone = Object.values(angles).every(Boolean);

  const confirmGps = () => {
    setGpsData({
      lat: (MOCK_COORDS.lat + (Math.random() - 0.5) * 0.001).toFixed(4),
      lng: (MOCK_COORDS.lng + (Math.random() - 0.5) * 0.001).toFixed(4),
      timestamp: new Date().toISOString(),
    });
  };

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = () => {
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const stepReady = [allAnglesDone, videoChecked, hygieneChecked, !!gpsData, hasSignature];
  const canProceed = stepReady[currentStep];

  const handleComplete = () => {
    const hash = generateMockHash(`${order.id}-${auditType}`);
    completeAudit(order.id, auditType, hash);
    setResultHash(hash);
    setSubmitted(true);
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(resultHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (submitted) {
    return (
      <div className="dashboard-page animate-fade-up">
        <div className="panel dashboard-audit-success">
          <div className="empty-state__icon" style={{ margin: "0 auto" }}>
            <CheckCircle2 size={28} className="text-green" />
          </div>
          <h2 className="mt-4 text-center">Kiểm định hoàn tất!</h2>
          <p className="text-muted text-center mt-2">
            Dữ liệu Green Audit{" "}
            {auditType === "pickup" ? "giao đi" : "trả đồ"} đã được băm và ghi
            nhận. Mã hash sau đại diện cho toàn bộ dữ liệu kiểm định.
          </p>
          <div className="dashboard-hash-display mt-4">
            <code>{resultHash}</code>
            <button type="button" className="btn btn-ghost btn-icon" onClick={handleCopy}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="flex justify-center gap-3 mt-6">
            <Link href={`/dashboard/orders/${order.id}`} className="btn btn-primary">
              Xem đơn hàng
            </Link>
            <Link href="/dashboard/audit" className="btn btn-secondary">
              Về Green Audit
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>Green Audit - {auditType === "pickup" ? "Giao đi" : "Trả đồ"}</h1>
          <p className="text-muted mt-2">
            {listing?.title} · Đơn {order.id}
          </p>
        </div>
      </div>

      <div className="dashboard-stepper mt-6">
        {STEPS.map((step, idx) => {
          const StepIcon = step.icon;
          const done = stepReady[idx] && idx !== currentStep;
          const active = idx === currentStep;
          return (
            <button
              key={step.id}
              type="button"
              className={`dashboard-stepper__item ${
                active ? "dashboard-stepper__item--active" : ""
              } ${done ? "dashboard-stepper__item--done" : ""}`.trim()}
              onClick={() => idx < currentStep && setCurrentStep(idx)}
              disabled={idx > currentStep}
            >
              <span className="dashboard-stepper__dot">
                {done ? <CheckCircle2 size={14} /> : <StepIcon size={14} />}
              </span>
              <span className="dashboard-stepper__label">{step.label}</span>
            </button>
          );
        })}
      </div>

      <div className="panel mt-6">
        {currentStep === 0 && (
          <div>
            <h2 className="panel-title mb-2">Chụp 5 góc kiểm tra</h2>
            <p className="text-sm text-muted mb-4">
              Chụp ảnh theo lưới canh khung (grid overlay) để đảm bảo góc nhìn
              chuẩn hóa, dễ đối chiếu khi có tranh chấp.
            </p>
            <div className="dashboard-audit-angles">
              {ANGLES.map((angle) => (
                <div
                  key={angle.key}
                  className={`dashboard-audit-angle ${
                    angles[angle.key] ? "dashboard-audit-angle--done" : ""
                  }`}
                >
                  <div className="dashboard-audit-angle__frame">
                    <div className="dashboard-audit-angle__grid" />
                    {angles[angle.key] && (
                      <div className="dashboard-audit-angle__check">
                        <CheckCircle2 size={22} />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold mt-2">{angle.label}</span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm mt-2"
                    onClick={() => toggleAngle(angle.key)}
                  >
                    {angles[angle.key] ? "Đã chụp ✓" : "Đánh dấu đã chụp"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div>
            <h2 className="panel-title mb-2">Video kiểm tra chức năng</h2>
            <p className="text-sm text-muted mb-4">
              Quay video 15 giây thể hiện tài sản hoạt động bình thường (VD:
              bật máy, mở khóa, kiểm tra chuyển động).
            </p>
            <div className="dashboard-audit-video">
              <Video size={28} />
              <span className="text-sm text-muted">Video mock 15s</span>
            </div>
            <label className="dashboard-checkbox mt-4">
              <input
                type="checkbox"
                checked={videoChecked}
                onChange={(e) => setVideoChecked(e.target.checked)}
              />
              <span>Tôi xác nhận đã quay video kiểm tra chức năng</span>
            </label>
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h2 className="panel-title mb-2">Xác nhận vệ sinh</h2>
            <p className="text-sm text-muted mb-4">
              Tài sản đã được vệ sinh, khử khuẩn đạt chuẩn Reloo-Care trước khi
              giao/nhận.
            </p>
            <label className="dashboard-checkbox">
              <input
                type="checkbox"
                checked={hygieneChecked}
                onChange={(e) => setHygieneChecked(e.target.checked)}
              />
              <span>Tài sản đã được vệ sinh và khử khuẩn đạt chuẩn</span>
            </label>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h2 className="panel-title mb-2">Định vị GPS & Thời gian</h2>
            <p className="text-sm text-muted mb-4">
              Ghi nhận vị trí và mốc thời gian thực hiện kiểm định để chống
              giả mạo.
            </p>
            {gpsData ? (
              <div className="dashboard-gps-box">
                <MapPin size={18} />
                <div>
                  <span className="text-sm font-semibold">
                    {gpsData.lat}, {gpsData.lng}
                  </span>
                  <span className="text-xs text-muted block">
                    {new Date(gpsData.timestamp).toLocaleString("vi-VN")}
                  </span>
                </div>
              </div>
            ) : (
              <button type="button" className="btn btn-primary" onClick={confirmGps}>
                <MapPin size={16} /> Xác nhận vị trí & thời gian hiện tại
              </button>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div>
            <h2 className="panel-title mb-2">Chữ ký số xác nhận</h2>
            <p className="text-sm text-muted mb-4">
              Ký tên để xác nhận toàn bộ nội dung kiểm định Green Audit là
              chính xác.
            </p>
            <canvas
              ref={canvasRef}
              width={480}
              height={180}
              className="dashboard-signature-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
            <button
              type="button"
              className="btn btn-ghost btn-sm mt-2"
              onClick={clearSignature}
            >
              Xóa chữ ký
            </button>
          </div>
        )}

        <div className="dashboard-form-actions mt-6">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
            disabled={currentStep === 0}
          >
            Quay lại
          </button>
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canProceed}
              onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}
            >
              Tiếp theo
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canProceed}
              onClick={handleComplete}
            >
              Hoàn tất kiểm định
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
