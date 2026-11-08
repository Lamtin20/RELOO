# CHÍNH SÁCH VÀ TIÊU CHUẨN HÌNH ẢNH CHÂN THỰC (REALISTIC IMAGE POLICY) — RELOO REAL V5.0
**Dự án:** RELOO Real — Premium Experience Rebuild  
**Cấp độ ưu tiên:** CRITICAL / FIRST-CLASS ACCEPTANCE CRITERIA  
**Mục tiêu tối thượng:** Bảo vệ niềm tin thương mại, chống gian lận hình ảnh, phản ánh trung thực 100% tình trạng vật lý của tài sản giao dịch.

---

## 1. 12 NGUYÊN TẮC BẮT BUỘC VỀ TÍNH CHÂN THỰC CỦA HÌNH ẢNH

1. **Ưu tiên tuyệt đối ảnh chụp thực tế của người dùng (Genuine User Photographs):**
   - Mọi tin đăng cho thuê hoặc bán đồ cũ trên RELOO bắt buộc phải sử dụng hình ảnh chụp thực tế của sản phẩm đang sở hữu, tại không gian sinh hoạt hoặc làm việc thực tế của chủ sở hữu.
   - Nghiêm cấm tải ảnh dựng 3D hoặc ảnh quảng cáo bóng bẩy của nhà sản xuất làm ảnh đại diện cho món đồ đã qua sử dụng.

2. **Hình ảnh đối tác lưu trú và dịch vụ có bản quyền và được thẩm định (Licensed Partner Imagery):**
   - Đối với phân hệ Đặt phòng (`/dat-phong`), chỉ sử dụng hình ảnh thực tế của căn hộ, phòng nghỉ do chính chủ nhà hoặc đối tác cung ứng dịch vụ cung cấp và cam kết bản quyền hợp pháp.

3. **Bảo toàn nguyên trạng màu sắc, tình trạng và khuyết điểm vật lý (Preserve Real Condition & Defects):**
   - Hình ảnh phải thể hiện trung thực màu sắc thực tế dưới ánh sáng tự nhiên.
   - Nếu sản phẩm có vết xước, cấn góc, hao mòn theo thời gian hoặc thiếu phụ kiện, người đăng phải chụp cận cảnh rõ ràng khuyết điểm đó để người thuê nắm rõ trước khi đặt cọc.

4. **Nghiêm cấm tạo ảnh sản phẩm giả bằng AI (No Fictional AI Product Generation):**
   - Tuyệt đối không sử dụng các mô hình tạo ảnh AI (Midjourney, DALL-E, Stable Diffusion, Imagen) để tạo ra các bức ảnh sản phẩm giả tưởng rồi niêm yết như hàng thật có trong kho.

5. **Phân định ranh giới minh bạch của hình ảnh đồ họa (Strict Boundary for Generated Artwork):**
   - Hình ảnh đồ họa AI hoặc hình vẽ nghệ thuật chỉ được phép sử dụng duy nhất cho các mục đích: Ảnh minh họa bài viết tin tức khái niệm (Conceptual Artwork), banner truyền thông chiến dịch hoặc màn hình hướng dẫn người dùng mới (Onboarding Flow).
   - Khi sử dụng, phải gắn nhãn chú thích rõ ràng: `"Hình ảnh minh họa"`.

6. **Không bao giờ làm giả đánh giá, số lượng tồn kho hoặc giá ảo (Zero Fabricated Metrics):**
   - Nghiêm cấm tạo các con số ảo: "Đã có 9.999 người thuê", "Chỉ còn 1 món duy nhất", giảm giá ảo "90%", hoặc đánh giá 5 sao từ tài khoản ảo. Mọi số liệu hiển thị trên sàn phải bắt nguồn từ giao dịch thật của người dùng thật.

7. **Bảo đảm nguồn gốc pháp lý và quyền tác giả (Image Provenance & Copyright Rights):**
   - Lưu trữ siêu dữ liệu nguồn gốc hình ảnh (Image Provenance Metadata) bao gồm hàm băm hình ảnh, thời gian tải lên và mã tài khoản người đăng để phục vụ công tác đối soát bản quyền (DMCA) và giải quyết tranh chấp.

8. **Tối ưu hóa kỹ thuật hiển thị: Nén WebP/AVIF, Cắt cúp chuẩn và Lazy Loading:**
   - 100% hình ảnh tải lên hệ thống được tự động chuẩn hóa sang định dạng **WebP** chất lượng 82-85%, giảm 70% dung lượng mà mắt thường không thể phân biệt được sự suy giảm chất lượng.
   - Áp dụng kỹ thuật tải chậm (Lazy Loading) thông qua thuộc tính `loading="lazy"` và hiển thị ảnh khung mờ siêu nhẹ (Blur-up Placeholder) trong lúc chờ tải xong.

