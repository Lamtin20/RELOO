"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IdCard,
  ScanFace,
  MapPin,
  Check,
  Camera,
  Loader2,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Building2,
  Info,
} from "lucide-react";

import { useAuth } from "@/lib/store";
import { KYC_LEVELS, TRUST_SCORE } from "@/lib/constants";
import { calcTrustScore } from "@/lib/utils";
import { LocationPicker } from "@/components/location/LocationPicker";
import { formatAddressString } from "@/lib/vn-address";

const STEPS = [
  { id: 1, label: "Chụp CCCD", icon: IdCard },
  { id: 2, label: "Face Match", icon: ScanFace },
  { id: 3, label: "Địa chỉ", icon: MapPin },
  { id: 4, label: "Xác nhận", icon: Check },
];

function useMockUpload() {
  const [state, setState] = useState({ status: "idle", progress: 0 });
  const timerRef = useRef(null);

  function start(onDone) {
    clearInterval(timerRef.current);
    setState({ status: "uploading", progress: 0 });
    timerRef.current = setInterval(() => {
      setState((s) => {
        const next = Math.min(100, s.progress + 12 + Math.random() * 10);
        if (next >= 100) {
          clearInterval(timerRef.current);
          setTimeout(() => {
            setState({ status: "done", progress: 100 });
            onDone?.();
          }, 200);
          return { status: "uploading", progress: 100 };
        }
        return { status: "uploading", progress: next };
      });
    }, 220);
  }

  function reset() {
    clearInterval(timerRef.current);
    setState({ status: "idle", progress: 0 });
  }

  return { ...state, start, reset };
}

function UploadTile({ title, hint, state, onStart, thumbSrc }) {
  return (
    <button
      type="button"
      className={`kyc-upload ${state.status === "done" ? "kyc-upload--done" : ""}`}
      onClick={() => state.status !== "uploading" && onStart()}
    >
      {state.status === "done" ? (
        <div className="kyc-upload__thumb">
          <img src={thumbSrc} alt={title} />
          <span className="kyc-upload__done">
            <Check size={14} /> Đã tải lên
          </span>
        </div>
      ) : state.status === "uploading" ? (
        <div className="kyc-upload__loading">
          <Loader2 size={22} className="spin" />
          <span>Đang tải... {Math.round(state.progress)}%</span>
          <div className="kyc-upload__bar">
            <div style={{ width: `${state.progress}%` }} />
          </div>
        </div>
      ) : (
        <>
          <Camera size={22} />
          <strong>{title}</strong>
          <span>{hint}</span>
        </>
      )}
    </button>
  );
}

