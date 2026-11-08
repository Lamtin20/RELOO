export const CRM_MODULES = Object.freeze({
  tasks: {label:'Công việc & lịch hẹn',fields:['customerId','dueAt','priority','body','resolution']},
  opportunities: {label:'Cơ hội hợp tác',fields:['customerId','company','contactEmail','stage','expectedAmount','closeAt','body']},
  promotions: { label: "Chương trình & coupon", fields: ["startsAt", "endsAt", "code", "terms", "imageUrl"] },
  content: { label: "Nội dung & hình ảnh", fields: ["slug", "body", "imageUrl", "publishAt"] },
  support: { label: "CSKH & khiếu nại", fields: ["customerId", "channel", "priority", "body", "resolution"] },
  callcenter: { label: "Callcenter", fields: ["customerId", "phone", "scheduledAt", "outcome", "body"] },
  personnel: { label: "Nhân sự", fields: ["name", "email", "department", "position", "startDate"] },
  accounting: { label: "Sổ kế toán", fields: ["date", "debitAccount", "creditAccount", "amount", "reference", "body"] },
  tax: { label: "Hồ sơ thuế", fields: ["period", "taxType", "taxableAmount", "taxAmount", "reference", "body"] },
  affiliate: { label: "Sản phẩm affiliate", fields: ["merchant", "productUrl", "imageUrl", "price", "providerId"] },
  bots: { label: "Bot & tự động hóa", fields: ["purpose", "instructions", "model", "enabled"] },
});
export const CRM_STATES = ["DRAFT", "OPEN", "IN_PROGRESS", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "CLOSED", "CANCELLED"];
export const FIELD_LABELS = { startsAt: "Bắt đầu", endsAt: "Kết thúc", code: "Mã chương trình", terms: "Điều kiện", imageUrl: "Ảnh", slug: "Đường dẫn", body: "Nội dung", publishAt: "Ngày đăng", customerId: "ID khách hàng", channel: "Kênh tiếp nhận", priority: "Ưu tiên", resolution: "Kết quả xử lý", phone: "Số điện thoại", scheduledAt: "Lịch liên hệ", outcome: "Kết quả cuộc gọi", name: "Họ tên", email: "Email", department: "Phòng ban", position: "Vị trí", startDate: "Ngày bắt đầu", date: "Ngày chứng từ", debitAccount: "Tài khoản nợ", creditAccount: "Tài khoản có", amount: "Số tiền (VND)", reference: "Chứng từ tham chiếu", period: "Kỳ thuế", taxType: "Loại thuế", taxableAmount: "Cơ sở tính thuế", taxAmount: "Số thuế dự thảo", merchant: "Sàn", productUrl: "Link sản phẩm", price: "Giá", providerId: "ID nhà cung cấp", purpose: "Mục đích", instructions: "Chỉ dẫn", model: "Mô hình", enabled: "Bật" };
