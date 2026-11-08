const PAGES = {
  '/tim-kiem':{title:'Tìm kiếm',section:'Dịch vụ RELOO',tone:'explore',action:'messages'},
  '/dang-tin':{title:'Đăng tin',section:'Dịch vụ RELOO',tone:'post',primary:true,action:'listings'},
  '/giao-dich':{title:'Giao dịch',section:'Dịch vụ RELOO',tone:'orders',primary:true,action:'messages'},
  '/viec-lam':{title:'Việc làm linh hoạt',section:'Dịch vụ RELOO',tone:'explore',action:'notifications'},
  '/dat-phong':{title:'Đặt phòng & Chỗ ở',section:'Dịch vụ RELOO',tone:'explore',action:'messages'},
  "/": {
    title: "RELOO",
    section: "Thuê · Mua · Khám phá",
    tone: "home",
    primary: true,
    action: "notifications",
  },
  "/explore": {
    title: "Khám phá sản phẩm",
    section: "Tìm món đồ phù hợp",
    tone: "explore",
    primary: true,
    action: "saved",
  },
  "/account": {
    title: "Cá nhân",
    section: "Tài khoản & hoạt động",
    tone: "account",
    primary: true,
    action: "settings",
  },
  "/lend": {
    title: "Đăng sản phẩm",
    section: "Cho thuê · Bán",
    tone: "post",
    action: "listings",
  },
  "/cashback": {
    title: "Ưu đãi & hoàn tiền",
    section: "Mua sắm tại đối tác",
    tone: "cashback",
    action: "income",
  },
  "/pricing": {
    title: "Định giá đồ dùng",
    section: "Tham khảo trước giao dịch",
    tone: "explore",
  },
  "/safety": {
    title: "Trung tâm an tâm",
    section: "Hiểu rõ trước giao dịch",
    tone: "safety",
    action: "help",
  },
  "/news": {
    title: "Câu chuyện RELOO",
    section: "Tin tức & cộng đồng",
    tone: "news",
  },
  "/help": {
    title: "Trợ giúp",
    section: "RELOO luôn sẵn sàng",
    tone: "safety",
  },
  "/notifications": {
    title: "Thông báo",
    section: "Cập nhật hoạt động",
    tone: "account",
    action: "security",
  },
  "/dashboard": {
    title: "Hoạt động của tôi",
    section: "Quản lý trên RELOO",
    tone: "account",
  },
  "/dashboard/purchases": {
    title: "Đơn mua & bán",
    section: "Theo dõi giao dịch",
    tone: "orders",
    action: "messages",
  },
  "/dashboard/orders": {
    title: "Đơn thuê",
    section: "Lịch thuê & giao nhận",
    tone: "orders",
    action: "messages",
  },
  "/dashboard/assets": {
    title: "Tin của tôi",
    section: "Cho thuê & bán",
    tone: "post",
    action: "post",
  },
  "/dashboard/assets/new": {
    title: "Đăng sản phẩm",
    section: "Tạo tin mới",
    tone: "post",
  },
  "/dashboard/cashflow": {
    title: "Thu nhập",
    section: "Dòng tiền & đối soát",
    tone: "income",
  },
  "/dashboard/wallet": {
    title: "Thu nhập & thanh toán",
    section: "Quản lý dòng tiền",
    tone: "income",
  },
  "/dashboard/profile": {
    title: "Cài đặt tài khoản",
    section: "Thông tin cá nhân",
    tone: "account",
  },
  "/dashboard/security": {
    title: "Bảo mật & thông báo",
    section: "Smart Key · Quyền riêng tư",
    tone: "safety",
    action: "help",
  },
  "/dashboard/kyc": {
    title: "Xác minh căn cước",
    section: "Hồ sơ của bạn",
    tone: "safety",
    action: "help",
  },
  "/dashboard/kyc/verify": {
    title: "Xác minh căn cước",
    section: "Chụp thẻ · Quét QR · Khuôn mặt",
    tone: "safety",
  },
  "/dashboard/promotions": {
    title: "Chương trình ưu đãi",
    section: "Ưu đãi cho hoạt động của bạn",
    tone: "cashback",
  },
  "/dashboard/ads": {
    title: "Quảng bá tin đăng",
    section: "Tiếp cận người cần",
    tone: "post",
  },
  "/dashboard/agreements": {
    title: "Thỏa thuận thuê",
    section: "Xác nhận & hành trình",
    tone: "orders",
  },
};
export function appHeaderProfile(pathname) {
  const context=pathname.startsWith('/news/')?{title:'Bài viết',section:'Tin tức & kinh nghiệm',tone:'news'}:pathname.startsWith('/noi-khu')?{title:'Đồ gần bạn',section:'Khu dân cư bạn chọn',tone:'explore'}:pathname.startsWith('/needs')?{title:'Nhu cầu thuê / mua',section:'Kết nối đồ dùng quanh bạn',tone:'explore'}:pathname.startsWith('/account/calendar')?{title:'Lịch & nhắc hạn',section:'Thiết lập một lần cho các đơn sau',tone:'account'}:null;
  if(context)return {...context,fallback:'/'};
  const exact = PAGES[pathname];
  if (exact)
    return {
      ...exact,
      fallback: pathname.startsWith("/dashboard") ? "/account" : "/",
    };
  if (/^\/dashboard\/assets\/[^/]+\/edit$/.test(pathname))
    return {
      title: "Chỉnh sửa tin",
      section: "Cập nhật sản phẩm",
      tone: "post",
      fallback: "/dashboard/assets",
    };
  if (pathname.startsWith("/purchase/"))
    return {
      title: "Yêu cầu mua",
      section: "Thông tin giao dịch",
      tone: "orders",
      fallback: "/explore",
    };
  if (pathname.startsWith("/rent/"))
    return {
      title: "Yêu cầu thuê",
      section: "Chọn lịch & giao nhận",
      tone: "orders",
      fallback: "/explore",
    };
  if (pathname.startsWith("/cms/"))
    return {
      title: "Thông tin RELOO",
      section: "Hướng dẫn & quy định",
      tone: "safety",
      fallback: "/account",
    };
  return {
    title: "RELOO",
    section: "Thuê · Mua · Cộng đồng",
    tone: "account",
    fallback: "/",
  };
}