export default function KycVerifyPage() {
  const router = useRouter();
  const { user, updateKyc, updateProfile } = useAuth();

  const [step, setStep] = useState(1);
  const [idNumber, setIdNumber] = useState("");
  const [dob, setDob] = useState("");
  const [street, setStreet] = useState("");
  const [location, setLocation] = useState({ province: null, ward: null });
  const [faceStatus, setFaceStatus] = useState("idle");

  const frontUpload = useMockUpload();
  const backUpload = useMockUpload();
  const selfieUpload = useMockUpload();

  const totalScore = user
    ? user.trustScore ?? calcTrustScore(user)
    : 0;

  const canNextStep1 = frontUpload.status === "done" && backUpload.status === "done" && idNumber.length >= 9;
  const canNextStep2 = selfieUpload.status === "done" && faceStatus === "verified";
  const canNextStep3 = !!(location.province && location.ward && street.trim().length >= 3);

  const finalAddress = formatAddressString({
    street: street.trim(),
    ward: location.ward,
    province: location.province,
  });

  function runFaceCheck() {
    setFaceStatus("checking");
    setTimeout(() => setFaceStatus("verified"), 1600);
  }

  function handleFinish() {
    if (!user) return;
    updateKyc("L2");
    if (finalAddress) updateProfile({ address: finalAddress });
    router.push("/dashboard/kyc?upgraded=1");
  }

  if (!user) {
    return (
      <div className="dashboard-page">
        <div className="panel" style={{ padding: 24 }}>
          <p>
            Vui lòng <Link href="/auth" className="auth-wrap__link">đăng nhập</Link> để nâng
            cấp định danh.
          </p>
        </div>
      </div>
    );
  }

  if (user.kycLevel === "L3" || user.kycLevel === "L2") {
    return (
      <div className="dashboard-page">
        <div className="panel kyc-verified">
          <ShieldCheck size={32} className="text-green" />
          <h2>Bạn đã hoàn tất eKYC {user.kycLevel}</h2>
          <p className="text-muted">
            {KYC_LEVELS[user.kycLevel]?.description}. Hạn mức thuê hiện tại:{" "}
            {KYC_LEVELS[user.kycLevel]?.maxRentalValue === Infinity
              ? "Không giới hạn"
              : `${KYC_LEVELS[user.kycLevel]?.maxRentalValue.toLocaleString("vi-VN")}₫`}
          </p>
          <Link href="/dashboard/kyc" className="btn btn-primary">
            Về trang eKYC
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page kyc-verify">
      <div className="kyc-verify__head">
        <div>
          <h1>Nâng cấp lên Cấp 2 - Đã xác thực</h1>
          <p className="text-muted">
            Tăng hạn mức thuê lên 5.000.000₫, nhận thêm +{TRUST_SCORE.kycScores.L2 - TRUST_SCORE.kycScores.L1} điểm Trust Score
          </p>
        </div>
        <div className="kyc-verify__cur">
          <span>Điểm hiện tại</span>
          <strong>{totalScore} / 1000</strong>
        </div>
      </div>

      <ol className="kyc-stepper">
        {STEPS.map((s) => {
          const IconEl = s.icon;
          return (
            <li
              key={s.id}
              className={`kyc-step ${step === s.id ? "kyc-step--active" : ""} ${
                step > s.id ? "kyc-step--done" : ""
              }`}
            >
              <span className="kyc-step__ic">
                {step > s.id ? <Check size={16} /> : <IconEl size={16} />}
              </span>
              <span className="kyc-step__lb">{s.label}</span>
            </li>
          );
        })}
      </ol>

      <div className="panel kyc-panel">
        {step === 1 && (
          <div className="kyc-slide">
            <h2>Chụp CCCD gắn chip</h2>
            <p className="text-muted">
              Chụp rõ 4 góc, không loá sáng, không che số CCCD. Ảnh chỉ dùng để đối chiếu
              danh tính, được mã hoá và lưu trong máy chủ tại Việt Nam theo Nghị định
              13/2023.
            </p>

            <div className="kyc-grid-2">
              <UploadTile
                title="Mặt trước CCCD"
                hint="Bấm để chụp/tải lên"
                state={frontUpload}
                thumbSrc="https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=400"
                onStart={() => frontUpload.start()}
              />
              <UploadTile
                title="Mặt sau CCCD"
                hint="Bấm để chụp/tải lên"
                state={backUpload}
                thumbSrc="https://images.unsplash.com/photo-1608643335055-cb9d1e04fea1?w=400"
                onStart={() => backUpload.start()}
              />
            </div>

            <div className="kyc-grid-2">
              <div className="auth-field">
                <span>Số CCCD (12 số)</span>
                <div className="auth-input">
                  <IdCard size={15} />
                  <input
                    inputMode="numeric"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
                    placeholder="0790xxxxxxxx"
                    maxLength={12}
                  />
                </div>
              </div>
              <div className="auth-field">
                <span>Ngày sinh (dd/mm/yyyy)</span>
                <div className="auth-input">
                  <Building2 size={15} />
                  <input
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    placeholder="01/01/1995"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="kyc-slide">
            <h2>Xác thực khuôn mặt (Liveness)</h2>
            <p className="text-muted">
              Chụp ảnh selfie rõ mặt, không đeo kính râm. Hệ thống so khớp với ảnh trên
              CCCD.
            </p>

            <div className="kyc-face">
              <UploadTile
                title="Chụp selfie"
                hint="Bấm để bật camera"
                state={selfieUpload}
                thumbSrc="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop"
                onStart={() => selfieUpload.start(runFaceCheck)}
              />

              <div className="kyc-face__result">
                <h4>Kết quả so khớp</h4>
                {faceStatus === "idle" && (
                  <p className="text-muted">Chụp selfie để bắt đầu Face Match</p>
                )}
                {faceStatus === "checking" && (
                  <p className="text-muted">
                    <Loader2 size={14} className="spin" /> Đang so khớp với ảnh CCCD...
                  </p>
                )}
                {faceStatus === "verified" && (
                  <>
                    <div className="kyc-face__badge">
                      <Check size={16} /> Khớp 96%
                    </div>
                    <ul className="kyc-face__list">
                      <li>
                        <Check size={12} /> Liveness detection: Passed
                      </li>
                      <li>
                        <Check size={12} /> Face match với CCCD: 96%
                      </li>
                      <li>
                        <Check size={12} /> Không phát hiện deepfake
                      </li>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="kyc-slide">
            <h2>Địa chỉ cư trú</h2>
            <p className="text-muted">
              Địa chỉ dùng để giao/nhận đồ và đối soát trong trường hợp có tranh chấp.
            </p>

            <LocationPicker
              value={location}
              onChange={setLocation}
              includeStreet
              streetValue={street}
              onStreetChange={setStreet}
              autoGeo
              label="Chọn địa chỉ đầy đủ"
            />

            <div className="kyc-info">
              <Info size={15} />
              <div>
                <strong>Thông tin định vị</strong>
                <p>
                  Khi có đơn thuê, RELOO chỉ dùng vị trí trong thời gian thuê để phòng chống
                  gian lận (Geofencing 50km). Ngoài thời gian này, quyền định vị tự động bị
                  huỷ.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="kyc-slide">
            <h2>Xác nhận thông tin</h2>
            <p className="text-muted">Vui lòng kiểm tra lại trước khi hoàn tất eKYC Cấp 2.</p>

            <dl className="kyc-review">
              <div>
                <dt>Họ tên</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Số CCCD</dt>
                <dd>{idNumber || "---"}</dd>
              </div>
              <div>
                <dt>Ngày sinh</dt>
                <dd>{dob || "---"}</dd>
              </div>
              <div>
                <dt>Face Match</dt>
                <dd>96% (đã xác thực)</dd>
              </div>
              <div>
                <dt>Địa chỉ</dt>
                <dd>{finalAddress || "---"}</dd>
              </div>
              <div>
                <dt>Cấp mới</dt>
                <dd>
                  <strong>Cấp 2 - Đã xác thực</strong> (+{TRUST_SCORE.kycScores.L2 - TRUST_SCORE.kycScores.L1} TS)
                </dd>
              </div>
            </dl>

            <p className="kyc-final-note">
              <ShieldCheck size={14} /> Thông tin CCCD được mã hoá AES-256 và chỉ dùng để đối
              soát khi cần thiết. RELOO không chia sẻ dữ liệu này ra bên ngoài.
            </p>
          </div>
        )}

        <div className="kyc-nav">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
              <ArrowLeft size={15} /> Quay lại
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={
                (step === 1 && !canNextStep1) ||
                (step === 2 && !canNextStep2) ||
                (step === 3 && !canNextStep3)
              }
              onClick={() => setStep(step + 1)}
            >
              Tiếp tục <ArrowRight size={15} />
            </button>
          )}
          {step === 4 && (
            <button type="button" className="btn btn-primary btn-lg" onClick={handleFinish}>
              Hoàn tất eKYC Cấp 2 <Check size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
