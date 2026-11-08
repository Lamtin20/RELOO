"use client";

import { useParams } from "next/navigation";

import { MarketplaceShell } from "@/components/layout/MarketplaceShell";
import { EmptyState } from "@/components/ui";
import { useReloo } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { LegalDocument } from '@/components/privacy/LegalDocument';

function renderInline(text, keyPrefix) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={`${keyPrefix}-${i}`}>{part}</strong> : part
  );
}

function renderMarkdown(content) {
  const lines = content.split("\n");
  const elements = [];
  let listBuffer = [];

  function flushList(key) {
    if (listBuffer.length) {
      elements.push(
        <ul key={`ul-${key}`} className="cms-list">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  }

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      flushList(idx);
      return;
    }
    if (line.startsWith("## ")) {
      flushList(idx);
      elements.push(<h2 key={idx}>{renderInline(line.slice(3), `h2-${idx}`)}</h2>);
      return;
    }
    if (line.startsWith("# ")) {
      flushList(idx);
      elements.push(<h1 key={idx}>{renderInline(line.slice(2), `h1-${idx}`)}</h1>);
      return;
    }
    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      return;
    }
    flushList(idx);
    elements.push(<p key={idx}>{renderInline(line, `p-${idx}`)}</p>);
  });
  flushList("end");
  return elements;
}

export default function CmsPage() {
  const params = useParams();
  const { state } = useReloo();
  const page = state.cmsPages.find((p) => p.slug === params.slug && p.published);
  if(['terms','rental-guide','help','privacy-annex','deposit-terms'].includes(params.slug))return <MarketplaceShell><article className="container cms-page"><LegalDocument slug={params.slug}/></article></MarketplaceShell>;

  if (!page) {
    return (
      <MarketplaceShell>
        <div className="container" style={{ padding: "64px 0" }}>
          <EmptyState
            icon="FileQuestion"
            title="Không tìm thấy trang"
            description="Trang bạn tìm không tồn tại hoặc chưa được xuất bản."
          />
        </div>
      </MarketplaceShell>
    );
  }

  return (
    <MarketplaceShell>
      <article className="container cms-page">
        <div className="cms-page__meta text-muted text-sm">
          Cập nhật lần cuối: {formatDate(page.updatedAt)}
        </div>
        <div className="cms-page__content">{renderMarkdown(page.content)}</div>

        {page.faqs && page.faqs.length > 0 && (
          <div className="cms-page__faqs">
            {page.faqs.map((faq) => (
              <details key={faq.id} className="cms-faq">
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        )}
      </article>
    </MarketplaceShell>
  );
}
