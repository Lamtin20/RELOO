"use client";

import { Percent, TrendingUp, Info } from "lucide-react";
import { Money } from "@/components/ui";
import { AD_PACKAGES } from "@/lib/constants";
import { calcLenderEarningsPreview, formatVND } from "@/lib/utils";

/**
 * Bảng minh bạch phí sàn — chỉ hiển thị cho người cho thuê khi khai báo tin.
 */
export function PlatformFeePanel({ dailyPrice, user, previewDays = 3 }) {
  const price = Number(dailyPrice) || 0;
  const preview = calcLenderEarningsPreview({
    dailyPrice: price,
    days: previewDays,
    user,
  });

  const feePercent = Math.round(preview.platformFeeRate * 100);
  const isPro = user?.isPro;

  return (
    <div className="platform-fee-panel">
      <div className="platform-fee-panel__head">
        <Percent size={18} />
        <div>
          <strong>Phí dịch vụ sàn RELOO</strong>
          <p>
            Phí sàn <strong>{feePercent}%</strong> được trừ trên tiền thuê khi đơn hoàn tất thành
            công. Người thuê <em>không</em> phải trả thêm phí này.
          </p>
        </div>
      </div>

      {isPro && (
        <div className="platform-fee-panel__pro">
          <TrendingUp size={14} />
          Thành viên Pro Store — phí sàn ưu đãi {Math.round(AD_PACKAGES.proStore.platformFeeDiscount * 100)}%
        </div>
      )}

      {price > 0 ? (
        <div className="platform-fee-panel__calc">
          <span className="platform-fee-panel__calc-title">
            Ví dụ đơn {previewDays} ngày · {formatVND(price)}/ngày
          </span>
          <div className="platform-fee-panel__rows">
            <div className="platform-fee-panel__row">
              <span>Tiền thuê (người thuê trả)</span>
              <Money amount={preview.rentalTotal} />
            </div>
            <div className="platform-fee-panel__row platform-fee-panel__row--fee">
              <span>Phí sàn RELOO ({feePercent}%)</span>
              <span>-{formatVND(preview.platformFee)}</span>
            </div>
            <div className="platform-fee-panel__row platform-fee-panel__row--total">
              <span>Bạn nhận về (Thu nhập cho thuê)</span>
              <Money amount={preview.lenderReceives} />
            </div>
          </div>
        </div>
      ) : (
        <p className="platform-fee-panel__empty">
          <Info size={14} />
          Nhập giá thuê/ngày để xem ước tính thu nhập sau phí sàn.
        </p>
      )}

      <p className="platform-fee-panel__note">
        Tiền cọc, phí vận chuyển và Gói An Tâm Reloo Care do người thuê chi trả riêng — không
        tính vào phí sàn.
      </p>
    </div>
  );
}
