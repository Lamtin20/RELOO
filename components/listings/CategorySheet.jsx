"use client";
import { useEffect, useRef, useState } from "react";
import {IntentLink as Link} from '@/components/mobile/IntentLink';
import { X, ChevronDown, ChevronUp } from "lucide";
import { MorphIcon } from "@/components/ui/MorphIcon";
import { getSpecGroupId, CATEGORY_SPEC_GROUPS } from "@/lib/category-specs";
import { categoryArtwork, CATEGORY_GROUP_ORDER } from "@/lib/category-artwork";
export function CategorySheet({
  categories = [],
  hrefFor = (cat) => "/explore?category=" + encodeURIComponent(cat.slug),
}) {
  const dialog = useRef(null),
    trigger = useRef(null);
  const [open, setOpen] = useState(false),
    [expanded, setExpanded] = useState(null);
  const groups = categories.reduce((all, cat) => {
    const id = getSpecGroupId(cat.id);
    (all[id] ||= []).push(cat);
    return all;
  }, {});
  useEffect(() => {
    if (!open) return;
    const node = dialog.current,
      button = trigger.current,
      previous = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = "hidden";
    // NativeBridge translates the Android Back button into Escape.
    const escape = (event) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('keydown', escape);
      node.close();
      document.body.style.overflow = previous;
      button?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        ref={trigger}
        className="market-category-trigger"
        aria-label="Xem tất cả danh mục"
        type="button"
        onClick={() => setOpen(true)}
      >
        Xem tất cả{" "}
        <MorphIcon icon={open ? ChevronUp : ChevronDown} size={18} />
      </button>
      <dialog
        ref={dialog}
        className="market-category-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="market-category-heading"
        onCancel={() => setOpen(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <header>
          <button
            type="button"
            aria-label="Đóng danh mục"
            onClick={() => setOpen(false)}
          >
            <MorphIcon icon={X} size={22} />
          </button>
          <h2 id="market-category-heading">Tất cả danh mục</h2>
        </header>
        <div className="market-category-sheet__body">
          {Object.entries(groups)
            .sort(
              ([a], [b]) =>
                CATEGORY_GROUP_ORDER.indexOf(a) -
                CATEGORY_GROUP_ORDER.indexOf(b),
            )
            .map(([id, cats]) => (
              <section key={id}>
                <button
                  type="button"
                  aria-expanded={expanded === id}
                  aria-controls={"market-group-" + id}
                  onClick={() => setExpanded(expanded === id ? null : id)}
                >
                  <img
                    src={categoryArtwork(id)}
                    alt=""
                    width="44"
                    height="44"
                  />
                  <strong>
                    {CATEGORY_SPEC_GROUPS[id]?.label || "Đồ dùng khác"}
                  </strong>
                  <MorphIcon
                    icon={expanded === id ? ChevronUp : ChevronDown}
                    size={21}
                  />
                </button>
                <div id={"market-group-" + id} hidden={expanded !== id}>
                  {cats.map((cat) => (
                    <Link
                      key={cat.id}
                      href={hrefFor(cat)}
                      onClick={() => setOpen(false)}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </dialog>
    </>
  );
}
