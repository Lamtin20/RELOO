/**
 * Thông số sản phẩm theo nhóm danh mục — giúp người cho thuê khai báo đúng trọng tâm.
 */

export const CATEGORY_SPEC_GROUPS = {
  camera: {
    label: 'Máy ảnh & Quay phim',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Sony, Canon, DJI...' },
      { id: 'model', label: 'Model', type: 'text', placeholder: 'A7IV, R6 Mark II...' },
      { id: 'sensor', label: 'Cảm biến / Độ phân giải', type: 'text', placeholder: 'Full-frame 33MP, 4K60...' },
      { id: 'accessories', label: 'Phụ kiện kèm theo', type: 'textarea', placeholder: 'Pin, thẻ nhớ, túi đựng...' },
      { id: 'usageCount', label: 'Số lần đã cho thuê', type: 'number', placeholder: '0' },
    ],
  },
  electronics: {
    label: 'Điện tử & Công nghệ',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Apple, Samsung, LG...' },
      { id: 'model', label: 'Model / Dòng máy', type: 'text', placeholder: 'MacBook Pro M3, iPhone 15...' },
      { id: 'specs', label: 'Cấu hình chính', type: 'text', placeholder: 'RAM, dung lượng, màn hình...' },
      { id: 'warranty', label: 'Bảo hành còn lại', type: 'select', options: ['Còn bảo hành CH', 'Hết bảo hành', 'Bảo hành shop', 'Không rõ'] },
      { id: 'accessories', label: 'Phụ kiện kèm theo', type: 'textarea', placeholder: 'Sạc, cáp, hộp...' },
    ],
  },
  camping: {
    label: 'Camping & Dã ngoại',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Naturehike, Fire-Maple...' },
      { id: 'capacity', label: 'Sức chứa / Quy cách', type: 'text', placeholder: 'Lều 4 người, 2 lớp...' },
      { id: 'weight', label: 'Trọng lượng', type: 'text', placeholder: '2.1 kg' },
      { id: 'weather', label: 'Chống nước / Gió', type: 'text', placeholder: 'Chống mưa IPX4, gió cấp 6...' },
      { id: 'included', label: 'Bộ kèm theo', type: 'textarea', placeholder: 'Peg, túi đựng, lót lều...' },
    ],
  },
  fashion: {
    label: 'Thời trang & Phụ kiện',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Self-Portrait, Zara...' },
      { id: 'size', label: 'Size / Số đo', type: 'text', placeholder: 'M, 36, Free size...' },
      { id: 'color', label: 'Màu sắc', type: 'text', placeholder: 'Tím, đen...' },
      { id: 'material', label: 'Chất liệu', type: 'text', placeholder: 'Lụa, sequin, cotton...' },
      { id: 'care', label: 'Hướng dẫn giữ gìn', type: 'textarea', placeholder: 'Giặt khô, ủi thấp...' },
    ],
  },
  baby: {
    label: 'Mẹ & Bé',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Aprica, Chicco...' },
      { id: 'ageRange', label: 'Độ tuổi phù hợp', type: 'text', placeholder: '0–3 tuổi, 6–36 tháng...' },
      { id: 'weightLimit', label: 'Tải trọng / Cân nặng bé', type: 'text', placeholder: 'Tối đa 15kg' },
      { id: 'safety', label: 'Tiêu chuẩn an toàn', type: 'text', placeholder: 'CE, JP standard...' },
      { id: 'sanitized', label: 'Vệ sinh trước giao', type: 'select', options: ['Reloo-Care khử khuẩn', 'Giặt sạch', 'Khử khuẩn cơ bản'] },
    ],
  },
  home: {
    label: 'Gia dụng & Nội thất',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Dyson, Philips...' },
      { id: 'dimensions', label: 'Kích thước', type: 'text', placeholder: '120 x 60 x 75 cm' },
      { id: 'power', label: 'Công suất / Điện năng', type: 'text', placeholder: '1500W, 220V' },
      { id: 'material', label: 'Chất liệu', type: 'text', placeholder: 'Inox, gỗ sồi...' },
      { id: 'usage', label: 'Phù hợp sử dụng', type: 'textarea', placeholder: 'Gia đình 4 người, sự kiện...' },
    ],
  },
  vehicle: {
    label: 'Xe cộ & Vận chuyển',
    fields: [
      { id: 'brand', label: 'Hãng xe', type: 'text', placeholder: 'Honda, VinFast...' },
      { id: 'model', label: 'Dòng xe / Model', type: 'text', placeholder: 'Vision, VF e34...' },
      { id: 'year', label: 'Năm sản xuất', type: 'number', placeholder: '2023' },
      { id: 'plate', label: 'Biển số (4 số cuối)', type: 'text', placeholder: '***1234' },
      { id: 'license', label: 'Yêu cầu bằng lái', type: 'select', options: ['Không cần', 'Bằng A1', 'Bằng A2', 'Bằng B1', 'Bằng B2 trở lên'] },
      { id: 'fuel', label: 'Nhiên liệu / Pin', type: 'text', placeholder: 'Xăng, điện 100km...' },
    ],
  },
  sports: {
    label: 'Thể thao & Gym',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Nike, Adidas...' },
      { id: 'type', label: 'Loại dụng cụ', type: 'text', placeholder: 'Tạ đa năng, vợt tennis...' },
      { id: 'weight', label: 'Trọng lượng / Size', type: 'text', placeholder: '20kg, size L...' },
      { id: 'skill', label: 'Trình độ phù hợp', type: 'select', options: ['Mới bắt đầu', 'Trung bình', 'Nâng cao', 'Mọi cấp độ'] },
    ],
  },
  music: {
    label: 'Nhạc cụ & Âm thanh',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Yamaha, JBL...' },
      { id: 'type', label: 'Loại thiết bị', type: 'text', placeholder: 'Guitar acoustic, loa kéo...' },
      { id: 'power', label: 'Công suất / Quy mô', type: 'text', placeholder: '500W, full-size...' },
      { id: 'accessories', label: 'Phụ kiện kèm', type: 'textarea', placeholder: 'Dây đàn, micro, stand...' },
    ],
  },
  event: {
    label: 'Sự kiện & Tiệc',
    fields: [
      { id: 'type', label: 'Loại thiết bị', type: 'text', placeholder: 'Backdrop, bàn ghế, đèn...' },
      { id: 'quantity', label: 'Số lượng / Quy mô', type: 'text', placeholder: '10 bộ bàn ghế, 50m²...' },
      { id: 'setup', label: 'Lắp đặt', type: 'select', options: ['Tự lắp', 'Chủ đồ hỗ trợ lắp', 'Có phí lắp đặt', 'Không cần lắp'] },
      { id: 'transport', label: 'Vận chuyển', type: 'select', options: ['Tự đến lấy', 'Giao trong nội thành', 'Giao toàn quốc', 'Thương lượng'] },
    ],
  },
  tools: {
    label: 'Công cụ & Máy móc',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Bosch, Makita...' },
      { id: 'type', label: 'Loại máy', type: 'text', placeholder: 'Máy khoan, máy cắt...' },
      { id: 'power', label: 'Công suất', type: 'text', placeholder: '800W, pin 18V...' },
      { id: 'safety', label: 'An toàn khi dùng', type: 'textarea', placeholder: 'Đeo kính bảo hộ, dùng ổ cắm tiếp địa...' },
    ],
  },
  office: {
    label: 'Văn phòng & Học tập',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'HP, Canon...' },
      { id: 'type', label: 'Loại thiết bị', type: 'text', placeholder: 'Máy in laser, bàn học...' },
      { id: 'specs', label: 'Thông số chính', type: 'text', placeholder: 'In đen trắng, A4...' },
      { id: 'pages', label: 'Giới hạn in / Sử dụng', type: 'text', placeholder: '500 trang/tháng' },
    ],
  },
  beauty: {
    label: 'Làm đẹp & Spa',
    fields: [
      { id: 'brand', label: 'Thương hiệu', type: 'text', placeholder: 'Dyson, Panasonic...' },
      { id: 'type', label: 'Loại thiết bị', type: 'text', placeholder: 'Máy sấy, máy uốn...' },
      { id: 'power', label: 'Công suất / Nhiệt độ', type: 'text', placeholder: '1600W, 230°C...' },
      { id: 'hygiene', label: 'Vệ sinh thiết bị', type: 'select', options: ['Khử khuẩn sau mỗi lần thuê', 'Túi riêng cho mỗi khách', 'Reloo-Care tiệt trùng'] },
    ],
  },
  default: {
    label: 'Thông tin chung',
    fields: [
      { id: 'brand', label: 'Thương hiệu / Nguồn gốc', type: 'text', placeholder: 'Thương hiệu hoặc xuất xứ' },
      { id: 'dimensions', label: 'Kích thước / Quy cách', type: 'text', placeholder: 'Kích thước hoặc dung tích' },
      { id: 'material', label: 'Chất liệu', type: 'text', placeholder: 'Chất liệu chính' },
      { id: 'included', label: 'Bộ kèm theo', type: 'textarea', placeholder: 'Phụ kiện, hướng dẫn...' },
    ],
  },
};

