"use client";

import { useState } from "react";
import { ChevronDown, LifeBuoy, Mail, Phone } from "lucide-react";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { useReloo } from "@/lib/store";

export default function HelpPage() {
  const { state } = useReloo();
  const helpPage = state.cmsPages.find((p) => p.slug === "help");
  const faqs = helpPage?.faqs || [];
  const [openId, setOpenId] = useState(faqs[0]?.id ?? null);

  return (
    <MarketplaceShell>
      <div className="container help-page">
        <div className="help-page__intro">
          <h1>Trung tâm trợ giúp</h1>
          <p className="text-muted">
            Giải đáp nhanh các câu hỏi thường gặp về RELOO, Green Audit, Trust Score và chính
            sách thuê đồ.
          </p>
        </div>

        <div className="faq-accordion">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div key={faq.id} className={`faq-item ${isOpen ? "faq-item--open" : ""}`}>
                <button
                  type="button"
                  className="faq-item__question"
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown size={17} className="faq-item__chevron" />
                </button>
                {isOpen && <div className="faq-item__answer">{faq.answer}</div>}
              </div>
            );
          })}
        </div>

        <div className="panel help-page__contact">
          <LifeBuoy size={28} className="text-green" style={{ margin: "0 auto 12px" }} />
          <h3>Vẫn cần hỗ trợ?</h3>
          <p className="text-muted mt-2">
            Đội ngũ CSKH RELOO luôn sẵn sàng hỗ trợ bạn 24/7.
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <span className="flex items-center gap-2">
              <Phone size={15} className="text-green" /> {state.settings?.supportHotline}
            </span>
            <span className="flex items-center gap-2">
              <Mail size={15} className="text-green" /> {state.settings?.supportEmail}
            </span>
          </div>
        </div>
      </div>
    </MarketplaceShell>
  );
}
