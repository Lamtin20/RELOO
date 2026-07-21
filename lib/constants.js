/**
 * RELOO Platform Constants
 * Nguồn: Tài liệu chiến lược RELOO (Brand, Pricing, Trust Score, Compliance)
 */

export const BRAND = {
  name: 'RELOO',
  tagline: 'Chi trả để trải nghiệm',
  description: 'Sàn cho thuê P2P - kiểm tra tình trạng minh bạch, bảo chứng tài sản số',
  colors: {
    ecoGreen: '#22C55E',
    ecoGreenDark: '#16A34A',
    ecoGreenLight: '#DCFCE7',
    trustBlue: '#2563EB',
    trustBlueDark: '#1D4ED8',
    trustBlueLight: '#DBEAFE',
    white: '#FFFFFF',
    gray50: '#F9FAFB',
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray500: '#6B7280',
    gray700: '#374151',
    gray900: '#111827',
    warning: '#F59E0B',
    danger: '#EF4444',
    success: '#10B981',
  },
  fonts: {
    sans: 'Inter, system-ui, sans-serif',
  },
};

export const STORAGE_KEY = 'reloo-store-v1';

export const CATEGORIES = [
  {
    id: 'camping',
    name: 'Camping & Dã ngoại',
    slug: 'camping',
    icon: 'Tent',
    description: 'Lều, túi ngủ, bếp dã ngoại, đèn pin và phụ kiện cắm trại',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 5000,
  },
  {
    id: 'may-anh',
    name: 'Máy ảnh & Lens',
    slug: 'may-anh',
    icon: 'Camera',
    description: 'Máy ảnh mirrorless, DSLR, lens, gimbal và phụ kiện chụp ảnh',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 10000,
  },
  {
    id: 'may-quay',
    name: 'Máy quay & Flycam',
    slug: 'may-quay',
    icon: 'Video',
    description: 'Máy quay, flycam, action cam, gimbal và thiết bị quay phim',
    kFactor: { min: 0.015, max: 0.035 },
    pushUpPrice: 10000,
  },
  {
    id: 'dien-tu',
    name: 'Điện tử & Công nghệ',
    slug: 'dien-tu',
    icon: 'Monitor',
    description: 'TV, loa, tai nghe, smartwatch và thiết bị điện tử gia dụng',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 8000,
  },
  {
    id: 'laptop-pc',
    name: 'Laptop & PC',
    slug: 'laptop-pc',
    icon: 'Laptop',
    description: 'Laptop, MacBook, PC, màn hình và phụ kiện làm việc',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 9000,
  },
  {
    id: 'dien-thoai',
    name: 'Điện thoại & Tablet',
    slug: 'dien-thoai',
    icon: 'Smartphone',
    description: 'iPhone, Samsung, iPad, tablet và phụ kiện di động',
    kFactor: { min: 0.015, max: 0.025 },
    pushUpPrice: 7000,
  },
  {
    id: 'me-be',
    name: 'Mẹ & Bé',
    slug: 'me-be',
    icon: 'Baby',
    description: 'Xe đẩy, nôi, ghế ăn, máy hút sữa và đồ dùng cho bé',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 5000,
  },
  {
    id: 'do-choi',
    name: 'Đồ chơi trẻ em',
    slug: 'do-choi',
    icon: 'Puzzle',
    description: 'Xe đạp trẻ em, đồ chơi giáo dục, bộ lego và trò chơi ngoài trời',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 3000,
  },
  {
    id: 'thoi-trang',
    name: 'Thời trang',
    slug: 'thoi-trang',
    icon: 'Shirt',
    description: 'Quần áo, giày dép, phụ kiện thời trang nam nữ',
    kFactor: { min: 0.005, max: 0.015 },
    pushUpPrice: 3000,
  },
  {
    id: 'ao-dai-cuoi',
    name: 'Váy cưới & Áo dài',
    slug: 'ao-dai-cuoi',
    icon: 'Crown',
    description: 'Váy cưới, áo dài, vest, đồ dự tiệc và trang phục sự kiện',
    kFactor: { min: 0.005, max: 0.015 },
    pushUpPrice: 5000,
  },
  {
    id: 'tui-phu-kien',
    name: 'Túi hiệu & Phụ kiện',
    slug: 'tui-phu-kien',
    icon: 'ShoppingBag',
    description: 'Túi xách, ví, đồng hồ, kính mắt và phụ kiện thời trang cao cấp',
    kFactor: { min: 0.005, max: 0.012 },
    pushUpPrice: 4000,
  },
  {
    id: 'gia-dung',
    name: 'Gia dụng',
    slug: 'gia-dung',
    icon: 'Home',
    description: 'Máy hút bụi, nồi chiên, máy lọc không khí và đồ gia dụng',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 3000,
  },
  {
    id: 'nha-bep',
    name: 'Nhà bếp & Đồ nấu',
    slug: 'nha-bep',
    icon: 'ChefHat',
    description: 'Nồi, chảo, lò nướng, máy xay và dụng cụ nhà bếp chuyên nghiệp',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 3000,
  },
  {
    id: 'noi-that',
    name: 'Nội thất',
    slug: 'noi-that',
    icon: 'Sofa',
    description: 'Bàn ghế, kệ, giường, đệm và đồ nội thất tạm thời',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 6000,
  },
  {
    id: 'trang-tri',
    name: 'Trang trí & Đèn',
    slug: 'trang-tri',
    icon: 'Lamp',
    description: 'Đèn trang trí, tranh, gương, rèm và phụ kiện decor',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 4000,
  },
  {
    id: 'xe-may',
    name: 'Xe máy & Xe điện',
    slug: 'xe-may',
    icon: 'Fuel',
    description: 'Xe máy, xe điện, xe tay ga và mũ bảo hiểm',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 10000,
  },
  {
    id: 'xe-dap',
    name: 'Xe đạp',
    slug: 'xe-dap',
    icon: 'Bike',
    description: 'Xe đạp thể thao, xe đạp điện, xe đạp trẻ em và phụ kiện',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 5000,
  },
  {
    id: 'o-to',
    name: 'Ô tô',
    slug: 'o-to',
    icon: 'Car',
    description: 'Ô tô 4–7 chỗ, xe du lịch và phụ kiện xe hơi',
    kFactor: { min: 0.04, max: 0.06 },
    pushUpPrice: 15000,
  },
  {
    id: 'xe-tai',
    name: 'Xe tải & Van',
    slug: 'xe-tai',
    icon: 'Truck',
    description: 'Xe tải nhỏ, xe bán tải, van chuyển đồ và xe moving',
    kFactor: { min: 0.04, max: 0.06 },
    pushUpPrice: 12000,
  },
  {
    id: 'the-thao',
    name: 'Thể thao & Gym',
    slug: 'the-thao',
    icon: 'Dumbbell',
    description: 'Tạ, máy chạy bộ, thảm yoga, dụng cụ tập tại nhà',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 5000,
  },
  {
    id: 'golf-tennis',
    name: 'Golf & Tennis',
    slug: 'golf-tennis',
    icon: 'Trophy',
    description: 'Gậy golf, vợt tennis, bóng và phụ kiện môn thể thao',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 6000,
  },
  {
    id: 'be-boi',
    name: 'Bơi lội & Lặn',
    slug: 'be-boi',
    icon: 'Waves',
    description: 'Kính lặn, áo phao, ván sup, phao bơi và đồ lặn',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 4000,
  },
  {
    id: 'leo-nui',
    name: 'Leo núi & Trekking',
    slug: 'leo-nui',
    icon: 'Mountain',
    description: 'Gậy trekking, ba lô leo núi, giày và phụ kiện outdoor',
    kFactor: { min: 0.025, max: 0.04 },
    pushUpPrice: 5000,
  },
  {
    id: 'cau-ca',
    name: 'Câu cá',
    slug: 'cau-ca',
    icon: 'Fish',
    description: 'Cần câu, máy câu, thuyền kayak và phụ kiện câu cá',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 4000,
  },
  {
    id: 'nhac-cu',
    name: 'Nhạc cụ',
    slug: 'nhac-cu',
    icon: 'Music',
    description: 'Guitar, piano, trống, violin và nhạc cụ các loại',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 7000,
  },
  {
    id: 'am-thanh',
    name: 'Loa & Âm thanh',
    slug: 'am-thanh',
    icon: 'Speaker',
    description: 'Loa kéo, loa karaoke, amply và hệ thống âm thanh',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 7000,
  },
  {
    id: 'karaoke',
    name: 'Karaoke & DJ',
    slug: 'karaoke',
    icon: 'Mic',
    description: 'Micro, mixer, đèn sân khấu và thiết bị DJ',
    kFactor: { min: 0.025, max: 0.045 },
    pushUpPrice: 8000,
  },
  {
    id: 'gaming',
    name: 'Gaming & Console',
    slug: 'gaming',
    icon: 'Gamepad2',
    description: 'PS5, Xbox, Nintendo Switch, VR và phụ kiện gaming',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 6000,
  },
  {
    id: 'su-kien',
    name: 'Sự kiện & Tiệc',
    slug: 'su-kien',
    icon: 'PartyPopper',
    description: 'Bàn ghế sự kiện, backdrop, khung photo booth và trang trí tiệc',
    kFactor: { min: 0.025, max: 0.045 },
    pushUpPrice: 8000,
  },
  {
    id: 'am-thanh-anh-sang',
    name: 'Âm thanh ánh sáng',
    slug: 'am-thanh-anh-sang',
    icon: 'Lightbulb',
    description: 'Đèn sân khấu, loa sự kiện, màn led và thiết bị biểu diễn',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 10000,
  },
  {
    id: 'trang-tri-cuoi',
    name: 'Trang trí cưới hỏi',
    slug: 'trang-tri-cuoi',
    icon: 'Flower2',
    description: 'Hoa cưới, khung backdrop, bàn tiệc và phụ kiện đám cưới',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 7000,
  },
  {
    id: 'livestream',
    name: 'Livestream & Studio',
    slug: 'livestream',
    icon: 'Clapperboard',
    description: 'Ring light, mic thu âm, green screen và setup livestream',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 6000,
  },
  {
    id: 'may-chieu',
    name: 'Máy chiếu & Hội thảo',
    slug: 'may-chieu',
    icon: 'Projector',
    description: 'Máy chiếu, màn chiếu, flipchart và thiết bị hội nghị',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 7000,
  },
  {
    id: 'cong-cu',
    name: 'Công cụ & Máy móc',
    slug: 'cong-cu',
    icon: 'Wrench',
    description: 'Máy khoan, máy cưa, máy mài, thang và dụng cụ cầm tay',
    kFactor: { min: 0.025, max: 0.04 },
    pushUpPrice: 4000,
  },
  {
    id: 'xay-dung',
    name: 'Xây dựng & Sơn sửa',
    slug: 'xay-dung',
    icon: 'Paintbrush',
    description: 'Máy cắt, máy phun sơn, thiết bị xây dựng và sửa chữa nhà',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 5000,
  },
  {
    id: 'lam-vuon',
    name: 'Làm vườn & Cây cảnh',
    slug: 'lam-vuon',
    icon: 'Leaf',
    description: 'Máy cắt cỏ, vòi phun, dụng cụ làm vườn và chậu cây',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 3000,
  },
  {
    id: 'sach-hoc',
    name: 'Sách & Giáo trình',
    slug: 'sach-hoc',
    icon: 'BookOpen',
    description: 'Sách giáo khoa, sách tham khảo, truyện và tài liệu học tập',
    kFactor: { min: 0.01, max: 0.025 },
    pushUpPrice: 2000,
  },
  {
    id: 'van-phong',
    name: 'Văn phòng & Máy in',
    slug: 'van-phong',
    icon: 'Printer',
    description: 'Máy in, máy scan, bàn ghế văn phòng và thiết bị làm việc',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 5000,
  },
  {
    id: 'lam-dep',
    name: 'Làm đẹp & Spa',
    slug: 'lam-dep',
    icon: 'Sparkles',
    description: 'Máy sấy tóc, máy uốn, dụng cụ nail và thiết bị spa tại nhà',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 4000,
  },
  {
    id: 'salon-toc',
    name: 'Salon tóc',
    slug: 'salon-toc',
    icon: 'Scissors',
    description: 'Ghế salon, máy hấp tóc, kéo cắt tóc chuyên nghiệp',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 5000,
  },
  {
    id: 'y-te',
    name: 'Y tế & Chăm sóc',
    slug: 'y-te',
    icon: 'Stethoscope',
    description: 'Máy massage, ghế y tế, thiết bị theo dõi sức khỏe tại nhà',
    kFactor: { min: 0.02, max: 0.04 },
    pushUpPrice: 6000,
  },
  {
    id: 'du-lich',
    name: 'Du lịch & Vali',
    slug: 'du-lich',
    icon: 'Luggage',
    description: 'Vali, ba lô du lịch, gối cổ và phụ kiện đi phượt',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 4000,
  },
  {
    id: 'thu-cung',
    name: 'Thú cưng',
    slug: 'thu-cung',
    icon: 'PawPrint',
    description: 'Chuồng, lồng, xe đẩy pet, đồ chơi và phụ kiện thú cưng',
    kFactor: { min: 0.02, max: 0.035 },
    pushUpPrice: 3000,
  },
  {
    id: 'nghe-thuat',
    name: 'Nghệ thuật & Thủ công',
    slug: 'nghe-thuat',
    icon: 'Palette',
    description: 'Máy may, máy thêu, dụng cụ vẽ và đồ handmade',
    kFactor: { min: 0.015, max: 0.03 },
    pushUpPrice: 3000,
  },
  {
    id: 'dieu-hoa',
    name: 'Điều hòa & Quạt',
    slug: 'dieu-hoa',
    icon: 'Wind',
    description: 'Máy lạnh di động, quạt công nghiệp, máy hút ẩm và làm mát',
    kFactor: { min: 0.03, max: 0.05 },
    pushUpPrice: 6000,
  },
  {
    id: 'khong-gian',
    name: 'Thuê không gian',
    slug: 'khong-gian',
    icon: 'Building2',
    description: 'Studio chụp ảnh, phòng họp, gian hàng pop-up và không gian sự kiện',
    kFactor: { min: 0.04, max: 0.06 },
    pushUpPrice: 12000,
  },
];

