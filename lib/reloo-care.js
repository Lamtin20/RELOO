import { RELOO_CARE_PLANS } from './constants';
import { applyRelooCarePolicy, getRelooCareCompensationCap } from './reloo-care-policy';

export const DEFAULT_RELOO_CARE_PLAN_DETAILS = {
  basic: {
    intro:
      'Gói Basic bảo vệ bạn khỏi rủi ro hư hỏng nhẹ trong suốt thời gian thuê — phù hợp đồ dùng camping, gia dụng và thiết bị giá trị vừa phải.',
    benefits: [
      'Bồi thường hư hỏng nhẹ: vỡ, móp, trầy xước không ảnh hưởng chức năng chính',
      'Hỗ trợ xử lý khiếu nại trong 48 giờ làm việc',
      'Bồi thường tối đa 50% giá trị thiệt hại, trần cứng 1.000.000₫ (Gói Basic)',
      'Đội Reloo Care điều phối giữa người thuê và chủ đồ',
    ],
    supportBasics: [
      'Hotline hỗ trợ 1900 6868 (8h–22h)',
      'Tiếp nhận yêu cầu qua chat đơn hàng',
      'Hướng dẫn chụp ảnh hiện trạng & quy trình Green Audit',
      'Theo dõi tiến độ xử lý trên trang đơn hàng',
    ],
    terms:
      'Không áp dụng cho hư hỏng do cố ý, mất cắp, hoặc sử dụng sai mục đích. Cần báo cáo trong vòng 24h kể từ khi phát hiện.',
  },
  premium: {
    intro:
      'Gói Premium bảo vệ toàn diện với ưu tiên xử lý nhanh — dành cho máy ảnh, flycam, thiết bị điện tử và tài sản giá trị cao.',
    benefits: [
      'Bảo vệ toàn diện: hư hỏng cơ khí, linh kiện, màn hình và lỗi chức năng',
      'Xử lý ưu tiên trong 12 giờ làm việc',
      'Bồi thường tối đa 80% giá trị thiệt hại, trần cứng 3.000.000₫ (Gói Premium)',
      'Hỗ trợ thay thế tạm thời hoặc điều phối sửa chữa (tùy tình huống)',
    ],
    supportBasics: [
      'Hotline ưu tiên 1900 6868 — kênh VIP',
      'Quản lý case riêng theo dõi 24/7 trong thời gian thuê',
      'Tư vấn quy trình bảo quản & bảo hiểm bổ sung',
      'Hỗ trợ pháp lý cơ bản khi phát sinh tranh chấp',
    ],
    terms:
      'Áp dụng khi tuân thủ quy trình Green Audit giao–nhận. Không bao gồm thiệt hại do thiên tai, hóa chất corrosive hoặc tự ý tháo lắp.',
  },
};

/** Gộp cấu hình CMS (settings) với hằng số gói Reloo Care */
export function getRelooCarePlanDetail(planId, settings) {
  const base = RELOO_CARE_PLANS[planId];
  if (!base) return null;

  const cms = settings?.relooCarePlanDetails?.[planId] ?? {};
  const defaults = DEFAULT_RELOO_CARE_PLAN_DETAILS[planId] ?? {};

  return applyRelooCarePolicy({
    ...base,
    description: cms.shortDescription ?? base.description,
    intro: cms.intro ?? defaults.intro ?? base.description,
    benefits: cms.benefits?.length ? cms.benefits : defaults.benefits ?? [],
    supportBasics: cms.supportBasics?.length
      ? cms.supportBasics
      : defaults.supportBasics ?? [],
    terms: cms.terms ?? defaults.terms ?? '',
    maxCompensation: getRelooCareCompensationCap(planId),
  });
}

export function getAllRelooCarePlanDetails(settings) {
  return Object.keys(RELOO_CARE_PLANS).map((id) => getRelooCarePlanDetail(id, settings));
}
