"use client";

import { useMemo, useState } from "react";
import { Plus, Phone, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { useReloo } from "@/lib/store";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { LEAD_PIPELINE, getLeadStatusMeta } from "@/lib/admin-helpers";
import { formatDate, isValidPhone, sanitizePhoneInput, PHONE_ERROR } from "@/lib/utils";

const SOURCES = ["Facebook Ads", "Google Search", "Referral", "Zalo OA", "Sự kiện"];

export default function LeadsPage() {
  const { state, actions } = useReloo();
  const { leads, users } = state;
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", source: SOURCES[0], interest: "", notes: "" });
  const [formError, setFormError] = useState("");

  const byStage = useMemo(() => {
    const grouped = {};
    LEAD_PIPELINE.forEach((stage) => {
      grouped[stage.code] = leads.filter((l) => l.status === stage.code);
    });
    return grouped;
  }, [leads]);

  const moveLead = (leadId, currentStatus, direction) => {
    const idx = LEAD_PIPELINE.findIndex((s) => s.code === currentStatus);
    const nextIdx = direction === "next" ? idx + 1 : idx - 1;
    if (nextIdx < 0 || nextIdx >= LEAD_PIPELINE.length) return;
    actions.updateLead(leadId, { status: LEAD_PIPELINE[nextIdx].code });
  };

  const submitLead = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (!isValidPhone(form.phone)) {
      setFormError(PHONE_ERROR);
      return;
    }
    setFormError("");
    actions.addLead({ ...form, status: "new" });
    setCreateOpen(false);
    setForm({ name: "", phone: "", email: "", source: SOURCES[0], interest: "", notes: "" });
  };

  return (
    <div>
      <PageHeader
        title="Sales Leads CRM"
        description="Theo dõi khách hàng tiềm năng và pipeline chuyển đổi Pro Store / Đối tác."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Thêm lead
          </button>
        }
      />

      {leads.length === 0 ? (
        <EmptyState title="Chưa có lead" description="Chưa có khách hàng tiềm năng nào được ghi nhận." />
      ) : (
        <div className="kanban">
          {LEAD_PIPELINE.map((stage) => {
            const stageMeta = getLeadStatusMeta(stage.code);
            const stageLeads = byStage[stage.code] || [];
            return (
              <div className="kanban-col" key={stage.code}>
                <div className="kanban-col-header">
                  <span className="flex items-center gap-2">
                    <span className="legend-dot" style={{ background: stageMeta.color }} />
                    {stage.label}
                  </span>
                  <span className="text-muted">{stageLeads.length}</span>
                </div>
                {stageLeads.map((lead) => {
                  const assignee = users.find((u) => u.id === lead.assignedTo);
                  return (
                    <div className="kanban-card" key={lead.id}>
                      <span className="kanban-card__title">{lead.name}</span>
                      <span className="kanban-card__meta flex items-center gap-1">
                        <Phone size={11} /> {lead.phone}
                      </span>
                      <span className="kanban-card__meta flex items-center gap-1">
                        <Mail size={11} /> {lead.email}
                      </span>
                      <span className="kanban-card__meta">{lead.interest}</span>
                      {lead.notes && <span className="text-xs text-muted">{lead.notes}</span>}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted">
                          {lead.source} · {formatDate(lead.createdAt)}
                        </span>
                      </div>
                      {assignee && (
                        <span className="text-xs text-blue">Phụ trách: {assignee.name}</span>
                      )}
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={stage.code === LEAD_PIPELINE[0].code}
                          onClick={() => moveLead(lead.id, lead.status, "prev")}
                        >
                          <ArrowLeft size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ flex: 1 }}
                          disabled={stage.code === LEAD_PIPELINE[LEAD_PIPELINE.length - 1].code}
                          onClick={() => moveLead(lead.id, lead.status, "next")}
                        >
                          Chuyển tiếp <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Thêm lead mới">
        <form onSubmit={submitLead} className="flex flex-col gap-3">
          <div className="input-group">
            <label className="input-label">Họ tên</label>
            <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Số điện thoại</label>
              <input
                className="input"
                inputMode="numeric"
                maxLength={10}
                placeholder="09xxxxxxxx"
                value={form.phone}
                onChange={(e) => {
                  setFormError("");
                  setForm((f) => ({ ...f, phone: sanitizePhoneInput(e.target.value) }));
                }}
                required
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Nguồn</label>
            <select className="select" value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">Quan tâm</label>
            <input className="input" value={form.interest} onChange={(e) => setForm((f) => ({ ...f, interest: e.target.value }))} placeholder="Ví dụ: Đăng ký Pro Store" />
          </div>
          <div className="input-group">
            <label className="input-label">Ghi chú</label>
            <textarea className="textarea" rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          {formError && (
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>Hủy</button>
            <button type="submit" className="btn btn-primary">Thêm lead</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
