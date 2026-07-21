"use client";

import Link from "next/link";
import {
  CalendarCheck,
  ClipboardCheck,
  Handshake,
  PackageCheck,
  ShieldCheck,
} from "lucide-react";

import { RENTAL_OPERATION_STEPS } from "@/lib/rental-operation-policy";

const STEP_ICONS = {
  book: CalendarCheck,
  confirm: ClipboardCheck,
  handover: Handshake,
  use: ShieldCheck,
  return: PackageCheck,
};

export function RentalOperationSteps({ compact = false, showGuideLink = true }) {
  return (
    <section
      className={`rental-op-steps${compact ? " rental-op-steps--compact" : ""}`}
      aria-label="Quy trình thuê trên RELOO"
    >
      <div className="rental-op-steps__header">
        <h2 className="rental-op-steps__title">
          {compact ? "Quy trình thuê" : "Quy trình thuê A → Z"}
        </h2>
        {showGuideLink && (
          <Link href="/cms/rental-guide" className="rental-op-steps__link text-sm">
            Xem chi tiết
          </Link>
        )}
      </div>
      <ol className="rental-op-steps__list">
        {RENTAL_OPERATION_STEPS.map((item) => {
          const Icon = STEP_ICONS[item.id] ?? CalendarCheck;
          return (
            <li key={item.id} className="rental-op-steps__item">
              <span className="rental-op-steps__badge" aria-hidden="true">
                {item.step}
              </span>
              <div className="rental-op-steps__icon" aria-hidden="true">
                <Icon size={18} />
              </div>
              <div className="rental-op-steps__body">
                <strong>{item.title}</strong>
                {!compact && <p>{item.description}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