/** Danh mục hiển thị gọn ở footer — phần còn lại xem tại /explore */
export const FOOTER_FEATURED_SLUGS = [
  'camping',
  'may-anh',
  'laptop-pc',
  'me-be',
  'thoi-trang',
  'xe-may',
  'the-thao',
  'su-kien',
  'gaming',
  'gia-dung',
];

export const KYC_LEVELS = {
  L1: {
    level: 1,
    code: 'L1',
    name: 'Cơ bản',
    description: 'Xác thực SĐT + Email',
    maxRentalValue: 500_000,
    scoreBonus: 100,
    requirements: ['Xác thực số điện thoại', 'Xác thực email'],
  },
  L2: {
    level: 2,
    code: 'L2',
    name: 'Đã xác thực',
    description: 'CCCD 2 mặt + Face Match',
    maxRentalValue: 5_000_000,
    scoreBonus: 300,
    requirements: ['CCCD 2 mặt', 'Face Match (Liveness)', 'Địa chỉ cư trú'],
  },
  L3: {
    level: 3,
    code: 'L3',
    name: 'Premium',
    description: 'Mạng xã hội + Lịch sử giao dịch tốt',
    maxRentalValue: Infinity,
    scoreBonus: 500,
    requirements: ['Liên kết Facebook/LinkedIn', '≥ 5 đơn thuê thành công', 'Trust Score ≥ 700'],
  },
};

