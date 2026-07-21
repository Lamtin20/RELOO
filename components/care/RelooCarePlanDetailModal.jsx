"use client";

import { Headphones, ShieldCheck, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { formatVND } from "@/lib/utils";

function BenefitList({ title, icon: Icon, items = [] }) {
  if (!items.length) return null;
  return (
    <div className="care-detail-section">
      <h3 className="care-detail-section__title">
        <Icon size={16} /> {title}
      </h3>
      <ul className="care-detail-list">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Chi tiết gói Reloo Care — nội dung từ CMS + hằng số
 */
export function RelooCarePlanDetailModal({ open, onClose, plan }) {
  if (!plan) return null;

  return (
    <Modal open={open} onClose={onClose} title={plan.name} size="lg">
      <div className="care-detail-modal">
        <div className="care-detail-modal__head">
          <Badge variant="blue">Reloo Care</Badge>
          <span className="care-detail-modal__rate">
            Phí {Math.round(plan.rate * 100)}% trên tiền thuê
          </span>
        </div>

        <p className="care-detail-modal__intro">{plan.intro}</p>

        <div className="care-detail-stats">
          <div>
            <span>Bồi thường tối đa</span>
            <strong>{Math.round(plan.compensationRate * 100)}%</strong>
          </div>
          <div>
            <span>Trần bồi thường (cố định)</span>
            <strong>{formatVND(plan.maxCompensation)}</strong>
          </div>
          <div>
            <span>Thời gian xử lý</span>
            <strong>{plan.slaHours}h</strong>
          </div>
        </div>

        <p className="care-detail-modal__policy-note">
          Hệ thống RELOO tự động giới hạn mức bồi thường — không vượt quá trần gói{" "}
          {plan.name}: <strong>{formatVND(plan.maxCompensation)}</strong>.
        </p>

        <BenefitList title="Quyền lợi bảo vệ" icon={ShieldCheck} items={plan.benefits} />
        <BenefitList title="Hỗ trợ cơ bản" icon={Headphones} items={plan.supportBasics} />

        {plan.terms && (
          <div className="care-detail-section care-detail-section--terms">
            <h3 className="care-detail-section__title">
              <Sparkles size={16} /> Điều kiện áp dụng
            </h3>
            <p>{plan.terms}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
