"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { shortHash } from "@/lib/utils";
import {
  countCompletedRentals,
  getListingRentalHistory,
} from "@/lib/listing-rentals";
import { BlockchainPassportModal } from "./BlockchainPassportModal";

/**
 * Dòng gọn — bấm để mở modal chứng thư blockchain
 */
export function NftPassportCompact({
  passport,
  listingId,
  listingTitle,
  ownerId,
  orders = [],
}) {
  const [chainOk, setChainOk] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const hash = passport?.hash ?? "";

  const rentalHistory = useMemo(
    () => getListingRentalHistory(orders, listingId, passport),
    [orders, listingId, passport],
  );

  const rentalCount = countCompletedRentals(rentalHistory);

  useEffect(() => {
    if (!passport?.hash) {
      setChainOk(null);
      return;
    }

    let alive = true;
    fetch(`/api/polygon/passport?hash=${encodeURIComponent(hash)}`)
      .then((r) => r.json())
      .then((data) => alive && setChainOk(Boolean(data?.ok)))
      .catch(() => alive && setChainOk(false));

    return () => {
      alive = false;
    };
  }, [hash, passport]);

  if (!passport) {
    return (
      <div className="blockchain-trust-trigger blockchain-trust-trigger--empty">
        <ShieldCheck size={15} />
        <span>Tài sản chưa có chứng thư blockchain trên RELOO.</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="blockchain-trust-trigger"
        onClick={() => setDetailOpen(true)}
        aria-label="Xem chứng thư số trên blockchain"
      >
        <span className="blockchain-trust-trigger__icon">
          <ShieldCheck size={17} />
        </span>

        <span className="blockchain-trust-trigger__body">
          <span className="blockchain-trust-trigger__label">Chứng thư số blockchain</span>
          <span className="blockchain-trust-trigger__meta">
            {rentalCount} lần thuê
            <span className="blockchain-trust-trigger__dot" aria-hidden />
            {shortHash(hash, 6, 4)}
          </span>
        </span>

        {chainOk != null && (
          <span
            className={`blockchain-trust-trigger__status ${
              chainOk ? "is-online" : "is-pending"
            }`}
          >
            {chainOk ? "Polygon" : "Chờ ghi"}
          </span>
        )}

        <ChevronRight size={16} className="blockchain-trust-trigger__chev" aria-hidden />
      </button>

      <BlockchainPassportModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        passport={passport}
        listingId={listingId}
        listingTitle={listingTitle}
        ownerId={ownerId}
        orders={orders}
      />
    </>
  );
}
