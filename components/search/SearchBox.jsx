"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bookmark, Clock, Search, X } from "lucide-react";

import { CATEGORIES } from "@/lib/constants";
import { Icon } from "@/components/ui";
import {
  addRecentSearch,
  clearRecentSearches,
  getLastViewedCategory,
  getRecentSearches,
  getSavedSearches,
  removeRecentSearch,
  removeSavedSearch,
  setLastViewedCategory,
  saveSearch,
} from "@/lib/search-history";
import {
  getPreferredCategorySlugs,
  getSuggestedCategorySlugs,
} from "@/lib/user-preferences";

export function SearchBox({
  variant = "header",
  placeholder = "Tìm máy ảnh, lều camping, váy dạ hội...",
  value: controlledValue,
  onChange,
  onSearch,
  className = "",
  showSubmitButton = false,
  submitLabel = "Tìm kiếm",
  autoFocus = false,
}) {
  const router = useRouter();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [internalValue, setInternalValue] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState("recent");
  const [recent, setRecent] = useState([]);
  const [saved, setSaved] = useState([]);
  const [lastCategory, setLastCategory] = useState(null);
  const [suggestSlugs, setSuggestSlugs] = useState([]);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  function setValue(next) {
    if (onChange) onChange(next);
    else setInternalValue(next);
  }

  function refreshLists() {
    setRecent(getRecentSearches());
    setSaved(getSavedSearches());
    setLastCategory(getLastViewedCategory());
    setSuggestSlugs(getSuggestedCategorySlugs(getPreferredCategorySlugs()));
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    refreshLists();
  }, [open]);

  useEffect(() => {
    function handlePointerDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const suggestCategories = suggestSlugs
    .map((slug) => CATEGORIES.find((c) => c.slug === slug))
    .filter(Boolean);

  function navigateQuery(q) {
    const term = q.trim();
    if (!term) {
      router.push("/explore");
      return;
    }
    addRecentSearch(term);
    refreshLists();
    if (onSearch) onSearch(term);
    else router.push(`/explore?q=${encodeURIComponent(term)}`);
    setOpen(false);
  }

  function navigateCategory(slug) {
    setLastViewedCategory(slug);
    setOpen(false);
    router.push(`/explore?category=${slug}`);
  }

  function handleSubmit(e) {
    e.preventDefault();
    navigateQuery(value);
  }

  function handleFocus() {
    refreshLists();
    setOpen(true);
  }

  function handleClearHistory() {
    clearRecentSearches();
    refreshLists();
  }

  function handleRemoveRecent(term) {
    removeRecentSearch(term);
    refreshLists();
  }

  function handleRemoveSaved(term) {
    removeSavedSearch(term);
    refreshLists();
  }

  function handleSaveRecent(term) {
    saveSearch(term);
    refreshLists();
  }

  const list = tab === "recent" ? recent : saved;
  const isHero = variant === "hero";
  const isExplore = variant === "explore";

  return (
    <div
      ref={rootRef}
      className={[
        "search-box",
        `search-box--${variant}`,
        open ? "search-box--open" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <form
        className={`search-box__form search-box__form--${variant}`}
        onSubmit={handleSubmit}
      >
        <span className="search-box__icon" aria-hidden="true">
          <Search size={isHero ? 18 : 16} />
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="search-box__input"
          aria-label="Tìm kiếm sản phẩm"
          aria-expanded={open}
          aria-controls="search-suggest-panel"
          autoFocus={autoFocus}
        />
        {showSubmitButton && (
          <button
            type="submit"
            className={`search-box__submit search-box__submit--${variant}`}
          >
            {submitLabel}
          </button>
        )}
      </form>

      {mounted && open && (
        <div id="search-suggest-panel" className="search-suggest" role="dialog" aria-label="Gợi ý tìm kiếm">
          <div className="search-suggest__tabs">
            <button
              type="button"
              className={`search-suggest__tab ${tab === "recent" ? "is-active" : ""}`}
              onClick={() => setTab("recent")}
            >
              Gần đây
            </button>
            <button
              type="button"
              className={`search-suggest__tab ${tab === "saved" ? "is-active" : ""}`}
              onClick={() => setTab("saved")}
            >
              Đã lưu
            </button>
            {tab === "recent" && recent.length > 0 && (
              <button type="button" className="search-suggest__clear" onClick={handleClearHistory}>
                Xóa lịch sử
              </button>
            )}
          </div>

          <div className="search-suggest__list">
            {list.length === 0 ? (
              <div className="search-suggest__empty">
                {tab === "recent" ? (
                  <p>Chưa có tìm kiếm gần đây. Thử gõ từ khóa hoặc chọn danh mục bên dưới.</p>
                ) : (
                  <p>
                    Chưa lưu từ khóa nào.{" "}
                    <Link href="/explore?saved=1" onClick={() => setOpen(false)}>
                      Xem tin đã lưu
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              list.map((term) => (
                <div key={term} className="search-suggest__row">
                  <button
                    type="button"
                    className="search-suggest__row-main"
                    onClick={() => navigateQuery(term)}
                  >
                    {tab === "recent" ? (
                      <Clock size={15} className="search-suggest__row-ic" />
                    ) : (
                      <Bookmark size={15} className="search-suggest__row-ic" />
                    )}
                    <span>{term}</span>
                  </button>
                  {tab === "recent" && !saved.includes(term) && (
                    <button
                      type="button"
                      className="search-suggest__row-save"
                      onClick={() => handleSaveRecent(term)}
                      aria-label={`Lưu "${term}"`}
                      title="Lưu tìm kiếm"
                    >
                      <Bookmark size={14} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="search-suggest__row-x"
                    onClick={() =>
                      tab === "recent" ? handleRemoveRecent(term) : handleRemoveSaved(term)
                    }
                    aria-label={`Xóa "${term}"`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="search-suggest__section">
            <h4 className="search-suggest__heading">Gợi ý cho bạn</h4>
            <div className="search-suggest__grid">
              {suggestCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="search-suggest__cat"
                  onClick={() => navigateCategory(cat.slug)}
                >
                  <span className="search-suggest__cat-thumb">
                    <Icon name={cat.icon} size="md" />
                  </span>
                  <span className="search-suggest__cat-text">
                    <span className="search-suggest__cat-name">{cat.name}</span>
                    {lastCategory === cat.slug && (
                      <span className="search-suggest__cat-badge">Đã xem gần đây</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