export const ORDER_STATUS = {
  PENDING: {
    code: 'pending',
    label: 'Chờ thanh toán',
    color: '#F59E0B',
    description: 'Đơn hàng đang chờ người thuê thanh toán qua PayOS',
  },
  PAID: {
    code: 'paid',
    label: 'Đã thanh toán',
    color: '#2563EB',
    description: 'Tiền đã vào tài khoản ký quỹ RELOO',
  },
  AUDIT_PICKUP: {
    code: 'audit_pickup',
    label: 'Green Audit giao đi',
    color: '#8B5CF6',
    description: 'Chủ đồ đang thực hiện kiểm định trước khi giao hàng',
  },
  SHIPPING: {
    code: 'shipping',
    label: 'Đang vận chuyển',
    color: '#06B6D4',
    description: 'Shipper đang giao tài sản đến người thuê',
  },
  IN_USE: {
    code: 'in_use',
    label: 'Đang sử dụng',
    color: '#22C55E',
    description: 'Người thuê đã nhận đồ và đang trong thời gian thuê',
  },
  AUDIT_RETURN: {
    code: 'audit_return',
    label: 'Green Audit trả đồ',
    color: '#8B5CF6',
    description: 'Người thuê đang thực hiện kiểm định khi trả tài sản',
  },
  COMPLETED: {
    code: 'completed',
    label: 'Hoàn tất',
    color: '#10B981',
    description: 'Giao dịch hoàn tất, tiền cọc đã giải tỏa',
  },
  CANCELLED: {
    code: 'cancelled',
    label: 'Đã hủy',
    color: '#6B7280',
    description: 'Đơn hàng đã bị hủy',
  },
  DISPUTED: {
    code: 'disputed',
    label: 'Tranh chấp',
    color: '#EF4444',
    description: 'Đang xử lý khiếu nại hư hỏng hoặc tranh chấp',
  },
  OVERDUE: {
    code: 'overdue',
    label: 'Quá hạn trả',
    color: '#DC2626',
    description: 'Người thuê quá hạn trả tài sản',
  },
  RISK: {
    code: 'risk',
    label: 'Cảnh báo rủi ro',
    color: '#B91C1C',
    description: 'Kích hoạt Geofencing hoặc hành vi bất thường',
  },
};

