"use client";
import { useEffect } from "react";
export function BrandSync() {
  useEffect(() => {
    const update = async (event) => {
      try {
        const r = await fetch("/api/brand").then((r) => r.json());
        if (!r.ok) return;
        if (event?.type === "reloo-brand-updated") document.title = r.siteTitle;
        for (const [rel, kind] of [
          ["icon", "favicon"],
          ["apple-touch-icon", "apple"],
        ]) {
          for (const node of document.querySelectorAll(`link[rel="${rel}"]`))
            node.href = `/api/brand/icon?kind=${kind}&v=${r.version}`;
        }
      } catch {}
    };
    update();
    window.addEventListener("reloo-brand-updated", update);
    return () => window.removeEventListener("reloo-brand-updated", update);
  }, []);
  return null;
}
