"use client";

import { useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { useReloo } from "@/lib/store";
import { RELOO_CARE_PLANS } from "@/lib/constants";
import {
  DEFAULT_RELOO_CARE_PLAN_DETAILS,
  getRelooCarePlanDetail,
} from "@/lib/reloo-care";

function linesToArray(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function arrayToLines(arr) {
  return (arr ?? []).join("\n");
}

function PlanEditor({ planId, form, onChange }) {
  const base = RELOO_CARE_PLANS[planId];
  const preview = getRelooCarePlanDetail(planId, { relooCarePlanDetails: { [planId]: form } });

  return (
    <div className="panel reloo-care-cms-plan">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-2">
          <ShieldCheck size={16} /> {base.name}
        </span>
        <span className="text-xs text-muted">
          Phí {Math.round(base.rate * 100)}% · SLA {base.slaHours}h
        </span>
      </div>

      <div className="input-group mb-3">
        <label className="input-label">Mô tả ngắn (hiển thị trên thẻ chọn gói)</label>
        <input
          className="input"
          value={form.shortDescription ?? base.description}
          onChange={(e) => onChange({ shortDescription: e.target.value })}
        />
      </div>

      <div className="input-group mb-3">
        <label className="input-label">Giới thiệu chi tiết</label>
        <textarea
          className="textarea"
          rows={3}
          value={form.intro ?? ""}
          onChange={(e) => onChange({ intro: e.target.value })}
          placeholder={DEFAULT_RELOO_CARE_PLAN_DETAILS[planId]?.intro}
        />
      </div>

      <div className="input-group mb-3">
        <label className="input-label">Quyền lợi bảo vệ (mỗi dòng một mục)</label>
        <textarea
          className="textarea"
          rows={5}
          value={form.benefitsText ?? arrayToLines(form.benefits ?? preview.benefits)}
          onChange={(e) =>
            onChange({
              benefitsText: e.target.value,
              benefits: linesToArray(e.target.value),
            })
          }
        />
      </div>

      <div className="input-group mb-3">
        <label className="input-label">Hỗ trợ cơ bản (mỗi dòng một mục)</label>
        <textarea
          className="textarea"
          rows={4}
          value={form.supportBasicsText ?? arrayToLines(form.supportBasics ?? preview.supportBasics)}
          onChange={(e) =>
            onChange({
              supportBasicsText: e.target.value,
              supportBasics: linesToArray(e.target.value),
            })
          }
        />
      </div>

      <div className="input-group">
        <label className="input-label">Điều kiện áp dụng</label>
        <textarea
          className="textarea"
          rows={2}
          value={form.terms ?? ""}
          onChange={(e) => onChange({ terms: e.target.value })}
          placeholder={DEFAULT_RELOO_CARE_PLAN_DETAILS[planId]?.terms}
        />
      </div>
    </div>
  );
}

export function RelooCareCmsPanel() {
  const { state, actions } = useReloo();

  const [savedAt, setSavedAt] = useState(null);

  const defaults=(()=>{
    const stored = state.settings?.relooCarePlanDetails ?? {};
    const next = {};
    for (const planId of Object.keys(RELOO_CARE_PLANS)) {
      const detail = getRelooCarePlanDetail(planId, state.settings);
      const cms = stored[planId] ?? {};
      next[planId] = {
        intro: cms.intro ?? detail.intro,
        benefits: cms.benefits ?? detail.benefits,
        benefitsText: arrayToLines(cms.benefits ?? detail.benefits),
        supportBasics: cms.supportBasics ?? detail.supportBasics,
        supportBasicsText: arrayToLines(cms.supportBasics ?? detail.supportBasics),
        terms: cms.terms ?? detail.terms,
        shortDescription: cms.shortDescription ?? RELOO_CARE_PLANS[planId].description,
      };
    }
    return next;
  })();
  const [draft,setDraft]=useState(null);
  const forms=draft?.settings===state.settings?draft.value:defaults;
  const setForms=update=>setDraft({settings:state.settings,value:typeof update==='function'?update(forms):update});

  function updatePlan(planId, patch) {
    setForms((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], ...patch },
    }));
  }

  function save() {
    const relooCarePlanDetails = {};
    for (const [planId, form] of Object.entries(forms)) {
      relooCarePlanDetails[planId] = {
        intro: form.intro,
        benefits: form.benefits ?? linesToArray(form.benefitsText),
        supportBasics: form.supportBasics ?? linesToArray(form.supportBasicsText),
        terms: form.terms,
        shortDescription: form.shortDescription,
      };
    }
    actions.updateSettings({ relooCarePlanDetails });
    setSavedAt(new Date());
  }

  return (
    <div className="panel mb-4" id="reloo-care">
      <div className="panel-header">
        <span className="panel-title flex items-center gap-2">
          <ShieldCheck size={16} /> Gói An Tâm Reloo Care
        </span>
        <button type="button" className="btn btn-primary btn-sm" onClick={save}>
          <Save size={14} /> Lưu cấu hình gói
        </button>
      </div>

      <p className="text-sm text-muted mb-4">
        Khai báo nội dung chi tiết và quyền lợi từng gói — hiển thị khi khách bấm &quot;Chi tiết&quot;
        trên trang sản phẩm.
      </p>

      {savedAt && (
        <div
          className="mb-4 text-sm font-semibold"
          style={{ color: "var(--green-dark)" }}
        >
          ✓ Đã lưu lúc {savedAt.toLocaleTimeString("vi-VN")}
        </div>
      )}

      <div className="reloo-care-cms-grid">
        {Object.keys(RELOO_CARE_PLANS).map((planId) => (
          <PlanEditor
            key={planId}
            planId={planId}
            form={forms[planId] ?? {}}
            onChange={(patch) => updatePlan(planId, patch)}
          />
        ))}
      </div>
    </div>
  );
}
