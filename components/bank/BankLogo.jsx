"use client";

import { useState } from "react";

export function BankLogo({ bank, size = "md", className = "" }) {
  const [failed, setFailed] = useState(false);
  const logo = bank?.logo ?? bank?.bankLogo;
  const shortLabel = bank?.shortName || bank?.bankShortName || bank?.code || bank?.bankCode || "?";
  const sizeClass =
    size === "sm" ? "bank-logo-wrapper--sm" : size === "lg" ? "bank-logo-wrapper--lg" : "";

  if (!logo || failed) {
    return (
      <span
        className={`bank-logo-wrapper bank-logo-fallback ${sizeClass} ${className}`.trim()}
        aria-hidden="true"
      >
        {shortLabel.slice(0, 4).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={`bank-logo-wrapper ${sizeClass} ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        className="bank-logo"
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
