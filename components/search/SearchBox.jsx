"use client";

import { useEffect, useSyncExternalStore, useRef, useState, useId, useCallback } from "react";
import Link from "next/link";
import {useLocale} from '@/components/settings/LocaleProvider';
import {searchBoxCopy} from '@/lib/i18n/search-box';
import { useRouter } from "next/navigation";
import { Bookmark, Clock, Search, X } from "lucide-react";

import { CATEGORIES } from "@/lib/constants";
import {usePersonalization} from '@/components/rental-care/PersonalizationProvider';
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
  placeholder,
  value: controlledValue,
  onChange,
  onSearch,
  className = "",
  showSubmitButton = false,
  submitLabel,
  autoFocus = false,
}) {
  const router = useRouter();
  const panelId=useId(),panelRef=useRef(null),{locale}=useLocale(),copy=searchBoxCopy[locale]||searchBoxCopy['vi-VN'];
  const {actor,epoch,enabled,record}=usePersonalization();
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const [internalValue, setInternalValue] = useState("");
  const [open, setOpen] = useState(false);
  const mounted=useSyncExternalStore(()=>()=>{},()=>true,()=>false);
  const [tab, setTab] = useState("recent");
  const [recent, setRecent] = useState([]);
  const [saved, setSaved] = useState([]);
  const [historyOwner,setHistoryOwner]=useState('');
  const [lastCategory, setLastCategory] = useState(null);
  const [suggestSlugs, setSuggestSlugs] = useState([]);

  const value = controlledValue !== undefined ? controlledValue : internalValue;

  function setValue(next) {
    if (onChange) onChange(next);
    else setInternalValue(next);
  }

  const refreshLists=useCallback(() => {
    const scope=window.__relooInterestScope,allowed=enabled&&scope?.actor===actor&&scope.epoch===epoch;
    setHistoryOwner(allowed?actor+':'+epoch:'');
    setRecent(allowed?getRecentSearches():[]);
    setSaved(allowed?getSavedSearches():[]);
    setLastCategory(allowed?getLastViewedCategory():null);
    setSuggestSlugs(getSuggestedCategorySlugs(getPreferredCategorySlugs()));
  },[actor,epoch,enabled]);

  useEffect(()=>{const change=()=>refreshLists();window.addEventListener('reloo-interest-scope-changed',change);return()=>window.removeEventListener('reloo-interest-scope-changed',change);},[refreshLists]);

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
    record('SEARCH',{query:term});
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

  const ownsHistory=enabled&&historyOwner===actor+':'+epoch;
  const list = ownsHistory?(tab === "recent" ? recent : saved):[];
  const isHero = variant === "hero";
  const isExplore = variant === "explore";

  return (
    <div
      ref={rootRef}
      onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();inputRef.current?.focus({preventScroll:true});setOpen(false)}else if(event.key==='ArrowDown'&&event.target===inputRef.current&&open){event.preventDefault();panelRef.current?.querySelector('button')?.focus()}}}
      onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false)}}
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
          type="text" role="combobox" aria-autocomplete="none"
          disabled={!mounted}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder??copy.placeholder}
          className="search-box__input"
          aria-label={copy.input}
          aria-expanded={open}
          aria-controls={open?panelId:undefined}
          aria-haspopup="dialog"
          autoFocus={autoFocus}
        />
        {showSubmitButton && (
          <button
            type="submit"
            disabled={!mounted}
            className={`search-box__submit search-box__submit--${variant}`}
          >
            {submitLabel??copy.submit}
          </button>
        )}
      </form>

      {mounted && open && (
        <div id={panelId} ref={panelRef} className="search-suggest" role="dialog" aria-modal="false" aria-label={copy.suggestions}>
          <div className="search-suggest__tabs">
            <button
              type="button"
              className={`search-suggest__tab ${tab === "recent" ? "is-active" : ""}`} aria-pressed={tab==='recent'}
              onClick={() => setTab("recent")}
            >
              {copy.recent}
            </button>
            <button
              type="button"
              className={`search-suggest__tab ${tab === "saved" ? "is-active" : ""}`} aria-pressed={tab==='saved'}
              onClick={() => setTab("saved")}
            >
              {copy.saved}
            </button>
            {ownsHistory && tab === "recent" && recent.length > 0 && (
              <button type="button" className="search-suggest__clear" onClick={handleClearHistory}>
                {copy.clear}
              </button>
            )}
          </div>

          <div className="search-suggest__list">
            {list.length === 0 ? (
              <div className="search-suggest__empty">
                {tab === "recent" ? (
                  <p>{copy.emptyRecent}</p>
                ) : (
                  <p>
                    {copy.emptySaved}{" "}
                    <Link href="/explore?saved=1" onClick={() => setOpen(false)}>
                      {copy.viewSaved}
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
                      aria-label={`${copy.save} "${term}"`}
                      title={copy.saveSearch}
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
                    aria-label={`${copy.remove} "${term}"`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="search-suggest__section">
            <h4 className="search-suggest__heading">{copy.suggested}</h4>
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
                    {ownsHistory && lastCategory === cat.slug && (
                      <span className="search-suggest__cat-badge">{copy.viewed}</span>
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
