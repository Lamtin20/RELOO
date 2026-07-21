"use client";

import { useMemo } from "react";
import { Activity, Info, ShieldCheck } from "lucide-react";
import { analyzeTrustBehavior, getDepositLabel } from "@/lib/trust-behavior";
import { calcDepositForUser } from "@/lib/deposit-policy";
import { formatVND } from "@/lib/utils";

const TONE_COLORS = {
  green: "#0f7a4b",
  blue: "#2563eb",
  amber: "#d97706",
  red: "#dc2626",
};

function RadarChart({ dimensions, size = 160 }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.38;
  const angles = dimensions.map((_, i) => (Math.PI * 2 * i) / dimensions.length - Math.PI / 2);

  const gridLevels = [0.25, 0.5, 0.75, 1];

  const dataPoints = dimensions.map((d, i) => {
    const r = (d.score / 100) * maxR;
    return {
      x: cx + r * Math.cos(angles[i]),
      y: cy + r * Math.sin(angles[i]),
    };
  });

  const polygon = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg
      className="behavior-chart__radar"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Biểu đồ phân tích hành vi thuê"
    >
      {gridLevels.map((level) => (
        <polygon
          key={level}
          points={angles
            .map((a) => {
              const r = maxR * level;
              return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
            })
            .join(" ")}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      {angles.map((a, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={cx + maxR * Math.cos(a)}
          y2={cy + maxR * Math.sin(a)}
          stroke="#e5e7eb"
          strokeWidth="1"
        />
      ))}

      <polygon
        points={polygon}
        fill="rgba(37, 99, 235, 0.18)"
        stroke="#2563eb"
        strokeWidth="2"
      />

      {dataPoints.map((p, i) => (
        <circle key={dimensions[i].id} cx={p.x} cy={p.y} r="4" fill="#2563eb" />
      ))}

      {dimensions.map((d, i) => {
        const labelR = maxR + 14;
        const x = cx + labelR * Math.cos(angles[i]);
        const y = cy + labelR * Math.sin(angles[i]);
        return (
          <text
            key={d.id}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="behavior-chart__axis-label"
          >
            {d.shortLabel}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * Biểu đồ phân tích hành vi khách hàng + tiêu chí đánh giá
 * @param {'full'|'compact'} variant
 */
export function CustomerBehaviorChart({
  user,
  assetValue = null,
  variant = "full",
  className = "",
}) {
  const analysis = useMemo(() => (user ? analyzeTrustBehavior(user) : null), [user]);

  if (!user || !analysis) {
    return (
      <div className={`behavior-chart behavior-chart--guest ${className}`.trim()}>
        <p className="text-sm text-muted">
          Đăng nhập để xem phân tích hành vi và mức ký quỹ dự kiến cho tài khoản của bạn.
        </p>
      </div>
    );
  }

  const depositAmount =
    assetValue && assetValue > 0
      ? calcDepositForUser(user, assetValue, analysis.totalScore)
      : null;

  const isCompact = variant === "compact";

  return (
    <div className={`behavior-chart ${isCompact ? "behavior-chart--compact" : ""} ${className}`.trim()}>
      <div className="behavior-chart__info">
        <Info size={14} className="behavior-chart__info-icon" />
        <p className="behavior-chart__info-text">
          RELOO tự động phân tích hành vi thuê qua{" "}
          <strong>eKYC</strong>, <strong>lịch sử giao dịch</strong>,{" "}
          <strong>đánh giá từ chủ đồ</strong> và <strong>tuân thủ quy định</strong>.
          Kết quả cập nhật liên tục — Rule Engine quyết định, không can thiệp thủ công.
        </p>
      </div>

      <div className="behavior-chart__visual">
        <RadarChart dimensions={analysis.dimensions} size={isCompact ? 140 : 168} />
        <div className="behavior-chart__score-pill">
          <Activity size={14} />
          <strong>{analysis.totalScore}</strong>
          <span>/ 1000 uy tín</span>
        </div>
      </div>

      <ul className="behavior-chart__criteria">
        {analysis.dimensions.map((d) => (
          <li key={d.id} className="behavior-chart__criterion">
            <div className="behavior-chart__criterion-head">
              <span className="behavior-chart__criterion-label">{d.label}</span>
              <span
                className="behavior-chart__criterion-badge"
                style={{
                  color: TONE_COLORS[d.tone] ?? TONE_COLORS.blue,
                  background: `${TONE_COLORS[d.tone] ?? TONE_COLORS.blue}14`,
                }}
              >
                {d.label.split(" ")[0]} · {d.score}%
              </span>
            </div>
            <div className="behavior-chart__bar">
              <span
                className="behavior-chart__bar-fill"
                style={{
                  width: `${d.score}%`,
                  background: TONE_COLORS[d.tone] ?? TONE_COLORS.blue,
                }}
              />
            </div>
            <p className="behavior-chart__criterion-insight">{d.insight}</p>
            {!isCompact && (
              <p className="behavior-chart__criterion-detail">{d.detail}</p>
            )}
          </li>
        ))}
      </ul>

      <div className="behavior-chart__deposit">
        <ShieldCheck size={15} />
        <div>
          <strong>Tài khoản ký quỹ dự kiến</strong>
          <p className="text-sm text-muted">
            {getDepositLabel(analysis)}
            {depositAmount != null && depositAmount > 0 && (
              <> · <strong>{formatVND(depositAmount)}</strong> cho tài sản này</>
            )}
            {depositAmount === 0 && assetValue > 0 && (
              <> · <strong>Miễn cọc</strong> cho tài sản này</>
            )}
          </p>
          {!analysis.deposit.isPremium && (
            <p className="behavior-chart__deposit-note text-xs text-muted">
              Khách chuẩn: giảm cọc tối đa {analysis.deposit.maxStandardReduction}% so với mức đầy đủ.
              Nhóm cao cấp được xét duyệt định kỳ mới có thể giảm sâu hơn.
            </p>
          )}
          {analysis.deposit.isPremium && analysis.deposit.approvedUntil && (
            <p className="behavior-chart__deposit-note text-xs text-muted">
              Ưu đãi cao cấp có hiệu lực đến{" "}
              {new Date(analysis.deposit.approvedUntil).toLocaleDateString("vi-VN")}.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
