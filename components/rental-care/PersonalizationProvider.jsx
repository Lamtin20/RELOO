"use client";
import {readGuestInterests} from '@/lib/personalization/declared';
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useRef,
} from "react";
import { useAuth } from "@/lib/store";
import { safeSearchTerm } from "@/lib/personalization/domain";
const Context = createContext({
  actor: null,
  enabled: false,
  epoch: 1,
  refresh: () => {},
  record: () => {},
});
export const usePersonalization = () => useContext(Context);
export async function careFetch(path, body, signal) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: signal || AbortSignal.timeout(20000),
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw Error("service");
  }
  if (!response.ok) throw Error(data.code || "service");
  return data;
}
export function PersonalizationProvider({ children }) {
  const [guestCategories,setGuestCategories]=useState([]);
  const { user, hydrated } = useAuth(),
    [state, setState] = useState({ actor: null, enabled: false, epoch: 1 }),
    [version, bump] = useState(0);
  const actor = state.testMode
    ? state.actor
    : user?.id === state.actor
      ? state.actor
      : null;
  const refresh = useCallback(() => bump((n) => n + 1), []);
  useEffect(()=>{const load=()=>{setGuestCategories(user?.id?[]:readGuestInterests(localStorage));};load();window.addEventListener('reloo-declared-interests-changed',load);return()=>window.removeEventListener('reloo-declared-interests-changed',load);},[user?.id]);
  const categoryKey = JSON.stringify(state.categories || []);
  useEffect(() => {
    if (!hydrated) return;
    // Anonymous production visitors have no account-scoped preferences to poll.
    // Keep the existing signed local fixture flow usable without exposing a production test bypass.
    if(!user?.id&&!['127.0.0.1','localhost','[::1]'].includes(location.hostname))return;
    let live = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await careFetch(
          "/api/personalization",
          null,
          controller.signal,
        );
        if (live) setState(data);
      } catch {
        if (live) setState(current=>current?.actor===user?.id?{...current,unavailable:true}:{actor:null,enabled:false,epoch:1});
      }
    };
    load();
    const timer = setInterval(load, 15000),
      focus = () => load();
    window.addEventListener("focus", focus);
    window.addEventListener("reloo-personalization-changed", focus);
    return () => {
      live = false;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener("reloo-personalization-changed", focus);
    };
  }, [user?.id, hydrated, version]);
  useEffect(() => {
    window.__relooInterestScope = {
      actor,
      enabled: !!actor && state.enabled,
      epoch: state.epoch,
      categories: JSON.parse(categoryKey),
    };
    // Legacy shared history is never merged into an account or recommendation profile.
    try {
      for (const key of [
        "reloo-recent-searches",
        "reloo-saved-searches",
        "reloo-last-category",
        "reloo-interest-survey",
        "reloo_marketing_interests",
      ])
        localStorage.removeItem(key);
    } catch {
      /* Optional storage can be unavailable. */
    }
    window.dispatchEvent(new Event("reloo-interest-scope-changed"));
    return () => {
      window.__relooInterestScope = null;
      try {
        if (actor)
          for (const key of Object.keys(localStorage))
            if (
              [
                "reloo-recent-searches",
                "reloo-saved-searches",
                "reloo-last-category",
                "reloo-interest-survey",
              ].some((prefix) =>
                key.startsWith(prefix + ":" + encodeURIComponent(actor) + ":"),
              )
            )
              localStorage.removeItem(key);
      } catch {
        /* No optional storage is required. */
      }
    };
  }, [actor, state.enabled, state.epoch, categoryKey]);
  const recent = useRef(new Map());
  const record = useCallback(
    (kind, data = {}) => {
      if (!actor || !state.enabled) return;
      if (kind === "SEARCH") {
        const query = safeSearchTerm(data.query);
        if (!query) return;
        data = { ...data, query };
      }
      const key =
        actor +
        ":" +
        state.epoch +
        ":" +
        kind +
        ":" +
        (data.asset || data.category || data.query);
      if (Date.now() - (recent.current.get(key) || 0) < 60000) return;
      recent.current.set(key, Date.now());
      if (recent.current.size > 200) recent.current.clear();
      careFetch("/api/personalization", {
        subject: actor,
        action: "event",
        event: {
          id: crypto.randomUUID(),
          version: 1,
          epoch: state.epoch,
          kind,
          at: new Date().toISOString(),
          ...data,
        },
      })
        .then((r) => {
          if (["NO_CONSENT", "RECORDED"].includes(r.result)) refresh();
        })
        .catch(() => {});
    },
    [actor, state.enabled, state.epoch, refresh],
  );
  return (
    <Context.Provider
      value={{
        ...state,
        guestCategories:actor?[]:guestCategories,
        actor,
        enabled: !!actor && state.enabled,
        signedIn: !!user || !!state.testMode,
        record,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
