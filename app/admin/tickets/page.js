"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { useReloo } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { getTicketStatusMeta, getTicketPriorityMeta } from "@/lib/admin-helpers";
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const CATEGORIES = ["Kỹ thuật", "Tranh chấp", "Tài khoản", "Tài chính", "Khác"];

export default function TicketsPage() {
  const { state, actions } = useReloo();
  const { tickets, users } = state;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    userId: users[0]?.id || "",
    category: CATEGORIES[0],
    priority: "medium",
    orderId: "",
  });

  const getUserName = (uid) => users.find((u) => u.id === uid)?.name || "Ẩn danh";

  const filtered = useMemo(() => {
    let result = [...tickets];
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") result = result.filter((t) => t.priority === priorityFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.subject.toLowerCase().includes(q) || getUserName(t.userId).toLowerCase().includes(q)
      );
    }
    return result.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, search, statusFilter, priorityFilter]);

  const submitTicket = (e) => {
    e.preventDefault();
    if (!form.subject.trim()) return;
    actions.addTicket({
      subject: form.subject,
      description: form.description,
      userId: form.userId,
      category: form.category,
      priority: form.priority,
      orderId: form.orderId || null,
      status: "open",
      assignee: "CSKH Team",
      messages: form.description
        ? [{ id: `msg_${Date.now()}`, sender: form.userId, text: form.description, createdAt: new Date().toISOString() }]
        : [],
    });
    setCreateOpen(false);
    setForm({ subject: "", description: "", userId: users[0]?.id || "", category: CATEGORIES[0], priority: "medium", orderId: "" });
  };

  return (
    <div>
      <PageHeader
        title="Tickets CSKH"
        description="Quản lý yêu cầu hỗ trợ, khiếu nại và tranh chấp từ người dùng."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={16} /> Tạo ticket
          </button>
        }
      />

      <div className="filters-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            className="input"
            placeholder="Tìm theo tiêu đề, người gửi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="select select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {Object.values(TICKET_STATUS).map((s) => (
            <option key={s.code} value={s.code}>{s.label}</option>
          ))}
        </select>
        <select className="select select-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">Tất cả mức độ</option>
          {Object.values(TICKET_PRIORITY).map((p) => (
            <option key={p.code} value={p.code}>{p.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Không có ticket" description="Không tìm thấy ticket khớp bộ lọc." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tiêu đề</th>
                <th>Người gửi</th>
                <th>Danh mục</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const statusMeta = getTicketStatusMeta(t.status);
                const priorityMeta = getTicketPriorityMeta(t.priority);
                return (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/admin/tickets/${t.id}`} className="font-semibold">
                        {t.subject}
                      </Link>
                      {t.orderId && <div className="text-xs text-muted">Đơn: {t.orderId}</div>}
                    </td>
                    <td className="text-sm">{getUserName(t.userId)}</td>
                    <td className="text-sm">{t.category}</td>
                    <td><StatusPill label={priorityMeta.label} color={priorityMeta.color} /></td>
                    <td><StatusPill label={statusMeta.label} color={statusMeta.color} /></td>
                    <td className="text-sm text-muted">{formatDateTime(t.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Tạo ticket hỗ trợ mới" size="lg">
        <form onSubmit={submitTicket} className="flex flex-col gap-3">
          <div className="input-group">
            <label className="input-label">Tiêu đề</label>
            <input
              className="input"
              value={form.subject}
              onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              placeholder="Ví dụ: Không nhận được OTP Green Audit"
              required
            />
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Người dùng</label>
              <select className="select" value={form.userId} onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Danh mục</label>
              <select className="select" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label">Mức độ ưu tiên</label>
              <select className="select" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                {Object.values(TICKET_PRIORITY).map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Mã đơn liên quan (tùy chọn)</label>
              <input
                className="input"
                value={form.orderId}
                onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                placeholder="RL-2026-0001"
              />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Nội dung</label>
            <textarea
              className="textarea"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Mô tả chi tiết yêu cầu..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary">
              Tạo ticket
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
