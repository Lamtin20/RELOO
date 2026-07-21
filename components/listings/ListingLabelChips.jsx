"use client";

import { Sparkles, ShieldCheck, Tag, Leaf } from "lucide-react";
import { getListingDisplayLabels } from "@/lib/listing-labels";

const ICONS = {
  priority: Sparkles,
  verified: ShieldCheck,
  deal: Tag,
  care: Leaf,
};

export function ListingLabelChips({ listing, className = "", overlay = false }) {
  const labels = getListingDisplayLabels(listing);
  if (!labels.length) return null;

  return (
    <div
      className={`listing-labels ${overlay ? "listing-labels--overlay" : ""} ${className}`.trim()}
    >
      {labels.map(({ key, text, variant }) => {
        const Icon = ICONS[variant];
        return (
          <span key={key} className={`listing-label listing-label--${variant}`}>
            {Icon && <Icon size={11} strokeWidth={2.25} />}
            {text}
          </span>
        );
      })}
    </div>
  );
}
