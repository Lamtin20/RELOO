/**
 * Quy trình vận hành cho thuê RELOO — tham chiếu mô hình chuyên nghiệp (đặt online,
 * xác minh giấy tờ khi giao nhận, ảnh/video hiện trạng, trách nhiệm bảo quản).
 * Rule Engine + Decision Engine là nguồn quyết định cuối; nội dung này dùng cho CMS/UI.
 */

export const RENTAL_OPERATION_STEPS = [
  {
    id: 'book',
    step: 1,
    title: 'Đặt thuê trên RELOO',
    description:
      'Chọn tài sản, thời gian thuê và hình thức giao nhận. Hệ thống kiểm tra Identity (R003) và Rule Engine trước khi tạo giao dịch.',
  },
  {
    id: 'confirm',
    step: 2,
    title: 'Duyệt & xác nhận',
    description:
      'Chủ đồ xác nhận đơn; bạn nhận thông báo qua app/email khi đơn được duyệt. Thanh toán qua PayOS — tiền thuê và ký quỹ vào Tài khoản ký quỹ.',
  },
  {
    id: 'handover',
    step: 3,
    title: 'Giao nhận & xác minh',
    description:
      'Đối chiếu CCCD gốc với eKYC RELOO; chụp ảnh/quay video Green Audit khi bàn giao. Thời gian thuê bắt đầu khi xác nhận nhận hàng.',
  },
  {
    id: 'use',
    step: 4,
    title: 'Sử dụng & bảo quản',
    description:
      'Bạn chịu trách nhiệm bảo quản tài sản trong thời gian thuê. Sử dụng đúng mục đích; tránh làm bẩn, trầy xước hoặc hư hại.',
  },
  {
    id: 'return',
    step: 5,
    title: 'Trả đồ & hoàn ký quỹ',
    description:
      'Trả qua Goship đối tác hoặc chủ đồ nhận lại — kèm Green Audit trả đồ. Ký quỹ được hoàn sau đối chiếu bằng chứng (thường trong 24 giờ làm việc).',
  },
];

/** Giấy tờ & xác minh khi giao nhận */
export const HANDOVER_IDENTITY_REQUIREMENTS = [
  'CCCD/CMND gắn chip bản gốc — đối chiếu trực tiếp với hồ sơ eKYC RELOO (Rule R001, R003)',
  'Ảnh CCCD trên ứng dụng VNeID (khuyến nghị, hỗ trợ đối soát nhanh)',
  'Số điện thoại liên hệ trùng tài khoản RELOO',
];

/** Quy tắc giao nhận an toàn — không giao qua bên thứ ba không xác minh */
export const HANDOVER_DELIVERY_RULES = [
  'Giao nhận qua Goship đối tác RELOO hoặc chủ đồ/chủ tài sản đã xác thực — có Green Audit bắt buộc',
  'Không tự ý giao/nhận qua shipper bên ngoài không liên kết RELOO — tránh rủi ro mất bằng chứng tranh chấp',
  'Luôn chụp ảnh và quay video hiện trạng khi giao và khi trả (Green Audit)',
];

/** Trách nhiệm người thuê trong thời gian sử dụng */
export const RENTAL_CUSTODY_RULES = [
  'Bảo quản cẩn thận; không tháo lắp, sửa chữa hoặc chuyển giao cho người khác khi chưa được phép',
  'Chi phí bảo dưỡng/sửa chữa do lỗi sử dụng — trừ vào ký quỹ hoặc bồi thường theo Reloo Care',
  'Hư hỏng không thể sửa chữa do cố ý hoặc bất cẩn nghiêm trọng — bồi thường theo giá trị thị trường (Rule Engine)',
];

/** Phạt quá hạn — đồng bộ với CMS terms */
export const LATE_RETURN_FORMULA =
  'P = (Giá thuê/giờ × 200%) × Số giờ trễ — trừ trực tiếp vào ký quỹ trước khi hoàn phần còn lại';

/** SLA hoàn ký quỹ sau Green Audit trả đồ */
export const DEPOSIT_RELEASE_SLA_HOURS = 24;
