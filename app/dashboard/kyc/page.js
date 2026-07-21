"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IdCard,
  ScanFace,
  Link2,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Crown,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/store";
import { TrustProfile, Badge } from "@/components/ui";
import { KYC_LEVELS } from "@/lib/constants";
import { calcTrustScore } from "@/lib/utils";

export default function KycPage() {
  const { user, updateKyc } = useAuth();

  const [cccdFront, setCccdFront] = useState(false);
  const [cccdBack, setCccdBack] = useState(false);
  const [faceMatch, setFaceMatch] = useState(false);
  const [faceMatching, setFaceMatching] = useState(false);
  const [socialLinked, setSocialLinked] = useState(false);

  if (!user) return null;

  const currentLevel = KYC_LEVELS[user.kycLevel] ?? KYC_LEVELS.L1;
  const totalScore = user.trustScore ?? calcTrustScore(user);

  const runFaceMatch = () => {
    setFaceMatching(true);
    setTimeout(() => {
      setFaceMatch(true);
      setFaceMatching(false);
    }, 1600);
  };

  const canUpgradeL2 = cccdFront && cccdBack && faceMatch;
  const canUpgradeL3 = socialLinked && (user.totalRentals ?? 0) >= 5 && totalScore >= 700;

  return (
    <div className="dashboard-page animate-fade-up">
      <div className="dashboard-page-header">
        <div>
          <h1>eKYC / Điểm uy tín</h1>
          <p className="text-muted mt-2">
            Nâng cấp định danh để tăng hạn mức thuê và giảm tiền cọc
          </p>
        </div>
      </div>

      <TrustProfile user={user} className="mt-6" />

      <div className="panel mt-6">
        <div className="flex items-center gap-4">
          <Badge variant="green">{currentLevel.name}</Badge>
          <div>
            <h2 className="mt-0">{currentLevel.description}</h2>
            <p className="text-sm text-muted mt-1">
              Hạn mức thuê tối đa:{" "}
              {currentLevel.maxRentalValue === Infinity
                ? "Không giới hạn"
                : `${currentLevel.maxRentalValue.toLocaleString("vi-VN")}₫`}
            </p>
          </div>
        </div>
      </div>

      <div className="panel mt-6">
        <div className="panel-header">
          <h2 className="panel-title">Nâng cấp định danh</h2>
        </div>

        {user.kycLevel === "L3" && (
          <div className="dashboard-notice dashboard-notice--success">
            <Crown size={16} />
            <span>
              Bạn đã đạt cấp Premium (L3) - cấp định danh cao nhất trên RELOO!
            </span>
          </div>
        )}

        {user.kycLevel === "L1" && (
          <div className="dashboard-kyc-upgrade">
            <p className="text-sm text-muted mb-4">
              Nâng cấp lên <strong>{KYC_LEVELS.L2.name}</strong> để tăng hạn mức
              thuê lên {KYC_LEVELS.L2.maxRentalValue.toLocaleString("vi-VN")}₫ và
              nhận thêm {KYC_LEVELS.L2.scoreBonus} điểm Trust Score.
            </p>

            <ul className="kyc-req-list">
              <li>
                <IdCard size={15} /> Chụp CCCD gắn chip (2 mặt)
              </li>
              <li>
                <ScanFace size={15} /> Face Match (Liveness check)
              </li>
              <li>
                <Lock size={15} /> Địa chỉ cư trú đầy đủ
              </li>
            </ul>

            <Link
              href="/dashboard/kyc/verify"
              className="btn btn-primary mt-4"
            >
              <ShieldCheck size={16} /> Bắt đầu xác thực CCCD
              <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {user.kycLevel === "L2" && (
          <div className="dashboard-kyc-upgrade">
            <p className="text-sm text-muted mb-4">
              Nâng cấp lên <strong>{KYC_LEVELS.L3.name}</strong> để bỏ giới hạn
              hạn mức thuê và nhận thêm {KYC_LEVELS.L3.scoreBonus} điểm Trust
              Score.
            </p>

            <div className="dashboard-kyc-steps">
              <button
                type="button"
                className={`dashboard-kyc-step ${socialLinked ? "dashboard-kyc-step--done" : ""}`}
                onClick={() => setSocialLinked((v) => !v)}
              >
                <Link2 size={18} />
                <span>Liên kết Facebook/LinkedIn</span>
                {socialLinked && <CheckCircle2 size={16} className="text-green" />}
              </button>

              <div className="dashboard-kyc-requirement">
                {(user.totalRentals ?? 0) >= 5 ? (
                  <CheckCircle2 size={16} className="text-green" />
                ) : (
                  <Lock size={16} className="text-muted" />
                )}
                <span>≥ 5 đơn thuê thành công ({user.totalRentals ?? 0} hiện tại)</span>
              </div>

              <div className="dashboard-kyc-requirement">
                {totalScore >= 700 ? (
                  <CheckCircle2 size={16} className="text-green" />
                ) : (
                  <Lock size={16} className="text-muted" />
                )}
                <span>Trust Score ≥ 700 ({totalScore} hiện tại)</span>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary mt-4"
              disabled={!canUpgradeL3}
              onClick={() => updateKyc("L3")}
            >
              <Crown size={16} /> Nâng cấp lên Level 3
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
