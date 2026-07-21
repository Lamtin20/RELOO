"use client";

import { useEffect, useState } from "react";
import { Save, SlidersHorizontal, Percent, MapPin, Phone, Flag } from "lucide-react";
import { useReloo } from "@/lib/store";
import { PageHeader } from "@/components/admin/PageHeader";
import { FEE_RATES } from "@/lib/constants";

export default function SettingsPage() {
  const { state, actions } = useReloo();
  const settings = state.settings || {};

  const [form, setForm] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    setForm({
      platformFee: settings.platformFee ?? FEE_RATES.platform,
      relooCareBasicRate: settings.relooCareBasicRate ?? FEE_RATES.relooCareBasic,
      relooCarePremiumRate: settings.relooCarePremiumRate ?? FEE_RATES.relooCarePremium,
      relooCareDefault: settings.relooCareDefault ?? "basic",
      geofencingRadiusKm: settings.geofencingRadiusKm ?? 50,
      auditReceiveWindowHours: settings.auditReceiveWindowHours ?? 2,
      freePushUpCredits: settings.freePushUpCredits ?? 3,
      maintenanceMode: settings.maintenanceMode ?? false,
      supportHotline: settings.supportHotline ?? "",
      supportEmail: settings.supportEmail ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!form) return null;

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const save = () => {
    actions.updateSettings(form);
    setSavedAt(new Date());
  };

  return (
    <div>
      <PageHeader
        title="Cài đặt sàn"
        description="Tham số vận hành, phí dịch vụ và tính năng của toàn nền tảng RELOO."
        actions={
          <button type="button" className="btn btn-primary" onClick={save}>
            <Save size={16} /> Lưu cài đặt
          </button>
        }
      />

      {savedAt && (
        <div className="panel mb-4" style={{ borderColor: "var(--green)", background: "var(--success-light)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--green-dark)" }}>
            ✓ Đã lưu cài đặt lúc {savedAt.toLocaleTimeString("vi-VN")}
          </span>
        </div>
      )}

      <div className="grid-2">
        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Percent size={16} /> Phí &amp; Gói An Tâm
              </span>
            </div>
            <div className="input-group mb-3">
              <label className="input-label">Phí sàn (%)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={(form.platformFee * 100).toFixed(2)}
                onChange={(e) => setField("platformFee", Number(e.target.value) / 100)}
              />
              <span className="input-hint">Hoa hồng RELOO thu trên mỗi giao dịch thành công.</span>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Gói Basic (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={(form.relooCareBasicRate * 100).toFixed(2)}
                  onChange={(e) => setField("relooCareBasicRate", Number(e.target.value) / 100)}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Gói Premium (%)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={(form.relooCarePremiumRate * 100).toFixed(2)}
                  onChange={(e) => setField("relooCarePremiumRate", Number(e.target.value) / 100)}
                />
              </div>
            </div>
            <div className="input-group mt-3">
              <label className="input-label">Gói An Tâm mặc định</label>
              <select
                className="select"
                value={form.relooCareDefault}
                onChange={(e) => setField("relooCareDefault", e.target.value)}
              >
                <option value="basic">Basic</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <MapPin size={16} /> Geofencing &amp; Green Audit
              </span>
            </div>
            <div className="input-group mb-3">
              <label className="input-label">Bán kính Geofencing (km)</label>
              <input
                type="number"
                className="input"
                value={form.geofencingRadiusKm}
                onChange={(e) => setField("geofencingRadiusKm", Number(e.target.value))}
              />
              <span className="input-hint">Cảnh báo khi tài sản di chuyển vượt bán kính này mà chưa khai báo.</span>
            </div>
            <div className="input-group">
              <label className="input-label">Khung giờ vàng nhận Green Audit (giờ)</label>
              <input
                type="number"
                className="input"
                value={form.auditReceiveWindowHours}
                onChange={(e) => setField("auditReceiveWindowHours", Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Phone size={16} /> Liên hệ hỗ trợ
              </span>
            </div>
            <div className="input-group mb-3">
              <label className="input-label">Hotline CSKH</label>
              <input
                className="input"
                value={form.supportHotline}
                onChange={(e) => setField("supportHotline", e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Email hỗ trợ</label>
              <input
                className="input"
                value={form.supportEmail}
                onChange={(e) => setField("supportEmail", e.target.value)}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <SlidersHorizontal size={16} /> Ưu đãi &amp; Ads
              </span>
            </div>
            <div className="input-group">
              <label className="input-label">Số lượt đẩy tin miễn phí / tháng</label>
              <input
                type="number"
                className="input"
                value={form.freePushUpCredits}
                onChange={(e) => setField("freePushUpCredits", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="panel-title flex items-center gap-2">
                <Flag size={16} /> Feature flags
              </span>
            </div>
            <div className="toggle-row">
              <div>
                <div className="toggle-row__title">Chế độ bảo trì (Maintenance mode)</div>
                <div className="toggle-row__desc">Tạm khóa truy cập sàn cho người dùng thường khi cần nâng cấp hệ thống.</div>
              </div>
              <button
                type="button"
                className={`toggle${form.maintenanceMode ? " toggle--on" : ""}`}
                onClick={() => setField("maintenanceMode", !form.maintenanceMode)}
                aria-label="Bật/tắt chế độ bảo trì"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