export const ORDER_STATUS_LIST = Object.values(ORDER_STATUS);

export const FEE_RATES = {
  platform: 0.15,
  lenderShare: 0.85,
  relooCareBasic: 0.03,
  relooCarePremium: 0.05,
  vat: 0.1,
  withdrawFee: 5000,
  overduePenaltyMultiplier: 2,
  shippingInsuranceRate: 0.005,
};

export const TRUST_SCORE = {
  min: 0,
  max: 1000,
  /** Chỉ áp dụng cho khách cao cấp đã xét duyệt định kỳ */
  depositFreeThreshold: 800,
  /** Giảm cọc tối đa cho khách chuẩn = 25% → cọc tối thiểu 75% */
  standardMinDepositRate: 0.75,
  standardMaxReduction: 0.25,
  weights: {
    kyc: 0.2,
    history: 0.5,
    feedback: 0.3,
    defaults: 0.15,
  },
  kycScores: {
    L1: 150,
    L2: 470,
    L3: 550,
  },
  /** Tier nội bộ — chỉ khách premium_approved mới áp dụng đầy đủ */
  premiumDepositTiers: [
    { minScore: 800, rate: 0 },
    { minScore: 700, rate: 0.25 },
    { minScore: 600, rate: 0.5 },
    { minScore: 500, rate: 0.75 },
    { minScore: 0, rate: 1 },
  ],
  /** @deprecated UI không hiển thị — giữ tương thích import cũ */
  depositTiers: [
    { minScore: 800, rate: 0 },
    { minScore: 700, rate: 0.25 },
    { minScore: 600, rate: 0.5 },
    { minScore: 500, rate: 0.75 },
    { minScore: 0, rate: 1 },
  ],
};

