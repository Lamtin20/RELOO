"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  INITIAL_SCROLL,
  nextCommerceScroll,
} from "@/lib/mobile/commerce-scroll";
export function CommerceScroll() {
  const path = usePathname();
  useEffect(() => {
    let state = {
        ...INITIAL_SCROLL,
        y: window.scrollY,
        anchor: window.scrollY,
      },
      frame = 0;
    function sync() {
      frame = 0;
      const previous = state;
      state = nextCommerceScroll(state, Math.max(0, window.scrollY), path);
      document.body.dataset.commerceCompact = String(state.compact);
      document.body.dataset.commerceNavHidden = String(state.hidden);
      document.body.dataset.accountCompact = String(state.account);
      const nav = document.querySelector(".bottom-nav");
      if (nav) nav.inert = state.hidden;
      if (
        previous.compact !== state.compact ||
        previous.account !== state.account
      )
        window.dispatchEvent(
          new CustomEvent("reloo-commerce-scroll", { detail: state }),
        );
    }
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", scroll);
      if (frame) cancelAnimationFrame(frame);
      delete document.body.dataset.commerceCompact;
      delete document.body.dataset.commerceNavHidden;
      delete document.body.dataset.accountCompact;
      const nav = document.querySelector(".bottom-nav");
      if (nav) nav.inert = false;
    };
  }, [path]);
  return null;
}
