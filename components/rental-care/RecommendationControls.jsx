"use client";
import { useState } from "react";
import Link from "next/link";
import { careText } from "@/lib/rental-care/content";
import { text as categoryText } from "@/lib/neighborhood/content";
import { usePersonalization, careFetch } from "./PersonalizationProvider";
export function RecommendationControls({
  asset,
  owner,
  category,
  reason,
  locale = "vi-VN",
  onChanged,
  manage = false,
}) {
  const { actor, record, refresh } = usePersonalization(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    t = (k) => careText(locale, k);
  if (!actor) return null;
  async function hide(kind, target, negative = false) {
    if (busy) return;
    setBusy(true);
    try {
      await careFetch("/api/personalization", {
        subject: actor,
        action: "exclude",
        kind,
        target,
        enabled: true,
      });
      if (negative) record("NEGATIVE", { asset });
      setError("");
      refresh();
      await onChanged?.();
    } catch {
      setError("service");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="rc-reco-actions">
      {reason === "interest" && (
        <small>
          {t("interest")} {categoryText(locale, "category:" + category)}
        </small>
      )}
      <button disabled={busy} onClick={() => hide("PRODUCT", asset, true)}>
        {t("negative")}
      </button>
      <button disabled={busy} onClick={() => hide("PRODUCT", asset)}>
        {t("hide")}
      </button>
      {owner && (
        <button disabled={busy} onClick={() => hide("OWNER", owner)}>
          {t("block")}
        </button>
      )}
      {manage && (
        <Link href={"/account/personalization?lang=" + locale}>
          {t("settings")}
        </Link>
      )}
      {error && <small role="alert">{t(error)}</small>}
    </div>
  );
}
