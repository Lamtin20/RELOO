/**
 * RELOO Seed Data
 * Dữ liệu mẫu tiếng Việt cho development & demo
 */

import {
  CATEGORIES,
  DEFAULT_SETTINGS,
  AD_PACKAGES,
  ORDER_STATUS,
  TICKET_STATUS,
  TICKET_PRIORITY,
  RISK_LEVELS,
} from './constants';
import { generateMockHash, calcTrustScore } from './utils';
import { seedIdentityProfiles } from './trust-platform/seed-identity';
import { seedCustomersFromUsers } from './customer/store-helpers';

// ─── Users ───────────────────────────────────────────────────────────────────

const baseUsers = [
  {
    id: 'user_admin',
    email: 'admin@reloo.vn',
    phone: '0901000001',
    name: 'RELOO Admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop',
    role: 'admin',
    kycLevel: 'L3',
    historyScore: 100,
    feedbackScore: 100,
    defaultsScore: 0,
    address: 'Quận 1, TP.HCM',
    dateOfBirth: '1988-03-12',
    nationalId: '079088001234',
    bankAccount: '0123456789 - Vietcombank',
    walletBalance: 0,
    totalEarnings: 0,
    totalRentals: 0,
    joinedAt: '2025-01-15T08:00:00.000Z',
    isPro: false,
    pushUpCredits: 0,
    depositPrivilege: {
      status: 'premium_approved',
      level: 3,
      approvedUntil: '2026-12-31T23:59:59.000Z',
    },
  },
  {
    id: 'user_minh',
    email: 'minh.nguyen@gmail.com',
    phone: '0909123456',
    name: 'Minh Nguyễn',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop',
    role: 'lender',
    kycLevel: 'L3',
    historyScore: 95,
    feedbackScore: 92,
    defaultsScore: 0,
    address: 'Vinhomes Grand Park, TP. Thủ Đức',
    dateOfBirth: '1992-07-24',
    nationalId: '079092007891',
    bankAccount: '9876543210 - Techcombank',
    walletBalance: 4_850_000,
    totalEarnings: 28_500_000,
    totalRentals: 47,
    joinedAt: '2025-03-20T10:30:00.000Z',
    isPro: true,
    pushUpCredits: 1,
    depositPrivilege: {
      status: 'premium_approved',
      level: 2,
      approvedUntil: '2026-09-30T23:59:59.000Z',
    },
    bio: 'Chuyên cho thuê máy ảnh và thiết bị camping. Trao đổi trước về lịch thuê, tình trạng đồ và giao nhận.',
  },
  {
    id: 'user_lan',
    email: 'lan.tran@gmail.com',
    phone: '0918765432',
    name: 'Lan Trần',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
    role: 'renter',
    kycLevel: 'L2',
    historyScore: 78,
    feedbackScore: 85,
    defaultsScore: 4,
    address: 'Quận Bình Thạnh, TP.HCM',
    dateOfBirth: '1998-11-05',
    nationalId: '079098011456',
    bankAccount: '1122334455 - MB Bank',
    walletBalance: 320_000,
    totalEarnings: 0,
    totalRentals: 12,
    joinedAt: '2025-06-10T14:00:00.000Z',
    isPro: false,
    pushUpCredits: 3,
    bio: 'Thích camping cuối tuần và chụp ảnh du lịch.',
  },
  {
    id: 'user_hoa',
    email: 'hoa.le@gmail.com',
    phone: '0923456789',
    name: 'Hoa Lê',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop',
    role: 'both',
    kycLevel: 'L2',
    historyScore: 82,
    feedbackScore: 88,
    defaultsScore: 0,
    address: 'Quận 7, TP.HCM',
    bankAccount: '5566778899 - VPBank',
    walletBalance: 1_200_000,
    totalEarnings: 8_400_000,
    totalRentals: 23,
    joinedAt: '2025-04-05T09:15:00.000Z',
    isPro: false,
    pushUpCredits: 2,
    bio: 'Mẹ bỉm sữa, cho thuê đồ Mẹ & Bé và thuê đồ camping.',
  },
  {
    id: 'user_duc',
    email: 'duc.pham@gmail.com',
    phone: '0934567890',
    name: 'Đức Phạm',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop',
    role: 'lender',
    kycLevel: 'L3',
    historyScore: 90,
    feedbackScore: 87,
    defaultsScore: 0,
    address: 'Quận Phú Nhuận, TP.HCM',
    bankAccount: '6677889900 - ACB',
    walletBalance: 2_100_000,
    totalEarnings: 15_600_000,
    totalRentals: 31,
    joinedAt: '2025-02-28T11:00:00.000Z',
    isPro: true,
    pushUpCredits: 0,
    depositPrivilege: {
      status: 'premium_approved',
      level: 1,
      approvedUntil: '2026-08-31T23:59:59.000Z',
    },
    bio: 'Collector đồng hồ và túi hiệu. Cho thuê thời trang cao cấp.',
  },
  {
    id: 'user_thao',
    email: 'thao.vu@gmail.com',
    phone: '0945678901',
    name: 'Thảo Vũ',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
    role: 'renter',
    kycLevel: 'L1',
    historyScore: 60,
    feedbackScore: 70,
    defaultsScore: 10,
    address: 'Quận Gò Vấp, TP.HCM',
    bankAccount: null,
    walletBalance: 0,
    totalEarnings: 0,
    totalRentals: 3,
    joinedAt: '2026-01-08T16:45:00.000Z',
    isPro: false,
    pushUpCredits: 3,
    bio: 'Sinh viên, mới tham gia RELOO.',
  },
  {
    id: 'user_khanh',
    email: 'khanh.tran@gmail.com',
    phone: '0956789012',
    name: 'Khánh Trần',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=200&h=200&fit=crop',
    role: 'lender',
    kycLevel: 'L2',
    historyScore: 75,
    feedbackScore: 80,
    defaultsScore: 0,
    address: 'TP. Thủ Đức, TP.HCM',
    bankAccount: '7788990011 - Sacombank',
    walletBalance: 890_000,
    totalEarnings: 5_200_000,
    totalRentals: 18,
    joinedAt: '2025-07-12T08:30:00.000Z',
    isPro: false,
    pushUpCredits: 3,
    bio: 'Cho thuê đồ gia dụng và dụng cụ DIY.',
  },
];

export const seedUsers = baseUsers.map((u) => ({
  ...u,
  trustScore: calcTrustScore(u),
}));

// ─── Listings ────────────────────────────────────────────────────────────────

