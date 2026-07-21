"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { useReloo } from "@/lib/store";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/admin/PageHeader";
import { Avatar } from "@/components/admin/Avatar";
import { StatusPill } from "@/components/admin/StatusPill";
import { getTicketStatusMeta, getTicketPriorityMeta } from "@/lib/admin-helpers";
import { TICKET_STATUS, TICKET_PRIORITY } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default function TicketDetailPage() {
  const { id } = useParams();
  const { state, actions } = useReloo();
  const { tickets, users } = state;
  const [reply, setReply] = useState("");

  const ticket = tickets.find((t) => t.id === id);
  const requester = users.find((u) => u.id === ticket?.userId);

  if (!ticket) {
    return (
      <EmptyState
        title="Không tìm thấy ticket"
        description="Ticket này không tồn tại hoặc đã bị xoá."
        action={
          <Link href="/admin/tickets" className="btn btn-secondary">
            Về danh sách tickets
          </Link>
        }
      />
    );
  }

  const statusMeta = getTicketStatusMeta(ticket.status);
  const priorityMeta = getTicketPriorityMeta(ticket.priority);

  const sendReply = (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    const messages = [
      ...(ticket.messages || []),
      { id: `msg_${Date.now()}`, sender: "support", text: reply.trim(), createdAt: new Date().toISOString() },
    ];
    actions.updateTicket(ticket.id, { messages, status: ticket.status === "open" ? "in_progress" : ticket.status });
    setReply("");
  };

  return (
    <div>
      <PageHeader
        title={ticket.subject}
        description={`Mã ticket: ${ticket.id}${ticket.orderId ? ` · Đơn liên quan: ${ticket.orderId}` : ""}`}
        backHref="/admin/tickets"
        backLabel="Tickets CSKH"
      />

      <div className="detail-grid">
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Nội dung yêu cầu</span>
              <StatusPill label={statusMeta.label} color={statusMeta.color} />
            </div>
            <p className="text-sm">{ticket.description}</p>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Trao đổi</span>
            </div>
            <div className="thread mb-4">
              {(ticket.messages || []).length === 0 ? (
                <span className="text-sm text-muted">Chưa có trao đổi nào.</span>
              ) : (
                ticket.messages.map((m) => {
                  const isSupport = m.sender === "support" || m.sender === "admin";
                  const senderName = isSupport ? "CSKH RELOO" : users.find((u) => u.id === m.sender)?.name || "Người dùng";
                  return (
                    <div key={m.id} className={`thread-msg${isSupport ? " thread-msg--support" : ""}`}>
                      <div className="thread-msg-meta">
                        <strong>{senderName}</strong> · {formatDateTime(m.createdAt)}
                      </div>
                      {m.text}
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={sendReply} className="flex gap-2">
              <input
                className="input"
                placeholder="Nhập phản hồi cho khách hàng..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
              />
              <button type="submit" className="btn btn-primary btn-icon" aria-label="Gửi">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {requester && (
            <div className="panel">
              <div className="panel-header">
                <span className="panel-title">Người gửi</span>
              </div>
              <Link href={`/admin/users/${requester.id}`} className="flex items-center gap-3">
                <Avatar name={requester.name} src={requester.avatar} size={44} />
                <div>
                  <div className="font-semibold text-sm">{requester.name}</div>
                  <div className="text-xs text-muted">{requester.email}</div>
                </div>
              </Link>
            </div>
          )}

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Cập nhật trạng thái</span>
            </div>
            <div className="input-group mb-3">
              <label className="input-label">Trạng thái</label>
              <select
                className="select"
                value={ticket.status}
                onChange={(e) => actions.updateTicket(ticket.id, { status: e.target.value })}
              >
                {Object.values(TICKET_STATUS).map((s) => (
                  <option key={s.code} value={s.code}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Mức độ ưu tiên</label>
              <select
                className="select"
                value={ticket.priority}
                onChange={(e) => actions.updateTicket(ticket.id, { priority: e.target.value })}
              >
                {Object.values(TICKET_PRIORITY).map((p) => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title">Thông tin khác</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Danh mục</span>
              <span className="detail-row__value">{ticket.category}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Phụ trách</span>
              <span className="detail-row__value">{ticket.assignee || "Chưa gán"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Mức độ</span>
              <StatusPill label={priorityMeta.label} color={priorityMeta.color} />
            </div>
            <div className="detail-row">
              <span className="detail-row__label">Tạo lúc</span>
              <span className="detail-row__value">{formatDateTime(ticket.createdAt)}</span>
            </div>
            {ticket.orderId && (
              <div className="detail-row">
                <span className="detail-row__label">Đơn hàng</span>
                <Link href={`/admin/orders/${ticket.orderId}`} className="detail-row__value text-blue">
                  {ticket.orderId}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
