import {
  BadgeCheck,
  CalendarRange,
  CreditCard,
  IdCard,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";

/** Tab dịch vụ — phong cách Mioto (segment trên thẻ đặt thuê) */
export const HOME_SERVICE_TABS = [
  {
    id: "short",
    label: "Thuê ngắn hạn",
    icon: Package,
    exploreHref: "/explore",
  },
  {
    id: "long",
    label: "Thuê dài ngày",
    icon: CalendarRange,
    exploreHref: "/explore?sort=price_asc",
  },
  {
    id: "lend",
    label: "Cho thuê đồ",
    icon: BadgeCheck,
    exploreHref: "/dashboard/assets/new",
  },
];

/** Ưu điểm RELOO — carousel như Mioto "Ưu Điểm Của Mioto" */
export const HOME_TRUST_BENEFITS = [
  {
    id: "care",
    icon: ShieldCheck,
    title: "Thuê an tâm với Reloo Care",
    desc: "Gói An Tâm chia sẻ rủi ro — bồi thường hư hỏng theo Rule Engine, không phải bảo hiểm thương mại.",
  },
  {
    id: "cancel",
    icon: BadgeCheck,
    title: "An tâm đặt thuê",
    desc: "Hủy miễn phí trước khi giao hàng. Hoàn tiền nếu chủ đồ không giao sau 24 giờ.",
  },
  {
    id: "kyc",
    icon: IdCard,
    title: "Thủ tục đơn giản",
    desc: "Chỉ cần eKYC CCCD + Face Match (VERIFIED) là đủ điều kiện thuê trên RELOO.",
  },
  {
    id: "pay",
    icon: CreditCard,
    title: "Thanh toán VietQR",
    desc: "PayOS · Momo · chuyển khoản. Tiền giữ tại Tài khoản ký quỹ cho đến khi trả đồ.",
  },
  {
    id: "ship",
    icon: Truck,
    title: "Giao nhận tận nơi",
    desc: "Goship đối tác hoặc chủ đồ giao trực tiếp — Green Audit ảnh/video khi bàn giao.",
  },
  {
    id: "catalog",
    icon: Package,
    title: "Danh mục đa dạng",
    desc: "Máy ảnh, camping, thời trang, điện tử, Mẹ & Bé — hàng nghìn tin cho thuê P2P.",
  },
];

/** Khu vực phổ biến — chip ngang như Mioto "Địa Điểm Nổi Bật" */
export const HOME_POPULAR_AREAS = [
  { id: "hcm", label: "TP. Hồ Chí Minh", query: "TP.HCM" },
  { id: "hn", label: "Hà Nội", query: "Hà Nội" },
  { id: "dn", label: "Đà Nẵng", query: "Đà Nẵng" },
  { id: "ct", label: "Cần Thơ", query: "Cần Thơ" },
  { id: "nt", label: "Nha Trang", query: "Nha Trang" },
  { id: "dl", label: "Đà Lạt", query: "Đà Lạt" },
  { id: "hp", label: "Hải Phòng", query: "Hải Phòng" },
  { id: "vt", label: "Vũng Tàu", query: "Vũng Tàu" },
];

/** Thẻ dịch vụ lớn — Mioto "Dịch Vụ Của Mioto" */
export const HOME_SERVICE_MODES = [
  {
    id: "rent",
    title: "Đồ đã sẵn sàng. Bắt đầu trải nghiệm ngay!",
    desc: "Thuê máy ảnh, camping, thiết bị — trải nghiệm đồ xịn với chi phí thấp.",
    cta: "Khám phá đồ thuê",
    href: "/explore",
    tone: "rent",
  },
  {
    id: "lend",
    title: "Đồ nhàn rỗi trong nhà? Cho thuê sinh lời",
    desc: "Đăng tin miễn phí, phí sàn 15% khi có đơn. Thu nhập rút về ngân hàng.",
    cta: "Đăng tin cho thuê",
    href: "/auth/register",
    tone: "lend",
  },
];
