"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Save, Eye } from "lucide-react";
import { useReloo } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatDateTime } from "@/lib/utils";

export default function CmsEditorPage() {
  const { id } = useParams();
  const { state, actions } = useReloo();
  const page = state.cmsPages.find((p) => p.id === id);

  const [form, setForm] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    if (page) {
      setForm({
        title: page.title,
        slug: page.slug,
        metaDescription: page.metaDescription || "",
        content: page.content || "",
        published: !!page.published,
      });
    }
  }, [page]);

  if (!page || !form) {
    return (
      <EmptyState
        title="Không tìm thấy trang"
        description="Trang CMS này không tồn tại."
        action={
          <Link href="/admin/cms" className="btn btn-secondary">
            Về danh sách trang
          </Link>
        }
      />
    );
  }

  const save = () => {
    actions.updateCms(page.id, form);
    setSavedAt(new Date());
  };

  return (
    <div>
      <PageHeader
        title={`Chỉnh sửa: ${page.title}`}
        description={`Cập nhật lần cuối: ${formatDateTime(page.updatedAt)}`}
        backHref="/admin/cms"
        backLabel="Trang nội dung"
        actions={
          <>
            <button
              type="button"
              className={`toggle${form.published ? " toggle--on" : ""}`}
              onClick={() => setForm((f) => ({ ...f, published: !f.published }))}
              aria-label="Xuất bản"
            />
            <span className="text-sm text-muted">{form.published ? "Đã xuất bản" : "Bản nháp"}</span>
            <button type="button" className="btn btn-primary" onClick={save}>
              <Save size={16} /> Lưu thay đổi
            </button>
          </>
        }
      />

      {savedAt && (
        <div className="panel mb-4" style={{ borderColor: "var(--green)", background: "var(--success-light)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--green-dark)" }}>
            ✓ Đã lưu vào hệ thống lúc {formatDateTime(savedAt.toISOString())}
          </span>
        </div>
      )}

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="input-group mb-3">
              <label className="input-label">Tiêu đề trang</label>
              <input
                className="input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="input-group mb-3">
              <label className="input-label">Slug (URL)</label>
              <input
                className="input"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
              <span className="input-hint">reloo.vn/{form.slug}</span>
            </div>
            <div className="input-group">
              <label className="input-label">Meta description (SEO)</label>
              <textarea
                className="textarea"
                rows={2}
                value={form.metaDescription}
                onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Nội dung (Markdown)</span>
            </div>
            <textarea
              className="textarea"
              rows={20}
              style={{ fontFamily: "monospace", fontSize: 13 }}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Eye size={16} /> Xem trước
              </span>
            </div>
            <div
              className="text-sm"
              style={{ whiteSpace: "pre-wrap", maxHeight: 480, overflowY: "auto", lineHeight: 1.7 }}
            >
              {renderMarkdownPreview(form.content)}
            </div>
          </div>
          {page.faqs && (
            <div className="panel">
              <span className="panel-title">Trang này có FAQ riêng</span>
              <p className="text-sm text-muted mt-2">
                Quản lý câu hỏi thường gặp tại mục{" "}
                <Link href="/admin/faq" className="text-blue font-medium">
                  FAQ
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderMarkdownPreview(content) {
  if (!content) return <span className="text-muted">Chưa có nội dung.</span>;
  return content.split("\n").map((line, i) => {
    if (line.startsWith("## ")) {
      return <h3 key={i} style={{ marginTop: 12, marginBottom: 4 }}>{line.replace("## ", "")}</h3>;
    }
    if (line.startsWith("# ")) {
      return <h2 key={i} style={{ marginTop: 12, marginBottom: 6 }}>{line.replace("# ", "")}</h2>;
    }
    if (line.startsWith("- ")) {
      return <div key={i} style={{ paddingLeft: 14 }}>• {line.replace("- ", "")}</div>;
    }
    if (!line.trim()) {
      return <div key={i} style={{ height: 8 }} />;
    }
    return <p key={i}>{line}</p>;
  });
}
