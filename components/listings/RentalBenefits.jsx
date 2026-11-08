const BENEFITS = [
  {
    image: "upfront",
    title: "Giảm khoản mua ban đầu",
    text: "Thuê khi cần dùng ngắn hạn, thay vì mua cả món đồ.",
  },
  {
    image: "flexibility",
    title: "Linh hoạt theo kế hoạch",
    text: "Chọn thời gian thuê phù hợp với chuyến đi hoặc công việc.",
  },
  {
    image: "try-before-buy",
    title: "Trải nghiệm trước khi mua",
    text: "Thử thiết bị và tìm món phù hợp với nhu cầu của bạn.",
  },
  {
    image: "space",
    title: "Bớt đồ cần cất giữ",
    text: "Trả món đồ sau khi dùng, dành chỗ cho không gian sống.",
  },
  {
    image: "choice",
    title: "Nhiều lựa chọn hơn",
    text: "Khám phá nhiều loại sản phẩm cho từng mục đích sử dụng.",
  },
  {
    image: "reuse",
    title: "Tận dụng giá trị món đồ",
    text: "Đồ ít dùng của người này có thể hữu ích cho người khác.",
  },
];
export function RentalBenefits() {
  return (
    <section
      className="rental-benefits"
      aria-labelledby="rental-benefits-title"
    >
      <header>
        <span>THUÊ ĐỒ CÙNG RELOO</span>
        <h2 id="rental-benefits-title">
          Dùng điều bạn cần, theo cách linh hoạt.
        </h2>
        <p>
          Thêm lựa chọn cho cuộc sống, không nhất thiết phải sở hữu mọi thứ.
        </p>
      </header>
      <div>
        {BENEFITS.map((item,index) => (
          <article key={item.title}>
            <span className="rental-benefit-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </article>
        ))}
      </div>
      <small>
        Giá thuê, tiền cọc, giao nhận và trách nhiệm bảo quản do hai bên thống
        nhất. Lợi ích chi phí tùy sản phẩm và thời gian sử dụng.
      </small>
    </section>
  );
}
