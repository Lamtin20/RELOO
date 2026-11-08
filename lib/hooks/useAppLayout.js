"use client";
import { useSyncExternalStore } from "react";
import { isNative } from "@/lib/mobile/client";
const subscribe = (callback) => {
  const media = window.matchMedia("(max-width: 900px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
export function useAppLayout() {
  return useSyncExternalStore(
    subscribe,
    () => isNative() || window.matchMedia("(max-width: 900px)").matches,
    () => false,
  );
}
