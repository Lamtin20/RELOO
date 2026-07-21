function getScoreColor(score) {
  if (score >= 80) return "var(--green)";
  if (score >= 50) return "var(--blue)";
  if (score >= 30) return "var(--warning)";
  return "var(--danger)";
}

function getScoreLabel(score) {
  if (score >= 80) return "Tin cậy";
  if (score >= 50) return "Khá tốt";
  if (score >= 30) return "Trung bình";
  return "Thấp";
}

export function TrustScore({
  score = 0,
  size = 80,
  showLabel = true,
  className = "",
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = getScoreColor(clamped);
  const label = getScoreLabel(clamped);

  return (
    <div
      className={`trust-ring ${className}`.trim()}
      style={{ width: size, height: size }}
      title={`Điểm tin cậy: ${clamped}/100`}
    >
      <svg
        className="trust-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          className="trust-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <circle
          className="trust-ring__progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="trust-ring__value">
        <span style={{ fontSize: size * 0.22, color }}>{clamped}</span>
        {showLabel && (
          <span className="trust-ring__label" style={{ fontSize: size * 0.1 }}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
