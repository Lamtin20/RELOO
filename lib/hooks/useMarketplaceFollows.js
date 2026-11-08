"use client";
import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/lib/store";
import { usePersonalization } from "@/components/rental-care/PersonalizationProvider";
const loads = new Map(),
  pending = new Set();
const parse = (raw) => {
  try {
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};
export function useMarketplaceFollows(kind, baseKey, event) {
  const { record } = usePersonalization();
  const { user } = useAuth(),
    userId = user?.id,
    key = userId ? baseKey + ":" + userId : baseKey;
  const subscribe = useCallback(
    (fn) => {
      window.addEventListener("storage", fn);
      window.addEventListener(event, fn);
      return () => {
        window.removeEventListener("storage", fn);
        window.removeEventListener(event, fn);
      };
    },
    [event],
  );
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) || "[]";
    } catch {
      return "[]";
    }
  }, [key]);
  const raw = useSyncExternalStore(subscribe, snapshot, () => "[]"),
    savedIds = useMemo(() => parse(raw), [raw]);
  useEffect(() => {
    if (!userId) return;
    const requestKey = userId + ":" + kind;
    if (!loads.has(requestKey))
      loads.set(
        requestKey,
        fetch("/api/follows?kind=" + kind).then(async (r) => {
          const d = await r.json();
          if (!r.ok) throw Error(d.error);
          return d.ids;
        }),
      );
    let active = true;
    loads
      .get(requestKey)
      .then((ids) => {
        if (active && !pending.size) {
          localStorage.setItem(key, JSON.stringify(ids));
          window.dispatchEvent(new Event(event));
        }
      })
      .catch(() => loads.delete(requestKey));
    return () => {
      active = false;
    };
  }, [userId, key, kind, event]);
  const toggleSaved = useCallback(
    (id) => {
      const operation = key + ":" + id;
      if (pending.has(operation)) return false;
      const before = parse(snapshot()),
        enabled = !before.includes(id),
        next = enabled ? [...before, id] : before.filter((v) => v !== id);
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event(event));
      } catch {
        return false;
      }
      if (userId) {
        pending.add(operation);
        fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind, targetId: id, enabled }),
        })
          .then(async (r) => {
            const d = await r.json();
            if (!r.ok) throw Error(d.error);
            loads.set(userId + ":" + kind, Promise.resolve(parse(snapshot())));
            if (enabled && kind === "LISTING") record("SAVE", { asset: id });
          })
          .catch(() => {
            localStorage.setItem(key, JSON.stringify(before));
            window.dispatchEvent(new Event(event));
            window.dispatchEvent(new CustomEvent("reloo-follow-error"));
            loads.delete(userId + ":" + kind);
          })
          .finally(() => pending.delete(operation));
      }
      return true;
    },
    [key, snapshot, kind, event, userId, record],
  );
  return { savedIds, toggleSaved };
}