/** Ánh xạ category id → nhóm spec */
export const CATEGORY_SPEC_MAP = {
  camping: 'camping',
  'leo-nui': 'camping',
  'cau-ca': 'camping',
  'be-boi': 'camping',
  'may-anh': 'camera',
  'may-quay': 'camera',
  livestream: 'camera',
  'dien-tu': 'electronics',
  'laptop-pc': 'electronics',
  'dien-thoai': 'electronics',
  gaming: 'electronics',
  'may-chieu': 'electronics',
  'thoi-trang': 'fashion',
  'ao-dai-cuoi': 'fashion',
  'tui-phu-kien': 'fashion',
  'me-be': 'baby',
  'do-choi': 'baby',
  'gia-dung': 'home',
  'nha-bep': 'home',
  'noi-that': 'home',
  'trang-tri': 'home',
  'lam-vuon': 'home',
  'xe-may': 'vehicle',
  'xe-dap': 'vehicle',
  'o-to': 'vehicle',
  'xe-tai': 'vehicle',
  'the-thao': 'sports',
  'golf-tennis': 'sports',
  'nhac-cu': 'music',
  'am-thanh': 'music',
  karaoke: 'music',
  'am-thanh-anh-sang': 'music',
  'su-kien': 'event',
  'trang-tri-cuoi': 'event',
  'cong-cu': 'tools',
  'xay-dung': 'tools',
  'van-phong': 'office',
  'sach-hoc': 'office',
  'lam-dep': 'beauty',
  'salon-toc': 'beauty',
};

export function getSpecGroupId(categoryId) {
  return CATEGORY_SPEC_MAP[categoryId] ?? 'default';
}

export function getSpecFieldsForCategory(categoryId) {
  const groupId = getSpecGroupId(categoryId);
  const group = CATEGORY_SPEC_GROUPS[groupId] ?? CATEGORY_SPEC_GROUPS.default;
  return { groupId, groupLabel: group.label, fields: group.fields };
}

export function buildEmptySpecs(categoryId) {
  const { fields } = getSpecFieldsForCategory(categoryId);
  return Object.fromEntries(fields.map((f) => [f.id, '']));
}

export function normalizeSpecs(categoryId, specs = {}) {
  const { fields } = getSpecFieldsForCategory(categoryId);
  const out = {};
  for (const field of fields) {
    const val = specs[field.id];
    if (val != null && String(val).trim() !== '') out[field.id] = String(val).trim();
  }
  return out;
}

export function getFilledSpecs(listing) {
  if (!listing?.specs || !listing.category) return [];
  const { fields } = getSpecFieldsForCategory(listing.category);
  return fields
    .map((f) => ({ ...f, value: listing.specs[f.id] }))
    .filter((f) => f.value);
}
