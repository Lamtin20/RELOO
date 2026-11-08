"use client";
import {usePassportStatus} from "./usePassportStatus";

import { useMemo, useState } from "react";
import {
  ChevronRight,
  Copy,
  ExternalLink,
  Leaf,
  Link2,
  Loader2,
  ShieldCheck,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { polygonExplorerTxUrl } from "@/lib/polygon";
import { formatDate, formatVND, shortHash } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import {
  countCompletedRentals,
  getListingRentalHistory,
} from "@/lib/listing-rentals";
import { RentalHistoryModal } from "./RentalHistoryModal";

/**
 * Modal chi tiết — chứng thư số trên blockchain (NFT Passport)
 */
export function BlockchainPassportModal({
  open,
  onClose,
  passport,
  listingId,
  listingTitle,
  ownerId,
  orders = [],
}) {
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

  const {status,loading}=usePassportStatus(hash,open);

  if (!passport) return null;

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
      <Modal
        open={open}
        onClose={onClose}
        title="Chứng thư số trên blockchain"
        size="lg"
      >
        <div className="blockchain-passport-modal">
          <div className="blockchain-passport-modal__hero">
            <div className="blockchain-passport-modal__hero-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="blockchain-passport-modal__hero-title">
                Hộ chiếu minh bạch RELOO
              </p>
              <p className="blockchain-passport-modal__hero-id">{passport.id}</p>
            </div>
            <div
              className={`blockchain-passport-modal__network ${
                loading ? "is-loading" : networkOk ? "is-online" : "is-offline"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="spin" /> Đang kiểm tra…
                </>
              ) : networkOk ? (
                <>
                  <Wifi size={13} /> Polygon · block{" "}
                  {status.blockNumber?.toLocaleString("vi-VN") ?? "—"}
                </>
              ) : (
                <>
                  <WifiOff size={13} /> {status?.message || "Chờ ghi lên blockchain"}
                </>
              )}
            </div>
          </div>

          {!loading && status?.passport?.statusLabel && (
            <p className="blockchain-passport-modal__status">
              Trạng thái: <strong>{status.passport.statusLabel}</strong>
            </p>
          )}

          <div className="blockchain-passport-modal__table">
            <div className="blockchain-passport-modal__row">
              <span>Số lần cho thuê</span>
              <div className="blockchain-passport-modal__row-value">
                <strong>{rentalCount} lần</strong>
                {rentalHistory.length > 0 && (
                  <button
                    type="button"
                    className="blockchain-passport-modal__link"
                    onClick={() => setHistoryOpen(true)}
                  >
                    Xem lịch sử <ChevronRight size={13} />
                  </button>
                )}
              </div>
            </div>

            <div className="blockchain-passport-modal__row">
              <span>Mã xác thực blockchain</span>
              <button
                type="button"
                className="blockchain-passport-modal__hash"
                onClick={copyHash}
              >
                <Link2 size={12} />
                {hashCopied ? "Đã sao chép" : shortHash(hash, 10, 8)}
                <Copy size={11} />
              </button>
            </div>

            {canSeeResidual && (
              <div className="blockchain-passport-modal__row">
                <span>Giá trị còn lại</span>
                <strong>{formatVND(passport.residualValue)}</strong>
              </div>
            )}

            {passport.mintedAt && (
              <div className="blockchain-passport-modal__row">
                <span>Ngày cấp chứng thư</span>
                <strong>{formatDate(passport.mintedAt)}</strong>
              </div>
            )}
          </div>

          <div className="blockchain-passport-modal__note">
            <Leaf size={15} />
            <p>
              Mỗi lượt thuê được ghi nhận qua Green Audit — băm SHA-256 và lưu vết trên mạng
              blockchain Polygon (chain 137), giúp bạn kiểm tra lịch sử minh bạch, chống tranh
              chấp.
              {!loading && networkOk && passportStatus === "pending" && (
                <em>
                  {" "}
                  Mã hash hiện là bản ghi nội bộ RELOO — sẽ được ghi lên Polygon khi triển khai
                  smart contract.
                </em>
              )}
            </p>
          </div>

          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="blockchain-passport-modal__explorer"
            >
              <ExternalLink size={14} /> Xem trên Polygonscan
            </a>
          )}
        </div>
      </Modal>

      <RentalHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        listingTitle={listingTitle}
        rentalHistory={rentalHistory}
      />
    </>
  );
}