export const RENTAL_DISCOUNTS = {
  daily: { minDays: 1, maxDays: 3, multiplier: 1 },
  weekly: { minDays: 4, maxDays: 7, multiplier: 0.85 },
  monthly: { minDays: 8, maxDays: Infinity, multiplier: 0.7 },
};

export const RELOO_CARE_PLANS = {
  basic: {
    id: 'basic',
    name: 'Gói Basic',
    rate: FEE_RATES.relooCareBasic,
    maxCompensation: 1_000_000,
    compensationRate: 0.5,
    slaHours: 48,
    description: 'Bảo vệ hư hỏng nhẹ, vỡ/móp nhẹ',
  },
  premium: {
    id: 'premium',
    name: 'Gói Premium',
    rate: FEE_RATES.relooCarePremium,
    maxCompensation: 3_000_000,
    compensationRate: 0.8,
    slaHours: 12,
    description: 'Bảo vệ toàn diện, ưu tiên xử lý 12h',
  },
};

export const AD_PACKAGES = {
  pushUp: {
    id: 'push_up',
    name: 'Đẩy tin (Push Up)',
    description: 'Đưa tin lên đầu danh mục ngay lập tức',
    unit: 'lượt',
  },
  label: {
    id: 'label',
    name: 'Nhãn nổi bật',
    description: 'Gắn nhãn "Ưu tiên", "Verified" hoặc "Giá tốt"',
    durations: [
      { days: 3, price: 29_000 },
      { days: 7, price: 59_000 },
      { days: 30, price: 199_000 },
    ],
  },
  proStore: {
    id: 'pro_store',
    name: 'Cửa hàng Pro',
    description: 'Gian hàng VIP, giảm phí sàn xuống 12%',
    monthlyPrice: 299_000,
    yearlyPrice: 2_500_000,
    platformFeeDiscount: 0.12,
  },
};

