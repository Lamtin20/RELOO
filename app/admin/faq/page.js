"use client";

import { useState } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";
import { useReloo } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";

export default function FaqPage() {
  const { state, actions } = useReloo();
  const faqPage = state.cmsPages.find((p) => p.faqs);
  const faqs = faqPage?.faqs || [];

  const [expanded, setExpanded] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [newFaq, setNewFaq] = useState({ question: "", answer: "" });

  if (!faqPage) {
    return <EmptyState title="Không có trang FAQ" description="Chưa cấu hình dữ liệu FAQ trong CMS." />;
  }

  const saveFaqs = (nextFaqs) => actions.updateCms(faqPage.id, { faqs: nextFaqs });

  const startEdit = (faq) => {
    setExpanded(faq.id);
    setDrafts((d) => ({ ...d, [faq.id]: { question: faq.question, answer: faq.answer } }));
  };

  const commitEdit = (faqId) => {
    const draft = drafts[faqId];
    if (!draft) return;
    saveFaqs(faqs.map((f) => (f.id === faqId ? { ...f, ...draft } : f)));
    setExpanded(null);
  };

  const deleteFaq = (faqId) => {
    saveFaqs(faqs.filter((f) => f.id !== faqId));
  };

  const addFaq = (e) => {
    e.preventDefault();
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    saveFaqs([...faqs, { id: `faq_${Date.now()}`, question: newFaq.question, answer: newFaq.answer }]);
    setNewFaq({ question: "", answer: "" });
  };

  return (
    <div>
      <PageHeader
        title="Quản lý FAQ"
        description="Câu hỏi thường gặp hiển thị tại Trung tâm trợ giúp RELOO."
      />

      <div className="panel mb-4">
        <div className="panel-header">
          <span className="panel-title flex items-center gap-2">
            <Plus size={16} /> Thêm câu hỏi mới
          </span>
        </div>
        <form onSubmit={addFaq} className="flex flex-col gap-3">
          <div className="input-group">
            <label className="input-label">Câu hỏi</label>
            <input
              className="input"
              value={newFaq.question}
              onChange={(e) => setNewFaq((f) => ({ ...f, question: e.target.value }))}
              placeholder="Ví dụ: Làm sao để hủy đơn hàng?"
            />
          </div>
          <div className="input-group">
            <label className="input-label">Câu trả lời</label>
            <textarea
              className="textarea"
              rows={3}
              value={newFaq.answer}
              onChange={(e) => setNewFaq((f) => ({ ...f, answer: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary">
              <Plus size={16} /> Thêm FAQ
            </button>
          </div>
        </form>
      </div>

      {faqs.length === 0 ? (
        <EmptyState title="Chưa có FAQ" description="Thêm câu hỏi đầu tiên ở trên." />
      ) : (
        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => {
            const isOpen = expanded === faq.id;
            const draft = drafts[faq.id] || { question: faq.question, answer: faq.answer };
            return (
              <div className="panel" key={faq.id}>
                <div
                  className="flex items-center justify-between gap-3"
                  style={{ cursor: "pointer" }}
                  onClick={() => (isOpen ? setExpanded(null) : startEdit(faq))}
                >
                  <span className="font-semibold text-sm">
                    {idx + 1}. {faq.question}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFaq(faq.id);
                      }}
                      title="Xóa"
                    >
                      <Trash2 size={15} color="var(--danger)" />
                    </button>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {isOpen ? (
                  <div className="flex flex-col gap-3 mt-3">
                    <div className="input-group">
                      <label className="input-label">Câu hỏi</label>
                      <input
                        className="input"
                        value={draft.question}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [faq.id]: { ...draft, question: e.target.value } }))
                        }
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Câu trả lời</label>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={draft.answer}
                        onChange={(e) =>
                          setDrafts((d) => ({ ...d, [faq.id]: { ...draft, answer: e.target.value } }))
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setExpanded(null)}>
                        Hủy
                      </button>
                      <button type="button" className="btn btn-primary" onClick={() => commitEdit(faq.id)}>
                        <Save size={15} /> Lưu
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted mt-2">{faq.answer}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