export const seedListings = [
  {
    id: 'listing_001',
    title: 'Sony A7IV + Lens 24-70mm f/2.8 GM II',
    description:
      'Combo máy ảnh full-frame Sony A7IV kèm lens 24-70mm GM II. Máy mới 95%, shutter count ~8.000. Bao gồm 2 pin, sạc, thẻ SD 128GB, túi đựng chống sốc. Phù hợp chụp wedding, event, du lịch.',
    category: 'dien-tu',
    images: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
      'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800',
      'https://images.unsplash.com/photo-1495121553079-4c61bcce1892?w=800',
    ],
    dailyPrice: 600_000,
    marketValue: 45_000_000,
    location: 'Vinhomes Grand Park, TP. Thủ Đức',
    locationDetails: {
      province: { name: 'Thành phố Hồ Chí Minh', code: '79' },
      ward: { name: 'Phường Long Bình', code: '26734' },
      addressDetail: 'Vinhomes Grand Park, Nguyễn Xiển',
    },
    ownerId: 'user_minh',
    nftPassport: {
      id: 'NFT-RELOO-00001',
      hash: generateMockHash('sony-a7iv'),
      residualValue: 38_250_000,
      auditCount: 12,
      mintedAt: '2025-04-01T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'green_audit', 'top_rated'],
    isBoosted: true,
    labels: ['Tin ưu tiên', 'Đã kiểm định'],
    rating: 4.9,
    reviewCount: 23,
    condition: 'like_new',
    status: 'available',
    createdAt: '2025-08-15T10:00:00.000Z',
    viewCount: 1240,
    specs: {
      brand: 'Sony',
      model: 'A7IV + 24-70mm GM II',
      sensor: 'Full-frame 33MP, 4K60',
      accessories: '2 pin, sạc, thẻ SD 128GB, túi chống sốc',
      usageCount: '12',
    },
  },
  {
    id: 'listing_002',
    title: 'Lều cắm trại 4 người Naturehike Cloud Up 3',
    description:
      'Lều 2 lớp chống mưa, gió cấp 6. Setup nhanh 5 phút, trọng lượng 2.1kg. Đã sử dụng 6 lần, vệ sinh sạch sau mỗi lần thuê. Kèm túi đựng và bộ peg.',
    category: 'camping',
    images: [
      'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800',
    ],
    dailyPrice: 180_000,
    marketValue: 3_500_000,
    location: 'Vinhomes Grand Park, TP. Thủ Đức',
    locationDetails: {
      province: { name: 'Thành phố Hồ Chí Minh', code: '79' },
      ward: { name: 'Phường Long Bình', code: '26734' },
      addressDetail: 'Vinhomes Grand Park, Nguyễn Xiển',
    },
    ownerId: 'user_minh',
    nftPassport: {
      id: 'NFT-RELOO-00002',
      hash: generateMockHash('naturehike-tent'),
      residualValue: 2_975_000,
      auditCount: 8,
      mintedAt: '2025-05-10T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'green_audit'],
    isBoosted: false,
    labels: ['Giá tốt'],
    rating: 4.7,
    reviewCount: 15,
    condition: 'good',
    status: 'available',
    createdAt: '2025-09-01T08:00:00.000Z',
    viewCount: 890,
    specs: {
      brand: 'Naturehike',
      capacity: 'Lều 4 người, 2 lớp',
      weight: '2.1 kg',
      weather: 'Chống mưa IPX4, gió cấp 6',
      included: 'Túi đựng, bộ peg, lót lều',
    },
  },
  {
    id: 'listing_003',
    title: 'Bếp ga mini Fire-Maple + Bộ nồi Titanium',
    description:
      'Bộ bếp ga cắm trại cao cấp Fire-Maple kèm bộ nồi/chảo titanium 3 món. Tiết kiệm gas, đun sôi nhanh. Phù hợp trekking và picnic.',
    category: 'camping',
    images: [
      'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=800',
      'https://images.unsplash.com/photo-1533777857889-32ea117a75a5?w=800',
    ],
    dailyPrice: 120_000,
    marketValue: 2_800_000,
    location: 'Quận Bình Thạnh, TP.HCM',
    ownerId: 'user_hoa',
    nftPassport: {
      id: 'NFT-RELOO-00003',
      hash: generateMockHash('fire-maple-stove'),
      residualValue: 2_380_000,
      auditCount: 5,
      mintedAt: '2025-06-20T00:00:00.000Z',
    },
    trustBadges: ['verified', 'green_audit'],
    isBoosted: false,
    labels: [],
    rating: 4.5,
    reviewCount: 8,
    condition: 'good',
    status: 'available',
    createdAt: '2025-10-12T14:00:00.000Z',
    viewCount: 456,
  },
  {
    id: 'listing_004',
    title: 'MacBook Pro 14" M3 Pro 18GB/512GB',
    description:
      'MacBook Pro 14 inch chip M3 Pro, RAM 18GB, SSD 512GB. Pin cycle 42, ngoại hình 98%. Kèm sạc MagSafe 70W và ốp bảo vệ. Phù hợp edit video, thiết kế.',
    category: 'dien-tu',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      'https://images.unsplash.com/photo-1611186871348-b1ce696e52be?w=800',
    ],
    dailyPrice: 450_000,
    marketValue: 42_000_000,
    location: 'Quận 1, TP.HCM',
    ownerId: 'user_duc',
    nftPassport: {
      id: 'NFT-RELOO-00004',
      hash: generateMockHash('macbook-m3'),
      residualValue: 35_700_000,
      auditCount: 6,
      mintedAt: '2025-07-01T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'pro'],
    isBoosted: true,
    labels: ['Tin ưu tiên', 'Verified'],
    rating: 4.8,
    reviewCount: 11,
    condition: 'like_new',
    status: 'rented',
    createdAt: '2025-08-20T09:00:00.000Z',
    viewCount: 2100,
  },
  {
    id: 'listing_005',
    title: 'Xe đẩy em bé Aprica Luxuna Cushion AB',
    description:
      'Xe đẩy 2 chiều Nhật Bản, giảm xóc tốt, gập gọn. Phù hợp bé 0-3 tuổi. Đã vệ sinh khử khuẩn tại Reloo-Care trước khi cho thuê.',
    category: 'me-be',
    images: [
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800',
      'https://images.unsplash.com/photo-1515488042361-ee00e926ddd7?w=800',
    ],
    dailyPrice: 150_000,
    marketValue: 8_500_000,
    location: 'Quận 7, TP.HCM',
    ownerId: 'user_hoa',
    nftPassport: {
      id: 'NFT-RELOO-00005',
      hash: generateMockHash('aprica-stroller'),
      residualValue: 6_800_000,
      auditCount: 9,
      mintedAt: '2025-05-15T00:00:00.000Z',
    },
    trustBadges: ['verified', 'green_audit'],
    isBoosted: false,
    labels: ['Đã vệ sinh Reloo-Care'],
    rating: 4.6,
    reviewCount: 19,
    condition: 'good',
    status: 'available',
    createdAt: '2025-07-25T11:00:00.000Z',
    viewCount: 678,
  },
  {
    id: 'listing_006',
    title: 'Máy hút sữa đôi Medela Swing Maxi',
    description:
      'Máy hút sữa điện đôi Medela, pin sạc, ồn thấp. Bao gồm 4 bình trữ sữa và túi giữ lạnh. Vệ sinh Reloo-Care sau mỗi lần thuê.',
    category: 'me-be',
    images: [
      'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=800',
    ],
    dailyPrice: 200_000,
    marketValue: 6_500_000,
    location: 'Quận 7, TP.HCM',
    ownerId: 'user_hoa',
    nftPassport: {
      id: 'NFT-RELOO-00006',
      hash: generateMockHash('medela-pump'),
      residualValue: 5_200_000,
      auditCount: 7,
      mintedAt: '2025-06-01T00:00:00.000Z',
    },
    trustBadges: ['verified', 'green_audit'],
    isBoosted: false,
    labels: [],
    rating: 4.8,
    reviewCount: 14,
    condition: 'like_new',
    status: 'available',
    createdAt: '2025-09-05T10:30:00.000Z',
    viewCount: 534,
  },
  {
    id: 'listing_007',
    title: 'Váy dạ hội Self-Portrait đính sequin',
    description:
      'Váy dạ hội brand Self-Portrait size S, màu đen đính sequin. Mặc 2 lần, giặt khô chuyên nghiệp. Phù hợp tiệc cưới, gala, year-end party.',
    category: 'thoi-trang',
    images: [
      'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800',
      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800',
    ],
    dailyPrice: 350_000,
    marketValue: 12_000_000,
    location: 'Quận Phú Nhuận, TP.HCM',
    ownerId: 'user_duc',
    nftPassport: {
      id: 'NFT-RELOO-00007',
      hash: generateMockHash('self-portrait-dress'),
      residualValue: 9_600_000,
      auditCount: 4,
      mintedAt: '2025-08-01T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'pro'],
    isBoosted: true,
    labels: ['Tin ưu tiên'],
    rating: 5.0,
    reviewCount: 6,
    condition: 'like_new',
    status: 'available',
    createdAt: '2025-11-01T15:00:00.000Z',
    viewCount: 980,
    specs: {
      brand: 'Self-Portrait',
      size: 'S (36)',
      color: 'Đen đính sequin',
      material: 'Polyester, sequin',
      care: 'Giặt khô chuyên nghiệp',
    },
  },
  {
    id: 'listing_008',
    title: 'Túi Louis Vuitton Neverfull MM',
    description:
      'Túi LV Neverfull MM authentic, date code có sẵn. Bao gồm túi lót và dust bag. Cho thuê kèm Smart Tag định vị (tài sản giá trị cao).',
    category: 'thoi-trang',
    images: [
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800',
    ],
    dailyPrice: 500_000,
    marketValue: 28_000_000,
    location: 'Quận Phú Nhuận, TP.HCM',
    ownerId: 'user_duc',
    nftPassport: {
      id: 'NFT-RELOO-00008',
      hash: generateMockHash('lv-neverfull'),
      residualValue: 23_800_000,
      auditCount: 10,
      mintedAt: '2025-03-10T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'pro', 'top_rated'],
    isBoosted: false,
    labels: ['Smart Tag'],
    rating: 4.9,
    reviewCount: 18,
    condition: 'good',
    status: 'available',
    createdAt: '2025-04-20T12:00:00.000Z',
    viewCount: 1560,
  },
  {
    id: 'listing_009',
    title: 'Máy khoan Bosch GSB 18V-55',
    description:
      'Máy khoan búa Bosch 18V kèm 2 pin 4.0Ah và sạc nhanh. Torque 55Nm, phù hợp khoan tường, bắt vít. Bao gồm bộ mũi khoan cơ bản.',
    category: 'gia-dung',
    images: [
      'https://images.unsplash.com/photo-1504141923459-422f60827209?w=800',
    ],
    dailyPrice: 80_000,
    marketValue: 3_200_000,
    location: 'TP. Thủ Đức, TP.HCM',
    ownerId: 'user_khanh',
    nftPassport: {
      id: 'NFT-RELOO-00009',
      hash: generateMockHash('bosch-drill'),
      residualValue: 2_560_000,
      auditCount: 11,
      mintedAt: '2025-04-25T00:00:00.000Z',
    },
    trustBadges: ['verified', 'green_audit'],
    isBoosted: false,
    labels: ['Giá tốt'],
    rating: 4.4,
    reviewCount: 22,
    condition: 'good',
    status: 'available',
    createdAt: '2025-05-30T08:00:00.000Z',
    viewCount: 723,
  },
  {
    id: 'listing_010',
    title: 'Nồi chiên không dầu Philips XXL 7.3L',
    description:
      'Nồi chiên Philips XXL dung tích 7.3L, công nghệ Rapid Air. Phù hợp gia đình 4-6 người. Vệ sinh kỹ sau mỗi lần thuê.',
    category: 'gia-dung',
    images: [
      'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800',
    ],
    dailyPrice: 60_000,
    marketValue: 4_500_000,
    location: 'TP. Thủ Đức, TP.HCM',
    ownerId: 'user_khanh',
    nftPassport: {
      id: 'NFT-RELOO-00010',
      hash: generateMockHash('philips-airfryer'),
      residualValue: 3_600_000,
      auditCount: 6,
      mintedAt: '2025-06-15T00:00:00.000Z',
    },
    trustBadges: ['verified'],
    isBoosted: false,
    labels: [],
    rating: 4.3,
    reviewCount: 9,
    condition: 'good',
    status: 'available',
    createdAt: '2025-08-08T13:00:00.000Z',
    viewCount: 412,
  },
  {
    id: 'listing_011',
    title: 'DJI Mini 4 Pro Fly More Combo',
    description:
      'Drone DJI Mini 4 Pro kèm 3 pin, hub sạc, túi đựng. Quay 4K HDR, cảm biến tránh va chạm 360°. Phù hợp du lịch và quay phim ngắn.',
    category: 'dien-tu',
    images: [
      'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800',
      'https://images.unsplash.com/photo-1508614589041-895b88991e32?w=800',
    ],
    dailyPrice: 400_000,
    marketValue: 22_000_000,
    location: 'Vinhomes Grand Park, TP. Thủ Đức',
    locationDetails: {
      province: { name: 'Thành phố Hồ Chí Minh', code: '79' },
      ward: { name: 'Phường Long Bình', code: '26734' },
      addressDetail: 'Vinhomes Grand Park, Nguyễn Xiển',
    },
    ownerId: 'user_minh',
    nftPassport: {
      id: 'NFT-RELOO-00011',
      hash: generateMockHash('dji-mini4'),
      residualValue: 18_700_000,
      auditCount: 5,
      mintedAt: '2025-09-01T00:00:00.000Z',
    },
    trustBadges: ['verified', 'blockchain', 'green_audit'],
    isBoosted: false,
    labels: [],
    rating: 4.7,
    reviewCount: 7,
    condition: 'like_new',
    status: 'rented',
    createdAt: '2025-10-01T10:00:00.000Z',
    viewCount: 1340,
  },
  {
    id: 'listing_012',
    title: 'Túi ngủ mùa đông Naturehike -10°C',
    description:
      'Túi ngủ lông vũ tổng hợp chịu lạnh đến -10°C. Trọng lượng 1.4kg, pack size nhỏ gọn. Phù hợp trekking Sapa, Fansipan.',
    category: 'camping',
    images: [
      'https://images.unsplash.com/photo-1454496522488-786a8863dda3?w=800',
    ],
    dailyPrice: 100_000,
    marketValue: 2_200_000,
    location: 'Quận Bình Thạnh, TP.HCM',
    ownerId: 'user_hoa',
    nftPassport: {
      id: 'NFT-RELOO-00012',
      hash: generateMockHash('sleeping-bag'),
      residualValue: 1_870_000,
      auditCount: 4,
      mintedAt: '2025-11-10T00:00:00.000Z',
    },
    trustBadges: ['verified', 'green_audit'],
    isBoosted: false,
    labels: [],
    rating: 4.6,
    reviewCount: 5,
    condition: 'good',
    status: 'available',
    createdAt: '2025-12-01T09:00:00.000Z',
    viewCount: 289,
  },
  {
    id: 'listing_013',
    title: 'Đồng hồ Rolex Submariner Date (Replica cho thuê)',
    description:
      'Đồng hồ Submariner replica cao cấp cho thuê đi sự kiện, chụp hình. Không bán, chỉ cho thuê ngắn hạn. Cọc 100% giá trị.',
    category: 'thoi-trang',
    images: [
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
    ],
    dailyPrice: 250_000,
    marketValue: 5_000_000,
    location: 'Quận 1, TP.HCM',
    ownerId: 'user_duc',
    nftPassport: {
      id: 'NFT-RELOO-00013',
      hash: generateMockHash('submariner-watch'),
      residualValue: 4_250_000,
      auditCount: 3,
      mintedAt: '2025-10-15T00:00:00.000Z',
    },
    trustBadges: ['verified'],
    isBoosted: false,
    labels: [],
    rating: 4.2,
    reviewCount: 4,
    condition: 'good',
    status: 'available',
    createdAt: '2025-11-20T14:00:00.000Z',
    viewCount: 567,
  },
];

// ─── Orders ──────────────────────────────────────────────────────────────────

export const seedOrders = [
  {
    id: 'RL-2026-0001',
    listingId: 'listing_004',
    renterId: 'user_lan',
    lenderId: 'user_duc',
    status: ORDER_STATUS.IN_USE.code,
    days: 5,
    dailyPrice: 450_000,
    rentalTotal: 1_912_500,
    platformFee: 286_875,
    relooCareFee: 57_375,
    relooCarePlan: 'basic',
    deposit: 0,
    shippingFee: 45_000,
    grandTotal: 2_014_875,
    startDate: '2026-07-10T00:00:00.000Z',
    endDate: '2026-07-15T00:00:00.000Z',
    trackingNumber: 'GHTK-VN12345678',
    shippingProvider: 'GHTK',
    auditPickupHash: generateMockHash('audit-pickup-0001'),
    auditReturnHash: null,
    createdAt: '2026-07-08T10:30:00.000Z',
    paidAt: '2026-07-08T10:35:00.000Z',
    notes: 'Giao tại lobby chung cư',
  },
  {
    id: 'RL-2026-0002',
    listingId: 'listing_011',
    renterId: 'user_lan',
    lenderId: 'user_minh',
    status: ORDER_STATUS.SHIPPING.code,
    days: 3,
    dailyPrice: 400_000,
    rentalTotal: 1_200_000,
    platformFee: 180_000,
    relooCareFee: 60_000,
    relooCarePlan: 'premium',
    deposit: 0,
    shippingFee: 35_000,
    grandTotal: 1_295_000,
    startDate: '2026-07-14T00:00:00.000Z',
    endDate: '2026-07-17T00:00:00.000Z',
    trackingNumber: 'AHM-VN87654321',
    shippingProvider: 'Ahamove',
    goshipOrderId: 'RL-2026-0002',
    auditPickupHash: generateMockHash('audit-pickup-0002'),
    auditReturnHash: null,
    createdAt: '2026-07-12T15:00:00.000Z',
    paidAt: '2026-07-12T15:05:00.000Z',
    notes: 'Camping tại Đà Lạt cuối tuần',
  },
  {
    id: 'RL-2026-0003',
    listingId: 'listing_001',
    renterId: 'user_thao',
    lenderId: 'user_minh',
    status: ORDER_STATUS.COMPLETED.code,
    days: 2,
    dailyPrice: 600_000,
    rentalTotal: 1_200_000,
    platformFee: 180_000,
    relooCareFee: 36_000,
    relooCarePlan: 'basic',
    deposit: 45_000_000,
    shippingFee: 50_000,
    grandTotal: 46_286_000,
    startDate: '2026-06-20T00:00:00.000Z',
    endDate: '2026-06-22T00:00:00.000Z',
    trackingNumber: 'GHTK-VN99887766',
    shippingProvider: 'GHTK',
    auditPickupHash: generateMockHash('audit-pickup-0003'),
    auditReturnHash: generateMockHash('audit-return-0003'),
    createdAt: '2026-06-18T09:00:00.000Z',
    paidAt: '2026-06-18T09:10:00.000Z',
    completedAt: '2026-06-23T11:00:00.000Z',
    notes: 'Chụp pre-wedding',
    rating: 5,
    review: 'Máy ảnh tuyệt vời, chủ đồ nhiệt tình!',
  },
  {
    id: 'RL-2026-0004',
    listingId: 'listing_007',
    renterId: 'user_lan',
    lenderId: 'user_duc',
    status: ORDER_STATUS.PENDING.code,
    days: 1,
    dailyPrice: 350_000,
    rentalTotal: 350_000,
    platformFee: 52_500,
    relooCareFee: 10_500,
    relooCarePlan: 'basic',
    deposit: 0,
    shippingFee: 30_000,
    grandTotal: 392_500,
    startDate: '2026-07-20T00:00:00.000Z',
    endDate: '2026-07-21T00:00:00.000Z',
    trackingNumber: null,
    shippingProvider: null,
    auditPickupHash: null,
    auditReturnHash: null,
    createdAt: '2026-07-15T20:00:00.000Z',
    paidAt: null,
    notes: 'Tiệc year-end công ty',
  },
  {
    id: 'RL-2026-0005',
    listingId: 'listing_002',
    renterId: 'user_thao',
    lenderId: 'user_minh',
    status: ORDER_STATUS.OVERDUE.code,
    days: 3,
    dailyPrice: 180_000,
    rentalTotal: 540_000,
    platformFee: 81_000,
    relooCareFee: 16_200,
    relooCarePlan: 'basic',
    deposit: 3_500_000,
    shippingFee: 25_000,
    grandTotal: 4_062_200,
    startDate: '2026-07-05T00:00:00.000Z',
    endDate: '2026-07-08T00:00:00.000Z',
    trackingNumber: 'GHTK-VN11223344',
    shippingProvider: 'GHTK',
    auditPickupHash: generateMockHash('audit-pickup-0005'),
    auditReturnHash: null,
    createdAt: '2026-07-03T14:00:00.000Z',
    paidAt: '2026-07-03T14:05:00.000Z',
    notes: 'Camping Cát Tiên',
    overdueHours: 36,
  },
  {
    id: 'RL-2026-0006',
    listingId: 'listing_005',
    renterId: 'user_hoa',
    lenderId: 'user_hoa',
    status: ORDER_STATUS.DISPUTED.code,
    days: 7,
    dailyPrice: 150_000,
    rentalTotal: 892_500,
    platformFee: 133_875,
    relooCareFee: 26_775,
    relooCarePlan: 'basic',
    deposit: 0,
    shippingFee: 0,
    grandTotal: 919_275,
    startDate: '2026-06-25T00:00:00.000Z',
    endDate: '2026-07-02T00:00:00.000Z',
    trackingNumber: null,
    shippingProvider: 'Tự giao',
    auditPickupHash: generateMockHash('audit-pickup-0006'),
    auditReturnHash: generateMockHash('audit-return-0006-dispute'),
    createdAt: '2026-06-23T10:00:00.000Z',
    paidAt: '2026-06-23T10:05:00.000Z',
    notes: 'Tranh chấp: bánh xe bị xước nhẹ khi trả',
    disputeReason: 'Bánh xe trước bị xước so với Green Audit giao đi',
  },
  {
    id: 'RL-2026-0007',
    listingId: 'listing_009',
    renterId: 'user_khanh',
    lenderId: 'user_khanh',
    status: ORDER_STATUS.CANCELLED.code,
    days: 2,
    dailyPrice: 80_000,
    rentalTotal: 160_000,
    platformFee: 24_000,
    relooCareFee: 4_800,
    relooCarePlan: 'basic',
    deposit: 0,
    shippingFee: 20_000,
    grandTotal: 184_800,
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2026-07-03T00:00:00.000Z',
    trackingNumber: null,
    shippingProvider: null,
    auditPickupHash: null,
    auditReturnHash: null,
    createdAt: '2026-06-30T08:00:00.000Z',
    paidAt: '2026-06-30T08:05:00.000Z',
    cancelledAt: '2026-06-30T12:00:00.000Z',
    cancelReason: 'Chủ đồ không giao hàng trong 24h - hoàn tiền tự động',
  },
];

// ─── CMS Pages ───────────────────────────────────────────────────────────────

export const seedCmsPages = [
  {
    id: 'cms_about',
    slug: 'about',
    title: 'Về RELOO',
    metaDescription: 'RELOO - Sàn cho thuê P2P bảo chứng Blockchain tại Việt Nam',
    content: `# Về RELOO

RELOO là nền tảng cho thuê ngang hàng (P2P Rental) đầu tiên tại Việt Nam tích hợp **Blockchain** và **Green Audit** để đảm bảo mọi giao dịch minh bạch, an toàn.

## Sứ mệnh
Biến "Sở hữu cá nhân" thành "Sử dụng cộng đồng" - giúp bạn trải nghiệm đồ xịn với chi phí thấp, đồng thời tối ưu hóa tài sản nhàn rỗi.

## Giá trị cốt lõi
- **Minh bạch**: Kiểm tra thông tin, giá và điều kiện trước giao dịch
- **Tiết kiệm**: Cân nhắc thuê theo nhu cầu và chi phí thực tế
- **Tin cậy**: Green Audit và Trust Score cung cấp thêm thông tin để cân nhắc giao dịch

## Đội ngũ
Founded by Kent Lâm - với tầm nhìn phát triển hệ sinh thái cho thuê tại Việt Nam.`,
    updatedAt: '2026-01-10T00:00:00.000Z',
    published: true,
  },
  {
    id: 'cms_terms',
    slug: 'terms',
    title: 'Điều khoản sử dụng',
    metaDescription: 'Quy chế hoạt động nền tảng cho thuê P2P RELOO',
    content: `# Điều khoản sử dụng RELOO

## 1. Nguyên tắc chung
RELOO là **nền tảng cho thuê tài sản P2P** — không phải sàn mua bán. Mọi giao dịch phải thực hiện trên RELOO để được bảo vệ bởi Rule Engine, Gói An Tâm (Reloo Care) và Green Audit. Quyết định cuối thuộc Rule Engine + Decision Engine.

## 2. Phí dịch vụ
- Phí sàn: **15%** trên giá thuê thành công
- Gói An Tâm (Reloo Care): **3-5%** tùy gói
- Ký quỹ: Rule Engine + Trust Score · khách chuẩn giảm tối đa 25%

## 3. Quy trình giao dịch
1. **Đặt thuê** — chọn tài sản, thời gian, hình thức giao nhận; Identity phải **VERIFIED** (R003)
2. **Duyệt & thanh toán** — chủ đồ xác nhận; thanh toán PayOS; tiền vào **Tài khoản ký quỹ**
3. **Giao nhận** — đối chiếu **CCCD gốc** với eKYC; Green Audit ảnh/video khi bàn giao
4. **Sử dụng** — người thuê bảo quản tài sản; sử dụng đúng mục đích
5. **Trả đồ** — Green Audit trả đồ; hoàn ký quỹ sau đối chiếu bằng chứng

Chi tiết từng bước: xem **Quy trình vận hành cho thuê** tại /cms/rental-guide

## 4. Giao nhận an toàn
- Chỉ giao nhận qua **Goship đối tác RELOO** hoặc **chủ đồ đã xác thực** — có Green Audit
- **Không** tự ý giao/nhận qua shipper bên ngoài không liên kết RELOO
- Luôn chụp ảnh và quay video hiện trạng khi giao và khi trả

## 5. Trách nhiệm & bồi thường
- Người thuê chịu trách nhiệm bảo quản tài sản trong thời gian thuê
- Chi phí sửa chữa do lỗi sử dụng — trừ ký quỹ hoặc bồi thường theo Reloo Care
- Hư hỏng không thể sửa do bất cẩn nghiêm trọng — bồi thường theo Rule Engine

## 6. Tranh chấp
RELOO Trọng tài ra phán quyết trong 48 giờ dựa trên Chronicle và mã Hash Blockchain. Phán quyết là cuối cùng.

## 7. Phạt quá hạn
P = (Giá thuê/giờ × 200%) × Số giờ trễ — trừ trực tiếp vào ký quỹ trước khi hoàn phần còn lại.`,
    updatedAt: '2026-07-19T00:00:00.000Z',
    published: true,
  },
  {
    id: 'cms_rental_guide',
    slug: 'rental-guide',
    title: 'Quy trình vận hành cho thuê',
    metaDescription: 'Hướng dẫn A-Z quy trình thuê tài sản trên RELOO — minh bạch, an toàn',
    content: `# Quy trình vận hành cho thuê RELOO

Hướng dẫn chi tiết từ A-Z — tham khảo mô hình vận hành chuyên nghiệp trong ngành cho thuê thiết bị, áp dụng cho nền tảng P2P với Rule Engine và Green Audit.

## Bước 1 — Đặt thuê trên RELOO
- Chọn tài sản, thời gian thuê và hình thức giao nhận (Goship hoặc chủ đồ giao)
- Hoàn tất eKYC: Email, SĐT, CCCD, OCR và Face Match — **VERIFIED** mới được đặt thuê (R003)
- Có thể đặt nhiều tài sản trong một đơn nếu cùng chủ đồ và cùng khung thời gian

## Bước 2 — Duyệt đơn & thanh toán
- Chủ đồ xác nhận đơn; bạn nhận thông báo qua app/email khi đơn được duyệt
- Thanh toán phí thuê và ký quỹ qua **PayOS** — tiền giữ an toàn tại **Tài khoản ký quỹ**
- Mức ký quỹ do **Rule Engine + Trust Score** quyết định, không override thủ công

## Bước 3 — Giao nhận & xác minh danh tính
**Giấy tờ bắt buộc khi nhận tài sản:**
- CCCD/CMND gắn chip **bản gốc** — đối chiếu trực tiếp với eKYC RELOO
- Ảnh CCCD trên ứng dụng **VNeID** (khuyến nghị)
- Số điện thoại trùng tài khoản RELOO

**Green Audit khi giao:**
- Chụp 360°, quay video 15 giây, xác nhận vệ sinh và geotag
- Thời gian thuê bắt đầu khi xác nhận nhận hàng thành công

## Bước 4 — Trong thời gian thuê
- Bảo quản cẩn thận; tránh làm bẩn, trầy xước hoặc hư hại
- Sử dụng đúng mục đích; không tự ý tháo lắp hoặc chuyển giao cho bên thứ ba
- Chi phí bảo dưỡng/sửa chữa do lỗi sử dụng — trừ ký quỹ hoặc qua Reloo Care
- Thời gian thuê tính theo ngày/giờ đã chọn; **quá hạn** sẽ tính phí bổ sung

## Bước 5 — Trả đồ & hoàn ký quỹ
- Trả qua **Goship đối tác** hoặc gặp chủ đồ trực tiếp — kèm Green Audit trả đồ
- **Lưu ý:** Không tự book shipper bên ngoài không liên kết RELOO — mất bằng chứng nếu tranh chấp
- Kiểm tra tình trạng tài sản cùng chủ đồ hoặc qua video Green Audit
- Ký quỹ hoàn về sau đối chiếu bằng chứng — thường trong **24 giờ làm việc**

## Ưu đãi thuê dài ngày
- 1–3 ngày: giá gốc
- 4–7 ngày: giảm **15%**
- Từ 8 ngày: giảm **30%**

## Gói An Tâm (Reloo Care)
Reloo Care là thỏa thuận chia sẻ rủi ro cộng đồng — **không phải bảo hiểm thương mại**. Áp dụng khi tuân thủ đầy đủ Green Audit giao–nhận.`,
    updatedAt: '2026-07-19T00:00:00.000Z',
    published: true,
  },
  {
    id: 'cms_privacy',
    slug: 'privacy',
    title: 'Chính sách bảo mật',
    metaDescription: 'Tuân thủ Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân',
    content: `# Chính sách bảo mật

RELOO tuân thủ **Nghị định 13/2023/NĐ-CP** về bảo vệ dữ liệu cá nhân (PDPD).

## Dữ liệu thu thập
- Thông tin định danh (CCCD, SĐT, email) - khi eKYC
- Vị trí GPS - **chỉ trong thời gian thuê**, tự động hủy khi hoàn tất
- Video/Ảnh Green Audit - băm Hash lên Blockchain

## Cam kết
- Dữ liệu lưu trữ tại máy chủ Việt Nam
- Mã hóa end-to-end cho thông tin nhạy cảm
- Không bán dữ liệu cho bên thứ ba
- Quyền xóa dữ liệu theo yêu cầu (trừ dữ liệu giao dịch bắt buộc lưu 2 năm)`,
    updatedAt: '2026-02-01T00:00:00.000Z',
    published: true,
  },
  {
    id: 'cms_help',
    slug: 'help',
    title: 'Trung tâm trợ giúp',
    metaDescription: 'FAQ và hướng dẫn sử dụng RELOO',
    content: `# Trung tâm trợ giúp RELOO`,
    faqs: [
      {
        id: 'faq_1',
        question: 'RELOO là gì và hoạt động như thế nào?',
        answer:
          'RELOO là sàn cho thuê P2P cho phép bạn thuê hoặc cho thuê đồ dùng cá nhân. Mọi tài sản được định danh bằng NFT Passport và kiểm định qua Green Audit trước mỗi giao dịch.',
      },
      {
        id: 'faq_2',
        question: 'Green Audit là gì?',
        answer:
          'Green Audit là quy trình kiểm định 5 bước: chụp 360°, quay video 15 giây, xác nhận vệ sinh, geotag và niêm phong số. Dữ liệu được băm SHA-256 và ghi lên Blockchain Polygon.',
      },
      {
        id: 'faq_3',
        question: 'Trust Score ảnh hưởng gì đến tiền cọc?',
        answer:
          'Trust Score (0-1000) phản ánh uy tín thuê. Khách chuẩn giảm cọc tối đa 25%; nhóm cao cấp được xét duyệt định kỳ mới có thể giảm sâu hơn theo Rule Engine.',
      },
      {
        id: 'faq_4',
        question: 'Gói An Tâm (Reloo Care) khác gì bảo hiểm?',
        answer:
          'Reloo Care là thỏa thuận chia sẻ rủi ro cộng đồng, không phải bảo hiểm thương mại. Gói Basic (3%) bồi thường tối đa 50% hư hỏng (max 2 triệu). Gói Premium (5%) bồi thường 80% (max 10 triệu).',
      },
      {
        id: 'faq_5',
        question: 'Thuê dài ngày có được giảm giá không?',
        answer:
          'Có! 1-3 ngày: giá gốc. 4-7 ngày: giảm 15%. Trên 7 ngày: giảm 30%. Hệ thống tự động áp dụng khi bạn chọn số ngày thuê.',
      },
      {
        id: 'faq_6',
        question: 'Làm sao để nâng cấp KYC?',
        answer:
          'Vào Hồ sơ → Xác thực danh tính. L1: SĐT + Email. L2: CCCD 2 mặt + Face Match. L3: Liên kết mạng xã hội + ≥ 5 đơn thuê thành công.',
      },
      {
        id: 'faq_7',
        question: 'Phí sàn RELOO là bao nhiêu?',
        answer:
          'Phí dịch vụ sàn là 15% trên giá thuê thành công. Thành viên Pro Store được giảm xuống 12%. Phí rút tiền về ngân hàng: 5.000đ/lần.',
      },
      {
        id: 'faq_8',
        question: 'Tôi có thể hủy đơn hàng không?',
        answer:
          'Đơn chưa thanh toán: hủy miễn phí. Đơn đã thanh toán: hủy trước khi giao hàng được hoàn tiền (trừ phí cổng thanh toán). Nếu chủ đồ không giao sau 24h, hệ thống tự động hủy và hoàn tiền.',
      },
      {
        id: 'faq_9',
        question: 'Cần mang giấy tờ gì khi nhận tài sản?',
        answer:
          'CCCD/CMND gắn chip bản gốc (bắt buộc — đối chiếu với eKYC RELOO), nên có ảnh CCCD trên VNeID và SĐT trùng tài khoản. Không xuất trình giấy tờ hợp lệ — không bàn giao tài sản.',
      },
      {
        id: 'faq_10',
        question: 'Có được tự gọi shipper bên ngoài để nhận/trả đồ không?',
        answer:
          'Không khuyến khích. Chỉ giao nhận qua Goship đối tác RELOO hoặc chủ đồ đã xác thực — có Green Audit. Shipper bên ngoài không liên kết RELOO làm mất bằng chứng nếu tranh chấp.',
      },
      {
        id: 'faq_11',
        question: 'Khi nào được hoàn ký quỹ?',
        answer:
          'Sau Green Audit trả đồ và đối chiếu bằng chứng thành công. RELOO hoàn ký quỹ về trong vòng 24 giờ làm việc (trừ phí phát sinh: quá hạn, sửa chữa, bồi thường).',
      },
      {
        id: 'faq_12',
        question: 'Tôi làm hỏng tài sản thì xử lý thế nào?',
        answer:
          'Chi phí sửa chữa do lỗi sử dụng trừ vào ký quỹ hoặc bồi thường qua Reloo Care (nếu đã mua gói). Hư hỏng nghiêm trọng không thể sửa — Rule Engine quyết định mức bồi thường theo Chronicle và Green Audit.',
      },
    ],
    updatedAt: '2026-07-19T00:00:00.000Z',
    published: true,
  },
];

// ─── CRM: Leads & Tickets ────────────────────────────────────────────────────

export const seedLeads = [
  {
    id: 'lead_001',
    name: 'Nguyễn Văn An',
    phone: '0901111222',
    email: 'an.nguyen@gmail.com',
    source: 'Facebook Ads',
    interest: 'Cho thuê máy ảnh',
    status: 'new',
    notes: 'Có 2 body Sony, muốn đăng ký Pro Store',
    createdAt: '2026-07-14T09:00:00.000Z',
    assignedTo: null,
  },
  {
    id: 'lead_002',
    name: 'Trần Thị Bích',
    phone: '0912222333',
    email: 'bich.tran@company.vn',
    source: 'Google Search',
    interest: 'Thuê đồ camping team building',
    status: 'contacted',
    notes: 'Công ty 50 người, cần 10 bộ lều + bếp',
    createdAt: '2026-07-13T14:30:00.000Z',
    assignedTo: 'user_admin',
  },
  {
    id: 'lead_003',
    name: 'Lê Hoàng Cường',
    phone: '0923333444',
    email: 'cuong.le@gmail.com',
    source: 'Referral',
    interest: 'Partnership Reloo-Care',
    status: 'qualified',
    notes: 'Chủ tiệm giặt ủi cao cấp Q.7, muốn hợp tác vệ sinh đồ thuê',
    createdAt: '2026-07-10T11:00:00.000Z',
    assignedTo: 'user_admin',
  },
];

export const seedTickets = [
  {
    id: 'ticket_001',
    subject: 'Không nhận được mã OTP Green Audit',
    description: 'Tôi đang ở bước Green Audit nhận hàng nhưng không nhận được OTP qua SMS.',
    userId: 'user_lan',
    orderId: 'RL-2026-0002',
    status: TICKET_STATUS.IN_PROGRESS.code,
    priority: TICKET_PRIORITY.HIGH.code,
    category: 'Kỹ thuật',
    assignee: 'CSKH Team',
    messages: [
      {
        id: 'msg_001',
        sender: 'user_lan',
        text: 'Không nhận được OTP, đã thử 3 lần.',
        createdAt: '2026-07-14T08:30:00.000Z',
      },
      {
        id: 'msg_002',
        sender: 'support',
        text: 'Chào chị Lan, chúng tôi đã gửi lại OTP. Vui lòng kiểm tra tin nhắn trong 2 phút.',
        createdAt: '2026-07-14T08:45:00.000Z',
      },
    ],
    createdAt: '2026-07-14T08:25:00.000Z',
    updatedAt: '2026-07-14T08:45:00.000Z',
  },
  {
    id: 'ticket_002',
    subject: 'Khiếu nại hư hỏng xe đẩy - RL-2026-0006',
    description: 'Bánh xe bị xước khi trả so với video Green Audit lúc giao.',
    userId: 'user_hoa',
    orderId: 'RL-2026-0006',
    status: TICKET_STATUS.OPEN.code,
    priority: TICKET_PRIORITY.URGENT.code,
    category: 'Tranh chấp',
    assignee: 'Trọng tài RELOO',
    messages: [
      {
        id: 'msg_003',
        sender: 'user_hoa',
        text: 'Video trả đồ cho thấy bánh xe trước bị xước mới. Yêu cầu đối soát Hash Blockchain.',
        createdAt: '2026-07-03T16:00:00.000Z',
      },
    ],
    createdAt: '2026-07-03T15:55:00.000Z',
    updatedAt: '2026-07-03T16:00:00.000Z',
  },
  {
    id: 'ticket_003',
    subject: 'Hướng dẫn nâng cấp KYC lên Level 3',
    description: 'Muốn thuê máy ảnh 45 triệu nhưng KYC L2 chỉ cho thuê tối đa 5 triệu.',
    userId: 'user_thao',
    orderId: null,
    status: TICKET_STATUS.RESOLVED.code,
    priority: TICKET_PRIORITY.MEDIUM.code,
    category: 'Tài khoản',
    assignee: 'CSKH Team',
    messages: [
      {
        id: 'msg_004',
        sender: 'user_thao',
        text: 'Làm sao nâng KYC lên L3?',
        createdAt: '2026-06-15T10:00:00.000Z',
      },
      {
        id: 'msg_005',
        sender: 'support',
        text: 'Bạn cần liên kết Facebook/LinkedIn và hoàn thành ≥ 5 đơn thuê thành công với Trust Score ≥ 700.',
        createdAt: '2026-06-15T10:30:00.000Z',
      },
    ],
    createdAt: '2026-06-15T09:55:00.000Z',
    updatedAt: '2026-06-15T10:30:00.000Z',
    resolvedAt: '2026-06-15T10:30:00.000Z',
  },
  {
    id: 'ticket_004',
    subject: 'Yêu cầu rút thu nhập cho thuê chậm xử lý',
    description: 'Rút 2 triệu từ số dư cho thuê 3 ngày trước chưa về tài khoản ngân hàng.',
    userId: 'user_minh',
    orderId: null,
    status: TICKET_STATUS.OPEN.code,
    priority: TICKET_PRIORITY.MEDIUM.code,
    category: 'Tài chính',
    assignee: 'Finance Team',
    messages: [
      {
        id: 'msg_006',
        sender: 'user_minh',
        text: 'Rút tiền ngày 12/7, đến nay chưa nhận được.',
        createdAt: '2026-07-15T09:00:00.000Z',
      },
    ],
    createdAt: '2026-07-15T08:55:00.000Z',
    updatedAt: '2026-07-15T09:00:00.000Z',
  },
];

// ─── Ads Packages (pricing catalog) ──────────────────────────────────────────

export const seedAdsPackages = [
  {
    id: 'ads_push_camping',
    type: AD_PACKAGES.pushUp.id,
    categoryId: 'camping',
    name: 'Đẩy tin Camping',
    price: 5000,
    unit: 'lượt',
    description: 'Đưa tin lên đầu danh mục Camping ngay lập tức',
  },
  {
    id: 'ads_push_dientu',
    type: AD_PACKAGES.pushUp.id,
    categoryId: 'dien-tu',
    name: 'Đẩy tin Điện tử',
    price: 10000,
    unit: 'lượt',
    description: 'Đưa tin lên đầu danh mục Điện tử ngay lập tức',
  },
  {
    id: 'ads_push_giadung',
    type: AD_PACKAGES.pushUp.id,
    categoryId: 'gia-dung',
    name: 'Đẩy tin Gia dụng',
    price: 3000,
    unit: 'lượt',
    description: 'Đưa tin lên đầu danh mục Gia dụng ngay lập tức',
  },
  {
    id: 'ads_label_3d',
    type: AD_PACKAGES.label.id,
    name: 'Nhãn nổi bật 3 ngày',
    price: 29000,
    durationDays: 3,
    labelType: 'Tin ưu tiên',
    description: 'Gắn nhãn "Tin ưu tiên" trong 3 ngày',
  },
  {
    id: 'ads_label_7d',
    type: AD_PACKAGES.label.id,
    name: 'Nhãn Verified 7 ngày',
    price: 59000,
    durationDays: 7,
    labelType: 'Verified',
    description: 'Gắn nhãn "Đã kiểm định Verified" trong 7 ngày',
  },
  {
    id: 'ads_pro_monthly',
    type: AD_PACKAGES.proStore.id,
    name: 'Pro Store - Gói tháng',
    price: 299000,
    durationDays: 30,
    description: 'Gian hàng VIP, giảm phí sàn 12%, báo cáo chuyên sâu',
  },
  {
    id: 'ads_pro_yearly',
    type: AD_PACKAGES.proStore.id,
    name: 'Pro Store - Gói năm',
    price: 2500000,
    durationDays: 365,
    description: 'Tiết kiệm 2 tháng so với gói tháng',
  },
];

// ─── Finance Summary ─────────────────────────────────────────────────────────

export const seedFinanceSummary = {
  period: '2026-Q3',
  gmv: 128_500_000,
  platformRevenue: 19_275_000,
  relooCarePool: 3_855_000,
  adsRevenue: 2_450_000,
  activeUsers: 1247,
  activeListings: 856,
  completedOrders: 342,
  avgOrderValue: 375_731,
  disputeRate: 0.023,
  overdueRate: 0.015,
  grossMargin: 0.12,
  escrowBalance: 45_600_000,
  depositHeld: 18_200_000,
  lenderPayoutsPending: 6_800_000,
  monthlyTrend: [
    { month: '2026-04', gmv: 32_000_000, revenue: 4_800_000 },
    { month: '2026-05', gmv: 38_500_000, revenue: 5_775_000 },
    { month: '2026-06', gmv: 58_000_000, revenue: 8_700_000 },
  ],
  revenueBreakdown: {
    platformFee: 19_275_000,
    relooCare: 3_855_000,
    ads: 2_450_000,
    withdrawFees: 125_000,
    shippingMargin: 890_000,
  },
  topCategories: [
    { categoryId: 'dien-tu', gmv: 48_200_000, orders: 98 },
    { categoryId: 'camping', gmv: 35_800_000, orders: 142 },
    { categoryId: 'thoi-trang', gmv: 22_100_000, orders: 45 },
    { categoryId: 'me-be', gmv: 12_400_000, orders: 38 },
    { categoryId: 'gia-dung', gmv: 10_000_000, orders: 19 },
  ],
};

// ─── Risk Alerts ─────────────────────────────────────────────────────────────

export const seedRiskAlerts = [
  {
    id: 'risk_001',
    orderId: 'RL-2026-0005',
    userId: 'user_thao',
    type: 'overdue',
    level: RISK_LEVELS.HIGH.code,
    title: 'Quá hạn trả lều camping 36 giờ',
    description: 'Người thuê Thảo Vũ chưa trả lều Naturehike sau 36 giờ quá hạn. SĐT không liên lạc được.',
    gpsLastSeen: '10.8231, 106.6297',
    geofenceViolation: false,
    status: 'active',
    actions: ['Khóa tài khoản', 'Gửi Demand Letter', 'Liên hệ SĐT khẩn cấp'],
    createdAt: '2026-07-09T12:00:00.000Z',
  },
  {
    id: 'risk_002',
    orderId: 'RL-2026-0002',
    userId: 'user_lan',
    type: 'geofence',
    level: RISK_LEVELS.MEDIUM.code,
    title: 'Di chuyển xa 80km không khai báo',
    description: 'GPS người thuê Lan Trần phát hiện di chuyển đến Đà Lạt (>80km) mà chưa khai báo "Chuyến đi xa".',
    gpsLastSeen: '11.9404, 108.4583',
    geofenceViolation: true,
    status: 'active',
    actions: ['Gửi thông báo Level 1', 'Yêu cầu xác nhận an toàn tài sản'],
    createdAt: '2026-07-14T06:00:00.000Z',
  },
  {
    id: 'risk_003',
    orderId: null,
    userId: 'user_thao',
    type: 'identity',
    level: RISK_LEVELS.LOW.code,
    title: 'KYC L1 thuê tài sản giá trị cao',
    description: 'User KYC L1 đã thuê Sony A7IV (45 triệu) - vượt hạn mức 500k. Cần review thủ công.',
    gpsLastSeen: null,
    geofenceViolation: false,
    status: 'resolved',
    actions: ['Review thủ công', 'Yêu cầu nâng cấp KYC'],
    createdAt: '2026-06-18T09:15:00.000Z',
    resolvedAt: '2026-06-18T10:00:00.000Z',
    resolution: 'Admin phê duyệt tạm thời với cọc 100%',
  },
  {
    id: 'risk_004',
    orderId: 'RL-2026-0006',
    userId: 'user_hoa',
    type: 'dispute',
    level: RISK_LEVELS.MEDIUM.code,
    title: 'Tranh chấp hư hỏng xe đẩy',
    description: 'Hash Green Audit trả đồ khác biệt với giao đi - bánh xe bị xước.',
    gpsLastSeen: null,
    geofenceViolation: false,
    status: 'active',
    actions: ['Kích hoạt Trọng tài', 'Đối soát Hash Blockchain'],
    createdAt: '2026-07-03T16:05:00.000Z',
  },
];

// ─── Notifications ───────────────────────────────────────────────────────────

export const seedNotifications = [
  {
    id: 'notif_001',
    userId: 'user_lan',
    type: 'order',
    title: 'Đơn hàng đang vận chuyển',
    message: 'Drone DJI Mini 4 Pro đang được Ahamove giao đến bạn. Mã vận đơn: AHM-VN87654321',
    read: false,
    link: '/dashboard/orders/RL-2026-0002',
    createdAt: '2026-07-13T08:00:00.000Z',
  },
  {
    id: 'notif_002',
    userId: 'user_minh',
    type: 'payment',
    title: 'Nhận thanh toán đơn thuê',
    message: 'Bạn nhận 1.020.000đ từ đơn RL-2026-0002 (sau phí sàn 15%)',
    read: false,
    link: '/dashboard/wallet',
    createdAt: '2026-07-12T15:10:00.000Z',
  },
  {
    id: 'notif_003',
    userId: 'user_minh',
    type: 'risk',
    title: 'Cảnh báo: Đơn quá hạn RL-2026-0005',
    message: 'Người thuê Thảo Vũ quá hạn trả lều camping 36 giờ. Risk Ops đang xử lý.',
    read: true,
    link: '/orders/RL-2026-0005',
    createdAt: '2026-07-09T12:05:00.000Z',
  },
  {
    id: 'notif_004',
    userId: 'user_lan',
    type: 'promo',
    title: 'Giảm 15% khi thuê từ 4 ngày',
    message: 'Thuê lều camping 4-7 ngày được giảm 15% tổng giá. Đặt ngay trên RELOO!',
    read: true,
    link: '/explore?category=camping',
    createdAt: '2026-07-10T10:00:00.000Z',
  },
  {
    id: 'notif_006',
    userId: 'user_lan',
    type: 'kyc',
    title: 'Xác thực eKYC thành công',
    message: 'Tài khoản của bạn đã được nâng cấp lên Standard. Bạn có thể đặt thuê tài sản giá trị cao hơn.',
    read: false,
    link: '/dashboard/kyc',
    createdAt: '2026-07-14T09:30:00.000Z',
  },
  {
    id: 'notif_007',
    userId: 'user_lan',
    type: 'listing',
    title: 'Tin cho thuê được duyệt',
    message: 'Tin "Máy ảnh Sony A7 IV kèm lens" đã hiển thị công khai trên RELOO.',
    read: false,
    link: '/dashboard/assets',
    createdAt: '2026-07-13T14:20:00.000Z',
  },
  {
    id: 'notif_008',
    userId: 'user_lan',
    type: 'event',
    title: 'Giữ tiền hay giữ đất?',
    message: 'Tham gia khảo sát cộng đồng RELOO về xu hướng thuê đồ cao cấp — nhận voucher giảm phí sàn.',
    read: false,
    link: '/explore',
    createdAt: '2026-07-18T08:00:00.000Z',
  },
  {
    id: 'notif_009',
    userId: 'user_lan',
    type: 'payment',
    title: 'Thanh toán đơn thuê thành công',
    message: 'Bạn đã thanh toán 1.295.000đ cho đơn RL-2026-0002. Tiền đang được giữ tại tài khoản ký quỹ.',
    read: false,
    link: '/dashboard/orders/RL-2026-0002',
    createdAt: '2026-07-12T15:08:00.000Z',
  },
  {
    id: 'notif_010',
    userId: 'user_lan',
    type: 'system',
    title: 'Cập nhật chính sách ký quỹ',
    message: 'RELOO cập nhật quy trình giữ và hoàn tiền ký quỹ theo chuẩn Rule Engine mới.',
    read: true,
    link: '/cms/terms',
    createdAt: '2026-07-08T11:00:00.000Z',
  },
  {
    id: 'notif_005',
    userId: 'user_admin',
    type: 'system',
    title: 'Báo cáo tài chính Q3 sẵn sàng',
    message: 'GMV Q3 đạt 128.5 triệu VNĐ, tăng 67% so với Q2.',
    read: false,
    link: '/admin/finance',
    createdAt: '2026-07-15T08:00:00.000Z',
  },
];

// ─── Wallet (platform escrow overview) ───────────────────────────────────────

export const seedWallet = {
  escrowBalance: 45_600_000,
  depositHeld: 18_200_000,
  relooCarePool: 3_855_000,
  pendingWithdrawals: [
    {
      id: 'wd_001',
      userId: 'user_minh',
      amount: 2_000_000,
      fee: 5000,
      bankAccount: '9876543210 - Techcombank',
      status: 'pending',
      requestedAt: '2026-07-12T16:00:00.000Z',
    },
  ],
  recentTransactions: [
    {
      id: 'txn_001',
      type: 'rental_payout',
      userId: 'user_minh',
      amount: 1_020_000,
      orderId: 'RL-2026-0002',
      description: 'Giải ngân tiền thuê (85%)',
      createdAt: '2026-07-12T15:10:00.000Z',
    },
    {
      id: 'txn_002',
      type: 'platform_fee',
      amount: 180_000,
      orderId: 'RL-2026-0002',
      description: 'Phí sàn 15%',
      createdAt: '2026-07-12T15:10:00.000Z',
    },
    {
      id: 'txn_003',
      type: 'deposit_hold',
      userId: 'user_thao',
      amount: 3_500_000,
      orderId: 'RL-2026-0005',
      description: 'Giữ tiền cọc lều camping',
      createdAt: '2026-07-03T14:05:00.000Z',
    },
    {
      id: 'txn_004',
      type: 'ads_purchase',
      userId: 'user_duc',
      amount: 59000,
      description: 'Mua nhãn Verified 7 ngày',
      createdAt: '2026-07-11T11:00:00.000Z',
    },
    {
      id: 'txn_005',
      type: 'refund',
      userId: 'user_khanh',
      amount: 184_800,
      orderId: 'RL-2026-0007',
      description: 'Hoàn tiền đơn hủy',
      createdAt: '2026-06-30T12:05:00.000Z',
    },
  ],
};

// ─── Chat threads (demo) ───────────────────────────────────────────────────────

export const seedChatThreads = [
  {
    id: 'order_RL-2026-0001',
    type: 'order',
    listingId: 'listing_004',
    orderId: 'RL-2026-0001',
    lenderId: 'user_duc',
    buyerId: 'user_lan',
    createdAt: '2026-07-08T10:30:00.000Z',
    updatedAt: '2026-07-08T11:08:00.000Z',
    messages: [
      {
        id: 'm1',
        type: 'system',
        senderId: 'system',
        text: 'Trao đổi đơn thuê: Váy dạ hội Self-Portrait đính sequin',
        createdAt: '2026-07-08T10:30:00.000Z',
      },
      {
        id: 'm2',
        type: 'text',
        senderId: 'user_duc',
        text: 'Chị Lan cho em xin địa chỉ giao hàng nhé.',
        createdAt: '2026-07-08T11:00:00.000Z',
      },
      {
        id: 'm3',
        type: 'text',
        senderId: 'user_lan',
        text: 'Em ở lobby Vinhomes Grand Park, Thủ Đức ạ.',
        createdAt: '2026-07-08T11:05:00.000Z',
      },
      {
        id: 'm4',
        type: 'text',
        senderId: 'user_duc',
        text: 'Ok chị, 2h chiều nay shipper giao cho chị.',
        createdAt: '2026-07-08T11:08:00.000Z',
      },
    ],
  },
  {
    id: 'order_RL-2026-0002',
    type: 'order',
    listingId: 'listing_011',
    orderId: 'RL-2026-0002',
    lenderId: 'user_minh',
    buyerId: 'user_lan',
    createdAt: '2026-07-12T15:00:00.000Z',
    updatedAt: '2026-07-12T16:12:00.000Z',
    messages: [
      {
        id: 'm5',
        type: 'system',
        senderId: 'system',
        text: 'Trao đổi đơn thuê: Lều camping 4 người Naturehike',
        createdAt: '2026-07-12T15:00:00.000Z',
      },
      {
        id: 'm6',
        type: 'text',
        senderId: 'user_minh',
        text: 'Chị Lan, lều em gửi kèm tấm bạt chống mưa nhé.',
        createdAt: '2026-07-12T16:00:00.000Z',
      },
      {
        id: 'm7',
        type: 'text',
        senderId: 'user_lan',
        text: 'Dạ cảm ơn anh, Đà Lạt tuần này mưa nhiều lắm.',
        createdAt: '2026-07-12T16:12:00.000Z',
      },
    ],
  },
  {
    id: 'order_RL-2026-0004',
    type: 'order',
    listingId: 'listing_003',
    orderId: 'RL-2026-0004',
    lenderId: 'user_duc',
    buyerId: 'user_lan',
    createdAt: '2026-07-15T20:00:00.000Z',
    updatedAt: '2026-07-15T20:30:00.000Z',
    messages: [
      {
        id: 'm8',
        type: 'system',
        senderId: 'system',
        text: 'Trao đổi đơn thuê: Máy ảnh Sony A7III kèm lens 28-70mm',
        createdAt: '2026-07-15T20:00:00.000Z',
      },
      {
        id: 'm9',
        type: 'text',
        senderId: 'user_lan',
        text: 'Anh ơi em có thể đổi ngày nhận sang 21/7 được không?',
        createdAt: '2026-07-15T20:30:00.000Z',
      },
    ],
  },
];

// ─── Full seed state factory ─────────────────────────────────────────────────

export function createSeedState() {
  const users = seedUsers;
  const customers = seedCustomersFromUsers(users);
  return {
    user: users.find((u) => u.id === 'user_lan') ?? null,
    users,
    customers,
    customerBankAccounts: [],
    customerAuditLogs: [],
    listings: seedListings,
    orders: seedOrders,
    cmsPages: seedCmsPages,
    leads: seedLeads,
    tickets: seedTickets,
    adsPackages: seedAdsPackages,
    financeSummary: seedFinanceSummary,
    riskAlerts: seedRiskAlerts,
    notifications: seedNotifications,
    wallet: seedWallet,
    categories: CATEGORIES,
    settings: { ...DEFAULT_SETTINGS },
    guestLocation: null,
    chatThreads: seedChatThreads,
    chronicle: [],
    behaviorLogs: [],
    decisionLogs: [],
    identityProfiles: seedIdentityProfiles(users),
    sessionReplays: {},
    featureStore: {},
    lastRentalDecision: null,
    rentWaitlists: [],
  };
}