export const LISTING_STATUS = {
  AVAILABLE: { code: 'available', label: 'Sẵn sàng cho thuê' },
  RENTED: { code: 'rented', label: 'Đang cho thuê' },
  DRAFT: { code: 'draft', label: 'Bản nháp' },
  SUSPENDED: { code: 'suspended', label: 'Tạm ngưng' },
};

export const LISTING_CONDITIONS = {
  NEW: { code: 'new', label: 'Mới 100%' },
  LIKE_NEW: { code: 'like_new', label: 'Như mới' },
  GOOD: { code: 'good', label: 'Tốt' },
  FAIR: { code: 'fair', label: 'Khá' },
};

/** Hình thức giao nhận — ảnh hưởng mốc bắt đầu tính thuê */
export const DELIVERY_MODE = {
  SHIPPER: {
    code: 'shipper',
    label: 'Shipper Goship giao',
    description:
      'Đối tác Goship giao/nhận — Green Audit bắt buộc. Không dùng shipper bên ngoài không liên kết RELOO.',
  },
  LENDER: {
    code: 'lender_delivery',
    label: 'Chủ đồ tự giao',
    description:
      'Chủ đồ xác nhận giao hàng trực tiếp — đối chiếu CCCD gốc và Green Audit khi bàn giao.',
  },
};

export const RENTAL_START_RULE = {
  ON_RECEIVE: 'on_receive',
  ON_LENDER_CONFIRM: 'on_lender_confirm',
};

/** Buffer ngày sau khi trả đồ trước khi mở cho thuê lại */
export const RENTAL_RETURN_BUFFER_DAYS = 2;

export const RENT_WAITLIST_STATUS = {
  WAITING: { code: 'waiting', label: 'Đang chờ' },
  NOTIFIED: { code: 'notified', label: 'Đã thông báo' },
  FULFILLED: { code: 'fulfilled', label: 'Đã chuyển đơn' },
  CANCELLED: { code: 'cancelled', label: 'Đã hủy' },
};

