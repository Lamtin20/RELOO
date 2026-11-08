export const BANNER_SLOTS = {
  home_categories: {
    label: "Trang chủ · sau danh mục chính",
    desktop: [1200, 300],
    mobile: [750, 400],
  },
  home_bottom: {
    label: "Trang chủ · cuối trang",
    desktop: [1200, 300],
    mobile: [750, 400],
  },
  home_top: {
    label: "Trang chủ · sau khu tìm kiếm",
    desktop: [1440, 400],
    mobile: [750, 500],
  },
  home_middle: {
    label: "Trang chủ · giữa nội dung",
    desktop: [1200, 300],
    mobile: [750, 500],
  },
  explore_top: {
    label: "Khám phá đồ thuê · đầu trang",
    desktop: [1200, 240],
    mobile: [750, 360],
  },
  news_top: {
    label: "Tin tức · đầu danh sách",
    desktop: [1200, 300],
    mobile: [750, 400],
  },
  dashboard_top: {
    label: "Khu người cho thuê · đầu trang",
    desktop: [1200, 240],
    mobile: [750, 400],
  },
  lend_top: {
    label: "Trang cho thuê đồ",
    desktop: [1440, 400],
    mobile: [750, 500],
  },
  cashback_top: {
    label: "Mua sắm hoàn tiền",
    desktop: [1200, 300],
    mobile: [750, 500],
  },
  posm: {
    label: "POSM lưu trong CRM (tải để sử dụng)",
    desktop: [2000, 2000],
    mobile: [1080, 1920],
  },
};
export function bannerImageFits(asset, size) {
  return (
    asset &&
    asset.width >= size[0] / 2 &&
    asset.height >= size[1] / 2 &&
    Math.abs(asset.width / asset.height - size[0] / size[1]) /
      (size[0] / size[1]) <=
      0.06
  );
}
