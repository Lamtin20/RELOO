"use client";
import {usePassportStatus} from "./usePassportStatus";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Fingerprint,
  Leaf,
  Loader2,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { polygonExplorerTxUrl } from "@/lib/polygon";
import { formatDate, formatVND, shortHash } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import {
  countCompletedRentals,
  getListingRentalHistory,
} from "@/lib/listing-rentals";
import { RentalHistoryModal } from "./RentalHistoryModal";

/**
 * NFT Passport + trạng thái Polygon — hiển thị trên trang sản phẩm
 */
export function NftPassportCard({ passport, listingId, listingTitle, ownerId, orders = [] }) {
  const { user } = useAuth();
  const [hashCopied, setHashCopied] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const hash = passport?.hash ?? "";

  const rentalHistory = useMemo(
    () => getListingRentalHistory(orders, listingId, passport),
    [orders, listingId, passport],
  );

  const rentalCount = countCompletedRentals(rentalHistory);

  const canSeeResidual =
    user?.role === "admin" || (ownerId && user?.id === ownerId);

  const {status,loading}=usePassportStatus(hash);

  if (!passport) {
    return (
      <div className="nft-passport-card nft-passport-card--empty panel">
        <p className="text-muted text-sm">Tài sản chưa có NFT Passport.</p>
      </div>
    );
  }

  const networkOk = status?.ok;
  const passportStatus = status?.passport?.status ?? "loading";
  const explorerUrl = polygonExplorerTxUrl(hash);

  function copyHash() {
    if (!hash || typeof navigator === "undefined") return;
    navigator.clipboard?.writeText(hash);
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 1500);
  }

  return (
    <>
      <div className="nft-passport-card panel">
        <div className="nft-passport-card__head">
          <div className="nft-passport-card__title">
            <Fingerprint size={18} className="text-blue" />
            <div>
              <strong>NFT Passport</strong>
              <span className="nft-passport-card__id">{passport.id}</span>
            </div>
          </div>

          <div
            className={`nft-passport-card__network ${
              loading ? "is-loading" : networkOk ? "is-online" : "is-offline"
            }`}
          >
            {loading ? (
              <>
                <Loader2 size={13} className="spin" /> Đang kiểm tra Polygon…
              </>
            ) : networkOk ? (
              <>
                <Wifi size={13} /> Polygon · block{" "}
                {status.blockNumber?.toLocaleString("vi-VN") ?? "—"}
              </>
            ) : (
              <>
                <WifiOff size={13} /> {status?.message || "Chưa kết nối Polygon"}
              </>
            )}
          </div>
        </div>

        <div className="nft-passport-card__status">
          <ShieldCheck size={15} />
          <span
            className={`nft-passport-card__badge nft-passport-card__badge--${passportStatus}`}
          >
            {loading ? "Đang xác minh hash…" : status?.passport?.statusLabel}
          </span>
        </div>

        <div className="nft-passport-card__rows">
          <div className="nft-passport-card__row">
            <span>Mã Hash</span>
            <button type="button" className="hash-chip" onClick={copyHash}>
              <Copy size={11} />
              {hashCopied ? "Đã sao chép" : shortHash(hash, 8, 6)}
            </button>
          </div>

          {canSeeResidual && (
            <div className="nft-passport-card__row">
              <span>Giá trị còn lại</span>
              <strong>{formatVND(passport.residualValue)}</strong>
            </div>
          )}

          <div className="nft-passport-card__row nft-passport-card__row--action">
            <span>Số lần thuê</span>
            <div className="nft-passport-card__row-value">
              <strong>{rentalCount} lần</strong>
              {rentalHistory.length > 0 && (
                <button
                  type="button"
                  className="nft-passport-card__detail-btn"
                  onClick={() => setHistoryOpen(true)}
                >
                  Chi tiết <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="nft-passport-card__row">
            <span>Ngày mint</span>
            <strong>{formatDate(passport.mintedAt)}</strong>
          </div>
        </div>

        <div className="nft-passport-card__note">
          <Leaf size={14} />
          <p>
            Mỗi lượt thuê được ghi nhận qua Green Audit — băm SHA-256 và lưu vết trên Polygon PoS
            (chain 137).
            {!loading && networkOk && passportStatus === "pending" && (
              <em>
                {" "}
                Hash hiện là bản ghi nội bộ RELOO — sẽ được mint lên Polygon khi triển khai
                contract.
              </em>
            )}
          </p>
        </div>

        {explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="nft-passport-card__explorer hash-chip"
          >
            <ExternalLink size={12} /> Xem trên Polygonscan
          </a>
        )}
      </div>

      <RentalHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        listingTitle={listingTitle}
        rentalHistory={rentalHistory}
      />
    </>
  );
}
