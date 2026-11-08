"use client";
import { useState } from "react";
import {IdentityQrCard} from '@/components/profile/IdentityQrCard';
const MEDIA = {
  front: "Mặt trước căn cước",
  back: "Mặt sau căn cước",
  selfie: "Ảnh chân dung",
};
export function KycReview({ detail, onClose }) {
  const [loaded, setLoaded] = useState({});
  return (
    <section className="ops-editor kyc-review-panel">
      <h2>Hồ sơ căn cước khai báo</h2>
      {detail.mode!=='QR_ONLY'&&detail.matchChecks&&<p>Đối chiếu OCR với QR: số định danh {detail.matchChecks.id?'khớp':'cần kiểm tra'}; họ tên {detail.matchChecks.name?'khớp':'cần kiểm tra'}. {!detail.matchChecks.confident&&'OCR chưa đọc đủ chắc chắn; cần xem lại ảnh gốc.'}</p>}
      {detail.expiryCandidate&&<p>Ngày hết hạn đọc từ ảnh: {detail.expiryCandidate.split('-').reverse().join('/')} · cần đối chiếu trước khi duyệt.</p>}
      {detail.face&&<p>Đối sánh khuôn mặt: {detail.face.status==='PROCESSED'?(detail.face.verified?'Khớp theo mô hình, cần duyệt':'Chưa khớp, cần kiểm tra'):'Chưa có kết quả'}.</p>}
      {detail.qrFields&&<IdentityQrCard fields={detail.qrFields} full/>}
      <dl className="kyc-extracted">
        <div>
          <dt>Số căn cước</dt>
          <dd>{detail.nationalId || "Chưa bổ sung"}</dd>
        </div>
        <div>
          <dt>Ngày hết hạn</dt>
          <dd>
            {detail.expiryDate
              ? detail.expiryDate.split("-").reverse().join("/")
              : "Chưa bổ sung"}
          </dd>
        </div>
        <div>
          <dt>Hạn kiểm duyệt</dt>
          <dd>
            {detail.reviewDueAt
              ? new Date(detail.reviewDueAt).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                })
              : "Chưa có"}
          </dd>
        </div>
      </dl>
      <p>
        Hồ sơ có QR hợp lệ được duyệt theo thông tin QR; không yêu cầu OCR. Ba ảnh và video trực tiếp được giữ trong hồ sơ.
      </p>
      <div className="kyc-review-images">
        {Object.entries(MEDIA).map(([kind, label]) => (
          <figure key={kind}>
            <figcaption>{label}</figcaption>
            <a
              href={`/api/kyc/documents?id=${detail.id}&kind=${kind}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src={`/api/kyc/documents?id=${detail.id}&kind=${kind}`}
                alt={label}
                onLoad={() =>
                  setLoaded((current) => ({ ...current, [kind]: true }))
                }
                onError={() =>
                  setLoaded((current) => ({ ...current, [kind]: false }))
                }
              />
            </a>
            {loaded[kind] === false && (
              <p className="ops-error">
                Chưa tải được ảnh này. Cần kiểm tra lại trước khi duyệt.
              </p>
            )}
          </figure>
        ))}
      </div>
      <p className="profile-note">
        Đã tải {Object.values(loaded).filter(Boolean).length}/3 ảnh. Bấm ảnh để
        xem đầy đủ.
      </p>
      <button className="btn btn-secondary" onClick={onClose}>
        Đóng hồ sơ
      </button>
    </section>
  );
}
