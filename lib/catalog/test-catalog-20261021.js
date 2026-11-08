// Fictional, explicitly labelled fixtures. Never grants activation/identity approval.
export const TEST_CATALOG_BATCH='20261021';
const data=[
 ['camera','Máy ảnh mirrorless thân máy','may-anh',240000,22000000,{brand:'RELOO Test',model:'CAM-01',sensor:'Full-frame 24 MP; video 4K30 (thông số giả lập)',accessories:'2 pin, sạc, thẻ nhớ 64 GB, dây đeo, nắp thân máy',usageCount:'0'}],
 ['lens','Ống kính zoom đa dụng','may-anh',120000,9000000,{brand:'RELOO Test',model:'LENS-02',sensor:'Ống kính zoom 45–200 mm; khẩu độ f/4–5.6 (giả lập)',accessories:'Nắp trước/sau, hood, túi chống sốc',usageCount:'0'}],
 ['drone','Drone quay phim kèm bộ pin','may-quay',300000,26000000,{brand:'RELOO Test',model:'DRONE-03',sensor:'Video 4K30, ảnh 20 MP (giả lập)',accessories:'Điều khiển, 3 pin, bộ sạc, cánh dự phòng, túi đựng',usageCount:'0'}],
 ['tent','Lều dã ngoại hai lớp 2 người','camping',150000,3200000,{brand:'RELOO Test',capacity:'2 người; 210 × 210 × 120 cm (giả lập)',weight:'3,2 kg',weather:'Hai lớp, độ chống nước 2.000 mm (giả lập)',included:'Thân lều, tăng che, cọc, dây neo, tấm lót, túi'}],
 ['chair','Ghế gấp dã ngoại có túi','camping',40000,1200000,{brand:'RELOO Test',capacity:'1 người, tải trọng 100 kg (giả lập)',weight:'1,2 kg',weather:'Dùng nơi khô ráo, cất khi mưa lớn',included:'Ghế, chân ghế, túi đựng, hướng dẫn lắp'}],
 ['stove','Bếp gas dã ngoại đơn','camping',60000,1500000,{brand:'RELOO Test',capacity:'Bếp đơn, nồi đáy 12–22 cm',weight:'0,8 kg',weather:'Chỉ dùng ngoài trời, tránh gió mạnh và nơi kín',included:'Bếp, chân đỡ, hộp; không bao gồm bình gas'}],
 ['laptop','Laptop làm việc 15 inch','laptop-pc',110000,18000000,{brand:'RELOO Test',model:'LAP-07',specs:'RAM 8 GB, SSD 256 GB, màn hình 15 inch (giả lập)',warranty:'Không rõ',accessories:'Sạc USB-C 65 W, túi chống sốc, chuột'}],
 ['projector','Máy chiếu Full HD sự kiện nhỏ','may-chieu',220000,12000000,{brand:'RELOO Test',model:'PROJ-08',specs:'Full HD, HDMI, độ sáng 3.000 lumen (giả lập)',warranty:'Không rõ',accessories:'Điều khiển, dây nguồn, HDMI 3 m, túi, chân kê'}],
 ['console','Máy chơi game cầm tay và dock','gaming',160000,7500000,{brand:'RELOO Test',model:'GAME-09',specs:'Màn hình 6,2 inch; bộ nhớ 32 GB (giả lập)',warranty:'Không rõ',accessories:'2 tay cầm, dock, sạc, HDMI, hộp bảo vệ'}],
 ['dress','Váy dạ hội dáng dài size M','thoi-trang',190000,3500000,{brand:'RELOO Test',size:'M; ngực 86, eo 68, hông 92 cm (giả lập)',color:'Màu theo ảnh minh họa, cần xác nhận trước khi giao',material:'Vải tổng hợp lót mềm (giả lập)',care:'Treo móc, tránh vật sắc; không tự giặt tẩy',accessories:'Túi vải, móc treo, dây bảo vệ'}],
 ['stroller','Xe đẩy em bé gấp gọn','me-be',90000,4500000,{brand:'RELOO Test',ageRange:'6–36 tháng (giả lập)',weightLimit:'Tối đa 15 kg (giả lập)',safety:'Thông số mô phỏng; không dùng dữ liệu này để quyết định an toàn cho bé',sanitized:'Giặt sạch',accessories:'Mái che, đệm, dây đai, túi đựng'}],
 ['vacuum','Máy hút bụi gia đình','gia-dung',85000,5000000,{brand:'RELOO Test',dimensions:'110 × 25 × 20 cm (giả lập)',power:'220 V, 600 W (giả lập)',material:'Nhựa ABS, ống kim loại (giả lập)',usage:'Vệ sinh sàn khô trong căn hộ; không hút nước',accessories:'Đầu hút sàn, đầu khe, đầu chổi, dây nguồn'}],
 ['coffee','Máy pha espresso gia đình','nha-bep',130000,6500000,{brand:'RELOO Test',dimensions:'30 × 25 × 33 cm (giả lập)',power:'220 V, 1.100 W (giả lập)',material:'Inox, nhựa chịu nhiệt (giả lập)',usage:'Pha cà phê gia đình; vệ sinh vòi và khay sau dùng',accessories:'Tay cầm, 2 rổ lọc, tamper, ca sữa, hướng dẫn'}],
 ['drill','Máy khoan dùng pin và bộ mũi','cong-cu',100000,3500000,{brand:'RELOO Test',type:'Máy khoan vặn vít pin (giả lập)',power:'Pin 14,4 V, 1,5 Ah (giả lập)',safety:'Đeo kính, kiểm tra dây điện trong tường, tháo pin trước khi thay mũi',accessories:'2 pin, sạc, 10 mũi khoan/vít, vali'}],
 ['washer','Máy xịt rửa áp lực gia đình','cong-cu',140000,4200000,{brand:'RELOO Test',type:'Máy xịt rửa nước lạnh (giả lập)',power:'220 V, 1.400 W (giả lập)',safety:'Không phun vào người hoặc thiết bị điện; dùng nguồn nước sạch',accessories:'Súng, dây 5 m, 2 đầu phun, lọc đầu vào'}],
 ['speaker','Loa Bluetooth di động','am-thanh',80000,2800000,{brand:'RELOO Test',type:'Loa Bluetooth di động (giả lập)',power:'20 W; phòng 20 m² (giả lập)',accessories:'Cáp sạc, adapter, túi đựng'}],
 ['guitar','Đàn guitar acoustic kèm bao','nhac-cu',75000,3000000,{brand:'RELOO Test',type:'Guitar acoustic 6 dây (giả lập)',power:'Thùng đàn 40 inch; biểu diễn phòng nhỏ (giả lập)',accessories:'Bao đàn, tuner, capo, 3 pick, dây đeo'}],
 ['bicycle','Xe đạp đường trường người lớn','xe-dap',70000,6000000,{brand:'RELOO Test',model:'BIKE-18',year:'2024',plate:'Không áp dụng',license:'Không cần',fuel:'Sức người; 18 tốc độ (giả lập)',transmission:'Không áp dụng',seats:'1',consumption:'Không dùng nhiên liệu',features:'Chuông, đèn phản quang; không có giỏ trước (giả lập)',accessories:'Khóa dây, mũ bảo hiểm mẫu, bơm tay'}],
 ['car','Ô tô thể thao 4 chỗ','o-to',700000,480000000,{brand:'RELOO Test',model:'CAR-19',year:'2022',plate:'***0019',license:'Bằng B1',fuel:'Xăng (giả lập)',transmission:'Số tự động',seats:'4',consumption:'8,5 lít/100 km (giả lập)',features:'Điều hòa, camera lùi, Bluetooth (giả lập)',accessories:'Chìa khóa, giấy tờ đối chiếu, bộ vá, biển cảnh báo'}],
 ['printer','Máy in laser văn phòng A4','van-phong',60000,4000000,{brand:'RELOO Test',type:'Máy in laser đen trắng A4 (giả lập)',specs:'In hai mặt, USB, 20 trang/phút (giả lập)',pages:'500 trang mỗi tháng; vượt mức cần thỏa thuận trước',accessories:'Hộp mực thử, dây nguồn, cáp USB, hướng dẫn'}],
];
export const TEST_PRODUCT_DEFINITIONS=data.map(([key,name,category,dailyPrice,marketValue,specs],index)=>({key,name,category,dailyPrice,marketValue,specs,index:index+1}));
const wards=[{name:'Phường Bến Thành',code:26743},{name:'Phường Long Bình',code:26833},{name:'Phường Bình Thạnh',code:26929}];
export function buildTestCatalog({ownerId,credits=[]}={}){
 return TEST_PRODUCT_DEFINITIONS.map((item,index)=>{
  const n=item.index,mode=[9,10].includes(n)?'SALE':[8,16,18].includes(n)?'BOTH':'RENT',unit=[7,20].includes(n)?'MONTH':[5,11].includes(n)?'WEEK':'DAY';
  const accessories=item.specs.accessories||item.specs.included,ward=wards[index%wards.length],pickup=n!==8,deliver=![2,6,14].includes(n),imagePrefix=`/images/test-catalog-${TEST_CATALOG_BATCH}/${String(n).padStart(2,'0')}-${item.key}`;
  const credit=credits.find(c=>c.key===item.key),attribution=credit?`\nẢnh minh họa: ${credit.title} — ${credit.artist} — ${credit.license}. Nguồn: ${credit.page}. Giấy phép: ${credit.licenseUrl||credit.page}. Ảnh 2–3 là trích vùng chi tiết từ ảnh 1.`:'';
  return {id:`test-${TEST_CATALOG_BATCH}-${String(n).padStart(2,'0')}`,ownerId:ownerId||null,title:`[TEST] ${item.name}`,category:item.category,
   description:`SẢN PHẨM KIỂM THỬ — không phải lời chào giao dịch thực. Giá, cọc, thông số và điều kiện dưới đây là dữ liệu giả lập để kiểm tra giao diện và luồng xử lý RELOO.\n\n${item.name}. Bộ phụ kiện: ${accessories}. Kiểm tra lịch thuê, hình thức giao nhận, điều kiện và các khoản tiền trước khi gửi yêu cầu thử. Không chuyển tiền thật hoặc tổ chức giao nhận cho tin này.\n\nẢnh minh họa đúng nhóm sản phẩm, không chứng minh tình trạng hay cấu hình thực tế.${attribution}`,
   dailyPrice:mode==='SALE'?0:item.dailyPrice,marketValue:item.marketValue,transactionMode:mode,salePrice:mode==='RENT'?null:Math.round(item.marketValue*.6),condition:index%3===0?'like_new':'good',
   location:`${ward.name}, Thành phố Hồ Chí Minh`,locationDetails:{province:{name:'Thành phố Hồ Chí Minh',code:79},ward,street:'ĐIỂM NHẬN KIỂM THỬ — không có địa chỉ giao dịch thực'},
   images:[1,2,3].map(i=>`${imagePrefix}-${i}.webp`),specs:{...item.specs},status:'paused',isLocked:false,labels:['Dữ liệu kiểm thử'],trustBadges:[],rating:null,reviewCount:0,viewCount:0,isBoosted:false,testCatalogBatch:TEST_CATALOG_BATCH,
   rentalDetails:{version:1,billingUnit:unit,periodPrice:unit==='DAY'?null:unit==='WEEK'?item.dailyPrice*5:item.dailyPrice*22,longTermDiscountPercent:unit==='MONTH'?10:0,
    depositAmount:[5,16].includes(n)?0:Math.min(10000000,Math.round(item.marketValue*.15)),pickupAvailable:pickup,deliveryAvailable:deliver,deliveryFee:deliver?(n===11?0:n===19?150000:30000):0,
    pickupNote:pickup?'Điểm nhận mô phỏng trong khu vực đã chọn. Xác nhận lịch hẹn trong cuộc trao đổi trước khi thử bước giao nhận.':'Không áp dụng: mẫu này chỉ có lựa chọn giao tận nơi.',
    deliveryNote:deliver?'Phạm vi giao thử trong TP. Hồ Chí Minh; địa chỉ nhận được xác nhận riêng. Không có chuyến giao thực.':'Không áp dụng: mẫu này chỉ có lựa chọn tự đến lấy.',
    accessories,usageGuide:'Đọc hướng dẫn theo bộ; kiểm đếm phụ kiện, chụp tình trạng trước và sau. Dữ liệu này chỉ dùng kiểm thử, không thay hướng dẫn của nhà sản xuất.',
    requirements:'Tài khoản và danh tính phải đáp ứng quy tắc hiện hành của RELOO. Không sử dụng hồ sơ giả hoặc bỏ qua bước xác minh.',
    depositNote:'Số tiền cọc là giá trị giả lập. Không chuyển tiền thật; không xem tiền cọc là tiền thuê.',
    cancellationNote:'Hủy yêu cầu thử trước khi chủ đồ xác nhận. Không phát sinh khoản thanh toán thực trong dữ liệu này.',
    lateReturnNote:'Quá thời gian trả cần được chủ đồ xác nhận lại. Phụ phí mô phỏng chỉ dùng kiểm tra cách trình bày, không tự thu.',
    damageNote:'Ảnh tình trạng và phụ kiện được đối chiếu ở bước kiểm thử giao/nhận. Không ghi nhận thiệt hại thực từ bộ dữ liệu này.',
    rules:'BỘ DỮ LIỆU KIỂM THỬ. Không chuyển tiền thật, không giao nhận thật, không dùng thông số giả lập làm căn cứ sử dụng thiết bị. Giữ nguyên các kiểm tra quyền, danh tính và sự đồng ý của người dùng.',
    fees:[{name:'Phụ phí trả muộn mô phỏng',description:'Chỉ áp dụng khi hai bên xác nhận; không tự thu trong kiểm thử.',amount:Math.max(10000,Math.round(item.dailyPrice/8)),unit:'hour'}],
    extras:[{name:'Bộ phụ kiện bổ sung mô phỏng',description:'Tùy chọn bổ sung khi đã xác nhận với chủ đồ; không gồm trong tiền thuê cơ bản.',amount:20000,unit:'once'}]},
  };
 });
}