/** Thuật ngữ hiển thị cho người dùng (Việt hoá) — không dùng "Ví" như ví điện tử */
export const USER_TERMS = {
  GREEN_AUDIT: 'Kiểm tra tình trạng',
  GREEN_AUDIT_FULL: 'Kiểm tra tình trạng trước giao nhận',
  NFT_PASSPORT: 'Chứng nhận tài sản số',
  /** Số tiền chủ đồ có thể rút về ngân hàng */
  RENTAL_BALANCE: 'Số dư cho thuê',
  /** Tổng thu nhập tích lũy từ cho thuê */
  RENTAL_INCOME: 'Thu nhập cho thuê',
  /** Tiền cọc & phí thuê RELOO đang giữ an toàn */
  ESCROW_ACCOUNT: 'Tài khoản ký quỹ',
  /** Trang tài chính người dùng */
  FINANCE_HUB: 'Tài chính & ký quỹ',
  /** Số dư có thể rút ngay */
  AVAILABLE_BALANCE: 'Số dư khả dụng',
};

export const TRUST_BADGES = {
  VERIFIED: { id: 'verified', label: 'Đã xác thực', icon: 'BadgeCheck' },
  BLOCKCHAIN: { id: 'blockchain', label: 'Bảo chứng minh bạch', icon: 'Shield' },
  TOP_RATED: { id: 'top_rated', label: 'Top đánh giá', icon: 'Star' },
  GREEN_AUDIT: { id: 'green_audit', label: 'Kiểm tra tình trạng', icon: 'Leaf' },
  PRO: { id: 'pro', label: 'Chủ đồ Pro', icon: 'Crown' },
};

export const TICKET_STATUS = {
  OPEN: { code: 'open', label: 'Mở' },
  IN_PROGRESS: { code: 'in_progress', label: 'Đang xử lý' },
  RESOLVED: { code: 'resolved', label: 'Đã giải quyết' },
  CLOSED: { code: 'closed', label: 'Đã đóng' },
};

export const TICKET_PRIORITY = {
  LOW: { code: 'low', label: 'Thấp' },
  MEDIUM: { code: 'medium', label: 'Trung bình' },
  HIGH: { code: 'high', label: 'Cao' },
  URGENT: { code: 'urgent', label: 'Khẩn cấp' },
};

export const RISK_LEVELS = {
  LOW: { code: 'low', label: 'Thấp', color: '#22C55E' },
  MEDIUM: { code: 'medium', label: 'Trung bình', color: '#F59E0B' },
  HIGH: { code: 'high', label: 'Cao', color: '#EF4444' },
  CRITICAL: { code: 'critical', label: 'Nghiêm trọng', color: '#B91C1C' },
};

export const USER_ROLES = {
  ADMIN: 'admin',
  LENDER: 'lender',
  RENTER: 'renter',
  BOTH: 'both',
};

export const LOCATIONS = {
  VINHOMES_GRAND_PARK: 'Vinhomes Grand Park, TP. Thủ Đủc',
  THU_DUC: 'TP. Thủ Đức, TP.HCM',
  QUAN_1: 'Quận 1, TP.HCM',
  QUAN_7: 'Quận 7, TP.HCM',
  BINH_THANH: 'Quận Bình Thạnh, TP.HCM',
  PHU_NHUAN: 'Quận Phú Nhuận, TP.HCM',
  GO_VAP: 'Quận Gò Vấp, TP.HCM',
};

export const DEFAULT_SETTINGS = {
  platformFee: FEE_RATES.platform,
  relooCareDefault: 'basic',
  relooCareBasicRate: FEE_RATES.relooCareBasic,
  relooCarePremiumRate: FEE_RATES.relooCarePremium,
  geofencingRadiusKm: 50,
  auditReceiveWindowHours: 2,
  freePushUpCredits: 3,
  maintenanceMode: false,
  supportHotline: '1900 6868',
  supportEmail: 'hotline@reloo.vn',
  bannerEnabled: false,
  bannerText: '',
  bannerType: 'info',
  blacklistedUserIds: [],
  relooCarePlanDetails: null,
};
