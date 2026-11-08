"use client";

import {useStorageSnapshot,notifyLocalDataChange} from "@/lib/hooks/useStorageSnapshot";

import { Clock, X } from "lucide-react";
import { getRecentSearches, removeRecentSearch } from "@/lib/search-history";

export function HeaderRecentChips({ onSelect }) {
  const recent=useStorageSnapshot(()=>getRecentSearches().slice(0,6));

  if (recent.length === 0) return null;

  function handleRemove(e, term) {
    e.stopPropagation();
    removeRecentSearch(term);notifyLocalDataChange();
  }

  return (
    <div className="header-recent-chips" aria-label="Tìm kiếm gần đây">
      {recent.map((term) => (
        <button
          key={term}
          type="button"
          className="header-recent-chip"
          onClick={() => onSelect(term)}
        >
          <Clock size={13} className="header-recent-chip__icon" aria-hidden="true" />
          <span className="header-recent-chip__text">{term}</span>
          <span
            role="button"
            tabIndex={0}
            className="header-recent-chip__x"
            aria-label={`Xóa "${term}"`}
            onClick={(e) => handleRemove(e, term)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleRemove(e, term);
              }
            }}
          >
            <X size={12} />
          </span>
        </button>
      ))}
    </div>
  );
}
