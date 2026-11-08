"use client";

import { useEffect, useRef, useId } from "react";
import { X } from "lucide-react";
import {useLocale} from '@/components/settings/LocaleProvider';
let activeModals=0,previousOverflow='';

export function Modal({
  open = false,
  onClose,
  title,
  children,
  footer,
  size = "md",
  className = "",
}) {
  const overlayRef = useRef(null);
  const titleId=useId(),{locale}=useLocale();
  const closeRef=useRef(onClose);
  useEffect(()=>{closeRef.current=onClose},[onClose]);

  useEffect(() => {
    if (!open) return;
    const previousFocus=document.activeElement,overlay=overlayRef.current;
    if(activeModals++===0){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';document.body.classList.add('modal-open')}
    const topmost=()=>!document.querySelector('dialog[open]')&&Array.from(document.querySelectorAll('[data-reloo-modal]')).at(-1)===overlay;
    const focusable=()=>Array.from(overlay?.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length&&el.getAttribute('aria-hidden')!=='true');
    const initial=overlay?.querySelector('[autofocus]')||focusable()[0]||overlay;initial?.focus({preventScroll:true});
    const handleKey = (e) => {
      if(!topmost())return;
      if (e.key === "Escape"){e.preventDefault();e.stopPropagation();closeRef.current?.()}
      if(e.key==='Tab'){const items=focusable(),first=items[0],last=items.at(-1);if(!items.length){e.preventDefault();overlay?.focus()}else if(e.shiftKey&&(document.activeElement===first||document.activeElement===overlay)){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}
    };
    const handleFocus=e=>{if(topmost()&&!overlay?.contains(e.target))(focusable()[0]||overlay)?.focus({preventScroll:true})};
    document.addEventListener("keydown", handleKey);
    document.addEventListener('focusin',handleFocus);

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.removeEventListener('focusin',handleFocus);
      if(--activeModals===0){document.body.style.overflow=previousOverflow;document.body.classList.remove('modal-open')}
      if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    };
  }, [open]);

  if (!open) return null;

  const maxWidth = size === "lg" ? 640 : size === "sm" ? 360 : 480;

  return (
    <div
      ref={overlayRef}
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title?(locale==='en-US'?'Dialog':'Hộp thoại'):undefined}
      tabIndex={-1}
      data-reloo-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose?.();
      }}
    >
      <div
        className={`modal ${className}`.trim()}
        style={{ maxWidth }}
      >
        {(title || onClose) && (
          <div className="modal-header">
            {title && (
              <h2 id={titleId} className="modal-title">
                {title}
              </h2>
            )}
            {onClose && (
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={onClose}
                aria-label={locale==='en-US'?'Close':'Đóng'}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