9. **Hình ảnh sắc nét độ phân giải cao trên màn hình Retina (High-Resolution Responsive Images):**
   - Sử dụng thẻ `next/image` với các điểm ngắt `sizes` linh hoạt:
     - Thẻ danh sách: chiều rộng kết xuất 300px - 400px (ảnh gốc lưu trữ 800px).
     - Chi tiết sản phẩm: chiều rộng kết xuất 600px - 900px (ảnh gốc lưu trữ 1600px).
   - Đảm bảo độ sắc nét hoàn hảo trên màn hình Apple Retina và Android Super AMOLED mà không làm quá tải băng thông mạng di động.

10. **Bản sắc hóa nội dung và hình ảnh gần gũi với đời sống Việt Nam (Authentic Vietnamese Context):**
    - Nội dung mẫu và ảnh chụp đại diện phản ánh đúng bối cảnh đường phố, nhà ở, chung cư và thói quen sinh hoạt của người dân Việt Nam (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Cần Thơ...), tránh dùng ảnh stock người mẫu phương Tây xa lạ không phù hợp với tâm lý người tiêu dùng nội địa.

11. **Gắn nhãn minh bạch đối với dữ liệu mẫu trong môi trường thử nghiệm (Explicit Prototype Content Marking):**
    - Trong môi trường phát triển (Development / Staging / Test Fixture), các sản phẩm mẫu phải được gắn nhãn công khai rõ ràng: `[HÀNG MẪU THỬ NGHIỆM — KHÔNG GIAO DỊCH THỰC TẾ]` để tránh gây hiểu lầm cho người dùng và đối tác kiểm thử.

12. **Nghiêm cấm dùng AI "làm đẹp" để xóa khuyết điểm sản phẩm (No Concealing Defects via AI Touch-up):**
    - Tính năng Visual AI chỉ làm nhiệm vụ nhận diện phân loại đồ vật và gợi ý thông số kỹ thuật; tuyệt đối không áp dụng các bộ lọc làm mịn, xóa trầy xước, tái tạo vân sơn nhân tạo hoặc thay đổi hiện trạng thực tế của món đồ.

---

## 2. QUY TRÌNH KIỂM DUYỆT VÀ BẢO ĐẢM CHẤT LƯỢNG HÌNH ẢNH

```text
[NGƯỜI DÙNG CHỤP ẢNH]
        │
        ▼
[KIỂM TRA GÓC CHỤP & ĐỘ SÁNG TỰ NHIÊN]
        │  (Khuyến nghị chụp ít nhất 3 ảnh: Mặt trước, Mặt sau, Tem/Phụ kiện)
        ▼
[NÉN WEBP & TẠO PLACEHOLDER TRÊN THIẾT BỊ]
        │
        ▼
[TRÍ TUỆ THỊ GIÁC VISUAL AI: NHẬN DIỆN VẬT THỂ]
        │  (Trích xuất gợi ý: Danh mục, Thương hiệu, Model)
        ▼
[XÁC NHẬN CỦA CHỦ ĐỒ: TÌNH TRẠNG HAO MÒN THỰC TẾ]
        │  (Đánh dấu: Like New / 95% / Có xước nhẹ...)
        ▼
[GẮN MÃ BẢO CHỨNG PHÁP LÝ & PHÁT HÀNH TIN ĐĂNG]
```

---

## 3. THÔNG SỐ KỸ THUẬT XỬ LÝ HÌNH ẢNH TRÊN MÁY KHÁCH VÀ MÁY CHỦ

- **Định dạng lưu trữ:** `.webp` (chính) và `.jpg` (dự phòng cho thiết bị cũ).
- **Tỉ lệ khung hình chuẩn:**
  - Thẻ sản phẩm & Tìm kiếm: `4:3` (`aspect-ratio: 4 / 3`).
  - Ảnh phòng nghỉ Homestay: `16:9` (`aspect-ratio: 16 / 9`).
  - Ảnh đại diện / Avatar: `1:1` hình tròn bo tròn hoàn hảo.
- **Kích thước tệp tin tối đa sau nén:** <= 180 KB cho ảnh thẻ danh sách; <= 450 KB cho ảnh chi tiết toàn cảnh.
- **Văn bản thay thế (Alt Text):** 100% hình ảnh bắt buộc có thuộc tính `alt` mô tả chuẩn bằng tiếng Việt phục vụ công cụ đọc màn hình cho người khiếm thị (VD: `alt="Máy ảnh Sony Alpha 7 IV kèm ống kính 24-70mm chụp thực tế"`).
