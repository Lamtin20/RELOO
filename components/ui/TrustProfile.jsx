"use client";

import {
  ShieldCheck,
  BadgeCheck,
  Award,
} from "lucide-react";
import { KYC_LEVELS } from "@/lib/constants";
import { calcTrustScore } from "@/lib/utils";
import { analyzeTrustBehavior, getDepositLabel } from "@/lib/trust-behavior";
import { TrustScore } from "./TrustScore";
import { CustomerBehaviorChart } from "@/components/trust/CustomerBehaviorChart";

function getTierLabel(score) {
  if (score >= 800) return { label: "Xuất sắc", color: "var(--green)" };
  if (score >= 700) return { label: "Tốt", color: "var(--blue)" };
  if (score >= 600) return { label: "Khá", color: "#0ea5e9" };
  if (score >= 500) return { label: "Trung bình", color: "var(--warning)" };
  return { label: "Cần cải thiện", color: "var(--danger)" };
}

export function TrustProfile({
  user,
  variant = "full",
  className = "",
}) {
  if (!user) return null;

  const total = user.trustScore ?? calcTrustScore(user);
  const analysis = analyzeTrustBehavior(user);
  const tier = getTierLabel(total);
  const kycInfo = KYC_LEVELS[user.kycLevel] ?? KYC_LEVELS.L1;
  const ringScore = Math.round(total / 10);

  if (variant === "compact") {
    return (
      <div className={`trust-profile trust-profile--compact ${className}`.trim()}>
        <TrustScore score={ringScore} size={64} />
        <div className="trust-profile__compact-meta">
          <strong style={{ color: tier.color }}>{tier.label}</strong>
          <span>{total} / 1000 điểm uy tín</span>
          <span className="text-muted text-xs">{getDepositLabel(analysis)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`trust-profile ${className}`.trim()}>
      <div className="trust-profile__hero panel">
        <div className="trust-profile__score-block">
          <TrustScore score={ringScore} size={variant === "panel" ? 88 : 112} showLabel={false} />
          <div className="trust-profile__score-text">
            <span className="trust-profile__score-value" style={{ color: tier.color }}>
              {total}
            </span>
            <span className="trust-profile__score-max">/ 1000 điểm uy tín</span>
            <span className="trust-profile__tier" style={{ background: `${tier.color}18`, color: tier.color }}>
              <Award size={14} />
              {tier.label}
            </span>
          </div>
        </div>

        <div className="trust-profile__summary">
          <div className="trust-profile__pill">
            <BadgeCheck size={16} />
            <div>
              <strong>{kycInfo.name}</strong>
              <span>{user.kycLevel} · định danh đã xác thực</span>
            </div>
          </div>
          <div className="trust-profile__pill">
            <ShieldCheck size={16} />
            <div>
              <strong>Mức ký quỹ hiện tại</strong>
              <span>{getDepositLabel(analysis)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="trust-profile__behavior panel">
        <h3 className="panel-title">Phân tích hành vi thuê</h3>
        <CustomerBehaviorChart user={user} variant="full" />
      </div>
    </div>
  );
}
