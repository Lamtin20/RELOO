"use client";
import {notifyIdentityError} from '@/lib/identity-access';
import {useLocale} from '@/components/settings/LocaleProvider';

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import {NeighborhoodImage} from './NeighborhoodImage';
export {NeighborhoodImage} from './NeighborhoodImage';
import {
  Building2,
  MapPin,
  Search,
  Plus,
  SlidersHorizontal,
  ShieldCheck,
  Clock3,
  Package,
  Leaf,
  Bell,
  Check,
  X,
  Navigation,
  CalendarDays,
  ChevronDown,
  LoaderCircle,
  Home,
  FileCheck2,
} from "lucide-react";
import {
  text,
  EVENTS,
  NEIGHBORHOOD_CATEGORIES,
} from "@/lib/neighborhood/content";
import {
  isoLocal,
  money,
  dateTime,
  locationSuggestions,
} from "@/lib/neighborhood/domain";
import "./neighborhood.css";
import "./rental-experience.css";
import {currentLocation} from "@/lib/mobile/location";
import {useRentalMeasurement,RentalImpressions} from "./RentalMeasurement";
import {useAccountCounts} from '@/components/dashboard/AccountCounts';
import {OrderScopeTabs} from '@/components/dashboard/OrderWorkspace';
import {ORDER_BUCKETS,neighborhoodBucket} from '@/lib/dashboard/workspace';
import {QuickRentalQuote} from "./QuickRentalQuote";
import {RelooLoading,RentalSkeleton} from "@/components/ui/RelooLoading";
import {experienceText,neighborhoodDestination,boundedCameraLocation} from "@/lib/neighborhood/experience";
import { RecommendationControls } from "@/components/rental-care/RecommendationControls";
export async function neighborhoodApi(
  section,
  filter = {},
  body = null,
  admin = false,
  locale = "vi-VN",
) {
  const query = new URLSearchParams({
    section,
    lang: locale,
    ...Object.fromEntries(
      Object.entries(filter).filter(
        ([, v]) => v !== null && v !== undefined && v !== "",
      ),
    ),
  });
  const response = await fetch(
    (admin ? "/api/crm/neighborhood" : "/api/neighborhood") + "?" + query,
    {
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  ).catch(() => {
    throw Object.assign(Error("network"), { code: "network" });
  });
  const data = await response.json().catch(() => {
    throw Object.assign(Error("SERVICE_UNAVAILABLE"), {
      code: "SERVICE_UNAVAILABLE",
      status: response.status,
    });
  });
  if (!response.ok || !data.ok){
    notifyIdentityError(data.code);
    throw Object.assign(Error(data.code || "SERVICE_UNAVAILABLE"), {
      status: response.status,
      code: data.code,
    });
  }
  return data;
}
export function Field({ label, children, hint }) {
  return (
    <label className="nk-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
// Media is already WebP; protected evidence must be fetched with browser cookies,
// rather than through an image optimizer which would strip authorization.
export function NeighborhoodModal({
  title,
  children,
  onClose,
  busy = false,
  closeLabel = text("vi-VN", "close"),
}) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog?.showModal();
    const viewport=window.visualViewport;
    const fit=()=>{if(dialog&&viewport){dialog.style.maxHeight=Math.max(180,viewport.height-24)+'px';if(dialog.contains(document.activeElement))requestAnimationFrame(()=>document.activeElement?.scrollIntoView?.({block:'nearest'}));}};
    fit();viewport?.addEventListener('resize',fit);
    return () => {viewport?.removeEventListener('resize',fit);dialog?.close();document.body.style.overflow=previousOverflow;};
  }, []);
  return (
    <dialog
      ref={ref}
      className="nk-modal"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="nk-dialog-title"
    >
      <div className="nk-modal-head">
        <h2 id="nk-dialog-title">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label={closeLabel}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export async function readPhotos(files) {
  if (Array.from(files || []).length > 4) throw Error("INVALID_INPUT");
  return Promise.all(
    Array.from(files || [])
      .slice(0, 4)
      .map(
        (file) =>
          new Promise((resolve, reject) => {
            if (
              file.size > 2500000 ||
              !["image/jpeg", "image/png", "image/webp"].includes(file.type)
            ) {
              reject(Error("INVALID_INPUT"));
              return;
            }
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(Error("INVALID_INPUT"));
            r.readAsDataURL(file);
          }),
      ),
  );
}
const initialDates = () => ({start:"",end:""});
function AreaArt() {
  return (
    <div className="nk-area-art" aria-hidden="true">
      <div className="nk-art-sun" />
      <div className="nk-art-hill" />
      <div className="nk-art-building nk-art-building--one">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="nk-art-building nk-art-building--two">
        {Array.from({ length: 18 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="nk-art-building nk-art-building--three">
        {Array.from({ length: 9 }, (_, i) => (
          <i key={i} />
        ))}
      </div>
      <div className="nk-art-tree">
        <Leaf size={46} />
      </div>
      <div className="nk-art-caption">
        <Package size={22} />
        <i />
        <Home size={22} />
      </div>
    </div>
  );
}
const EMPTY_FILTER = Object.freeze({});
const FILTER_DEFAULTS = {
  area: "",
  subzone: "",
  building: "",
  scope: "AREA",
  q: "",
  category: "",
  price: "",
  deposit: "",
};
export function Neighborhood({
  initialTab = "browse",
  initialFilter = EMPTY_FILTER,
  workspace = false,
  embedded = false,
}) {
  const {locale}=useLocale();
  const [tab, setTab] = useState(initialTab),
    [catalog, setCatalog] = useState(null),
    [mine, setMine] = useState(null),
    [items, setItems] = useState([]),
    [needs, setNeeds] = useState([]),
    [promotions, setPromotions] = useState([]),
    [filter, setFilter] = useState(() => ({
      area: "",
      subzone: "",
      building: "",
      scope: "AREA",
      q: "",
      category: "",
      price: "",
      deposit: "",
      ...initialDates(),
      ...initialFilter,
    })),
    [appliedFilter, setAppliedFilter] = useState(null),
    [now, setNow] = useState(() => Date.now()),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState(null),
    [detail, setDetail] = useState(null),
    [secret, setSecret] = useState(""),
    [qr, setQr] = useState(""),
    [suggestions, setSuggestions] = useState(null),[locationPrompt,setLocationPrompt]=useState(false),[orderTab,setOrderTab]=useState('pending');
  const t = useCallback((k) => text(locale, k), [locale]);
  const pendingKey = useRef(null);
  const accountCounts=useAccountCounts();
  const mutationLock=useRef(false);
  const productRoot=useRef(null),recordRental=useRentalMeasurement();
  const resumedAsset=useRef(null);
  const eText=k=>experienceText(locale,k);
  const requestSequence = useRef(0);
  const alertRef = useRef(null);
  const area = catalog?.places?.find((p) => p.id === filter.area),
    places = catalog?.places || [];
  const updateFilter = (key, value) => {
    const next = {
      ...filter,
      [key]: value,
      ...(key === "area"
        ? { building: "", subzone: "" }
        : key === "subzone"
          ? { building: "" }
          : {}),
    };
    setFilter(next);
    if (key === "area") setAppliedFilter(next);
  };
  const get = useCallback(
    (section, f = {}) => neighborhoodApi(section, f, null, false, locale),
    [locale],
  );
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const c = await get("catalog");
      let memberships = [],home=null;
      try {
        const m = await get("mine");
        setMine(m.actor ? m : null);
        memberships = m.memberships || [];
        if(m.actor){try{const response=await fetch("/api/neighborhood/home?lang="+locale,{cache:"no-store",signal:AbortSignal.timeout(10000)});if(response.ok)home=(await response.json()).home;}catch{}}
      } catch (e) {
        if (e.status === 401) setMine(null);
        else throw e;
      }
      setCatalog(c);
      const preferred =
        initialFilter.area ||
        (home?.choice==="YES"?home.area_id:home?.choice?null:memberships.find(m=>!["REVOKED","REJECTED"].includes(m.status))?.area_id);
      if (preferred) {
        setFilter((current) =>
          current.area ? current : { ...current, area: preferred },
        );
        setAppliedFilter(
          (current) =>
            current || {
              ...FILTER_DEFAULTS,
              ...initialDates(),
              ...initialFilter,
              area: preferred,
            },
        );
      }
    } catch (e) {
      setError(e.code || e.message || "network");
    } finally {
      setLoading(false);
    }
  }, [get, initialFilter,locale]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const fetchResults = useCallback(
    async (current) => {
      if (!current?.area) return;
      const sequence = ++requestSequence.current;
      setLoading(true);
      setError("");
      try {
        const f = {
          ...current,
          start: current.start?isoLocal(current.start):"",
          end: current.end?isoLocal(current.end):"",
        };
        const [results, n, p] = await Promise.all([
          get("search", f),
          tab==='needs'?get("needs", { area: current.area }):Promise.resolve({needs:[]}),
          get("promotions", { area: current.area }).catch(()=>({promotions:[]})),
        ]);
        if (sequence !== requestSequence.current) return;
        setItems(results.items || []);
        setNeeds(n.needs || []);
        setPromotions(p.promotions || []);
      } catch (e) {
        if (sequence === requestSequence.current)
          setError(e.code || e.message || "network");
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    },
    [get,tab],
  );
  useEffect(() => {
    const timer = setTimeout(() => fetchResults(appliedFilter), 0);
    return () => clearTimeout(timer);
  }, [appliedFilter, fetchResults]);
  useEffect(()=>{if(workspace||!appliedFilter)return;const p=new URLSearchParams({lang:locale,...appliedFilter});const resume=new URLSearchParams(location.search).get("resume");if(resume)p.set("resume",resume);history.replaceState(null,"","/noi-khu?"+p);document.dispatchEvent(new Event("reloo-browse-filter-changed"));},[appliedFilter,locale,workspace]);
  const actor = mine?.actor;
  useEffect(()=>{if(!workspace||!actor||new URLSearchParams(location.search).get("create")!=="1")return;const type=initialTab==="owner"?"listing":initialTab==="needs"?"need":null;if(type){const timer=setTimeout(()=>setModal({type}),0);return()=>clearTimeout(timer);}},[workspace,actor,initialTab]);
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (!p.get("order") || !actor) return;
    get("order", { id: p.get("order") })
      .then(setDetail)
      .catch((e) => setError(e.code || e.message));
  }, [actor, get]);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("need");
    if (!id || !actor) return;
    get("need", { id })
      .then((r) => {
        if (r.need) {
          setTab("needs");
          setNeeds((list) => [
            r.need,
            ...list.filter((n) => n.id !== r.need.id),
          ]);
        } else setNotice(t("oldNeed"));
      })
      .catch(() => setNotice(t("oldNeed")));
  }, [actor, get, t]);
  useEffect(() => {
    const handler = () => {
      const p = new URLSearchParams(location.search);
      setTab(p.get("tab") || "browse");
      if (p.has("area")) {
        const restored = { ...FILTER_DEFAULTS, ...initialDates() };
        for (const key of Object.keys(restored)) {
          if (p.has(key) && p.get(key).length < 200) restored[key] = p.get(key);
        }
        setFilter(restored);
        setAppliedFilter(restored);
      }
      setSecret("");
      setQr("");
      if (p.get("order") && actor) {
        get("order", { id: p.get("order") })
          .then((r) => {
            setDetail(r);
            setTab("orders");
          })
          .catch((e) => setError(e.code || "network"));
      } else setDetail(null);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [actor, get]);
  const orderId = detail?.order?.id;
  useEffect(() => {
    if (!orderId) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible")
        get("order", { id: orderId })
          .then(setDetail)
          .catch(() => {});
    }, 15000);
    return () => clearInterval(timer);
  }, [orderId, get]);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  function navigate(next) {
    if(next!=="browse"){window.location.assign(neighborhoodDestination(next,{lang:locale,...filter}));return;}
    setTab(next);
    setDetail(null);
    setSecret("");
    setQr("");
    setError("");
    const p = new URLSearchParams({
      tab: next,
      lang: locale,
      ...filter,
    });
    history.pushState(null, "", "/noi-khu?" + p);
  }
  async function showOrder(id) {
    if(!workspace){window.location.assign(neighborhoodDestination("orders",{order:id,lang:locale}));return;}
    setSecret("");
    setQr("");
    try {
      setDetail(await get("order", { id }));
      setTab("orders");
      history.pushState(null, "", neighborhoodDestination("orders",{order:id,lang:locale}));
    } catch (e) {
      setError(e.code || e.message);
    }
  }
  async function mutate(action, data, { close = true, refresh = true } = {}) {
    if (mutationLock.current) return null;
    mutationLock.current=true;
    setBusy(true);
    setError("");
    setNotice("");
    const fingerprint = JSON.stringify({ action, data });
    if (pendingKey.current?.fingerprint !== fingerprint)
      pendingKey.current = { fingerprint, key: crypto.randomUUID() };
    try {
      const r = await neighborhoodApi(
        "",
        {},
        { key: pendingKey.current.key, action, data },
        false,
        locale,
      );
      pendingKey.current = null;window.dispatchEvent(new Event("reloo-account-changed"));
      setNotice(t(action === "LISTING" ? "listingPending" : "saved"));
      if (r.secret) setSecret(r.secret);
      if (r.qr) setQr(r.qr);
      if (close) setModal(null);
      if (refresh) {
        await load();
        await fetchResults(filter);
      }
      if (detail?.order?.id)
        try {
          setDetail(await get("order", { id: detail.order.id }));
        } catch {}
      return r;
    } catch (e) {
      setError(e.code || e.message || "network");
      return null;
    } finally {
      mutationLock.current=false;
      setBusy(false);
    }
  }
  const requireUser = (fn) => {
    if (!mine) {
      setError("AUTH_REQUIRED");
      return;
    }
    fn();
  };
  async function openItem(item, offer = null) {
    recordRental("INQUIRY_START",{asset:item.asset_id,category:item.category});
    if(!workspace){const q=new URLSearchParams({lang:locale,...filter,resume:item.asset_id});history.replaceState(null,"","/noi-khu?"+q);}
    if(!mine){const q=new URLSearchParams({lang:locale,...filter,resume:item.asset_id});history.replaceState(null,"","/noi-khu?"+q);setError("AUTH_REQUIRED");return;}
    if(!offer&&(!filter.start||!filter.end)){setModal({type:"dates",item});return;}
    requireUser(async () => {
      setBusy(true);try {
        const start = offer?.start || isoLocal(filter.start),
          end = offer?.end || isoLocal(filter.end);
        const r = await get("quote", {
          area: item.area_id || filter.area,
          asset: item.asset_id,
          start,
          end,
        });
        recordRental("PRODUCT_VIEW",{asset:item.asset_id,placement:"neighborhood"});
        setModal({
          type: "quote",
          item,
          quote: r.quote,
          start,
          end,
          offer: offer?.id,
        });
      } catch (e) {
        setError(e.code || e.message);
      }finally{setBusy(false);}
    });
  }
  const openResume=useEffectEvent(item=>openItem(item));
  useEffect(()=>{if(workspace||!actor||!items.length)return;const id=new URLSearchParams(location.search).get("resume");const item=items.find(i=>i.asset_id===id);if(!item||resumedAsset.current===id)return;const timer=setTimeout(()=>{if(resumedAsset.current===id)return;resumedAsset.current=id;openResume(item);},0);return()=>clearTimeout(timer);},[actor,items,workspace]);
  async function locate() {
    setError("");
    
    setNotice(t("locationUncertain"));
    try{const coords=await currentLocation();if(!boundedCameraLocation(coords)){setNotice(eText("imprecise"));setSuggestions([]);return;}const found=locationSuggestions(places.filter(p=>p.kind==="AREA"),{lat:coords.latitude,lng:coords.longitude,accuracy:coords.accuracy});setSuggestions(found);if(!found.length)setNotice(t("noLocation"));}catch{setError("gpsDenied");}
  }

  async function switchTestActor(actor) {
    await fetch("/api/neighborhood/test-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actor }),
    });
    setDetail(null);
    setSecret("");
    setQr("");
    await load();
    await fetchResults(filter);
  }
  const subzones = places.filter(
      (p) => p.kind === "SUBZONE" && p.parent_id === filter.area,
    ),
    buildings = places.filter(
      (p) =>
        p.kind === "BUILDING" &&
        (p.parent_id === (filter.subzone || filter.area) ||
          (!filter.subzone && subzones.some((s) => s.id === p.parent_id))),
    );
  const locationFields = (state, set, points = false) => (
    <>
      <Field label={t("area")}>
        <select
          required
          value={state.area || ""}
          onChange={(e) =>
            set({ ...state, area: e.target.value, subzone: "", building: "" })
          }
        >
          <option value="">{t("choose")}</option>
          {places
            .filter((p) => p.kind === "AREA")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label={t("subzone")}>
        <select
          value={state.subzone || ""}
          onChange={(e) =>
            set({ ...state, subzone: e.target.value, building: "" })
          }
        >
          <option value="">{t("any")}</option>
          {places
            .filter((p) => p.kind === "SUBZONE" && p.parent_id === state.area)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      <Field label={t("building")}>
        <select
          value={state.building || ""}
          onChange={(e) => set({ ...state, building: e.target.value })}
        >
          <option value="">{t("any")}</option>
          {places
            .filter(
              (p) =>
                p.kind === "BUILDING" &&
                (p.parent_id === state.subzone ||
                  (!state.subzone &&
                    (p.parent_id === state.area ||
                      places.some(
                        (z) =>
                          z.kind === "SUBZONE" &&
                          z.parent_id === state.area &&
                          z.id === p.parent_id,
                      )))),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      {points && (
        <Field label={t("point")}>
          <select
            required
            value={state.point || ""}
            onChange={(e) => set({ ...state, point: e.target.value })}
          >
            <option value="">{t("point")}</option>
            {mine?.points
              ?.filter((p) => p.area_id === state.area)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
      )}
    </>
  );
  return (
    <div ref={productRoot} className={"nk-page nk-experience"+(workspace?" nk-workspace":"")+(embedded?" nk-embedded":"")} lang={locale}>
      {!workspace&&<RentalImpressions root={productRoot} items={items} record={recordRental}/>}
      {catalog?.testMode && (
        <div className="nk-test">
          <strong>{t("testMode")}</strong>
          <select
            aria-label={t("owner")}
            value={mine?.actor || ""}
            onChange={(e) => switchTestActor(e.target.value)}
          >
            <option value="">{t("choose")}</option>
            {["renter", "owner", "admin", "renter2", "visitor"].map((a) => (
              <option key={a} value={"nk-test-" + a}>
                {t(
                  {
                    renter: "testRenter",
                    owner: "testOwner",
                    admin: "testAdmin",
                    renter2: "testRenter2",
                    visitor: "testVisitor",
                  }[a],
                )}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="nk-topline">
        <Link href="/">RELOO</Link>
        <span>/</span>
        <span>{t("brand")}</span>
        
      </div>
      <header className="nk-find-header"><div><span className="nk-eyebrow">{t("brand")}</span><h1>{workspace?t({orders:"myOrders",owner:"owner",residency:"residency",needs:"needs",notifications:"notifications"}[tab]||"brand"):eText("findTitle")}</h1><p>{t("tagline")}</p></div>{workspace&&<Link href="/noi-khu">{eText("back")}</Link>}</header>
      <section className="nk-context">
        <div>
          <MapPin size={20} />
          <div>
            <small>{t("viewing")}</small>
            <select
              aria-label={t("viewing")}
              value={filter.area}
              onChange={(e) => updateFilter("area", e.target.value)}
            >
              <option value="">{t("choose")}</option>
              {places
                .filter((p) => p.kind === "AREA")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div>
          <Home size={19} />
          <div>
            <small>{t("residency")}</small>
            <button onClick={() => navigate("residency")}>
              {places.find((p) => p.id === mine?.memberships?.[0]?.area_id)
                ?.name || t("noResidence")}
            </button>
          </div>
        </div>
        <button className="nk-text" onClick={()=>setLocationPrompt(true)}>
          <Navigation size={16} />
          {t("gps")}
        </button>
      </section>
      {locationPrompt&&<div className="nk-notice"><p>{eText("locationConsent")}</p><button type="button" onClick={()=>{setLocationPrompt(false);locate();}}>{eText("allowLocation")}</button><button type="button" onClick={()=>setLocationPrompt(false)}>{t("close")}</button></div>}
      {suggestions?.length > 0 && (
        <div className="nk-notice">
          {t("locationUncertain")}
          {suggestions.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                updateFilter("area", s.id);
                setSuggestions(null);
              }}
            >
              {s.name}
              {s.estimated ? " · " + t("estimated") : ""}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div ref={alertRef} tabIndex={-1} className="nk-error" role="alert">
          {t(error)}
          {error === "AUTH_REQUIRED" ? (
            <Link
              href={"/auth?next=" + encodeURIComponent(typeof window!=="undefined"?window.location.pathname+window.location.search:"/noi-khu")}
            >
              {t("login")}
            </Link>
          ) : (
            <button
              onClick={() => {
                setError("");
                load();
                fetchResults(filter);
              }}
            >
              {t("retry")}
            </button>
          )}
        </div>
      )}
      {["IDENTITY_REQUIRED","IDENTITY_EXPIRED","PROFILE_INCOMPLETE","RESIDENCY_REQUIRED"].includes(error)&&<div className="nk-notice"><Link href={(error==="RESIDENCY_REQUIRED"?"/dashboard/profile/residency":error==="PROFILE_INCOMPLETE"?"/dashboard/profile":"/dashboard/kyc")+"?next="+encodeURIComponent(typeof window!=="undefined"?window.location.pathname+window.location.search:"/noi-khu")}>{eText("continueSetup")}</Link></div>}
      {notice && (
        <div className="nk-notice" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {!workspace && !catalog?.places?.some((p) => p.kind === "AREA") && !loading && (
        <section className="nk-empty">
          <Building2 size={36} />
          <h2>{t("noArea")}</h2>
          <p>{t("noAreaBody")}</p>
          <button
            className="nk-primary"
            onClick={() => requireUser(() => setModal({ type: "suggest" }))}
          >
            {t("suggestArea")}
          </button>
          <Link href="/explore">{t("market")}</Link>
        </section>
      )}
      {tab === "browse" && (
        <>
          <div className="nk-category-chips" aria-label={eText("categories")}>{[["","all"],...NEIGHBORHOOD_CATEGORIES].map(([id,key])=><button type="button" key={id} aria-pressed={filter.category===id} onClick={()=>{const next={...filter,category:id};setFilter(next);setAppliedFilter(next);}}>{t(key)}</button>)}</div>
          <form
            className="nk-search"
            onSubmit={(e) => {
              e.preventDefault();
              setAppliedFilter({ ...filter });
              history.replaceState(
                null,
                "",
                "/noi-khu?" +
                  new URLSearchParams({
                    tab: "browse",
                    lang: locale,
                    ...filter,
                  }),
              );
            }}
          >
            <Field label={t("search")}>
              <div className="nk-search-input">
                <Search size={19} />
                <input
                  value={filter.q}
                  onChange={(e) => updateFilter("q", e.target.value)}
                  placeholder={t("search")}
                  maxLength={100}
                />
              </div>
            </Field>
            <Field label={t("start")}>
              <input
                type="datetime-local"
                value={filter.start}
                onChange={(e) => updateFilter("start", e.target.value)}
              />
            </Field>
            <Field label={t("end")}>
              <input
                type="datetime-local"
                value={filter.end}
                onChange={(e) => updateFilter("end", e.target.value)}
              />
            </Field>
            <button
              className="nk-primary"
              disabled={busy || loading || !filter.area}
            >
              <Search size={18} />
              {t("searchAction")}
            </button>
            <details className="nk-filters">
              <summary>
                <SlidersHorizontal size={16} />
                {t("scope")}
                <ChevronDown size={15} />
              </summary>
              <div className="nk-form-grid">
                <Field label={t("category")}>
                  <select
                    value={filter.category}
                    onChange={(e) => updateFilter("category", e.target.value)}
                  >
                    <option value="">{t("all")}</option>
                    {NEIGHBORHOOD_CATEGORIES.map(([id, key]) => (
                      <option key={id} value={id}>
                        {t(key)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("subzone")}>
                  <select
                    value={filter.subzone}
                    onChange={(e) => updateFilter("subzone", e.target.value)}
                  >
                    <option value="">{t("all")}</option>
                    {subzones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("building")}>
                  <select
                    value={filter.building}
                    onChange={(e) => updateFilter("building", e.target.value)}
                  >
                    <option value="">{t("all")}</option>
                    {buildings.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("scope")}>
                  <select
                    value={filter.scope}
                    onChange={(e) => updateFilter("scope", e.target.value)}
                  >
                    {["AREA", "SUBZONE", "BUILDING"].map((s) => (
                      <option key={s} value={s}>
                        {t(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("maxPrice")}>
                  <input
                    type="number"
                    min="0"
                    value={filter.price}
                    onChange={(e) => updateFilter("price", e.target.value)}
                  />
                </Field>
                <Field label={t("maxDeposit")}>
                  <input
                    type="number"
                    min="0"
                    value={filter.deposit}
                    onChange={(e) => updateFilter("deposit", e.target.value)}
                  />
                </Field>
              </div>
            </details>
          </form>
          <div className="nk-section-heading">
            <div>
              <h2>{t("browse")}</h2>
              <p>
                {t("nearby")} · {t("timezone")}
              </p>
            </div>
            <span>
              {items.length} {t("asset").toLowerCase()}
            </span>
          </div>
          {(filter.q||filter.category||filter.price||filter.deposit||filter.building||filter.subzone)&&<div className="nk-applied"><span>{[filter.q,filter.category?t(NEIGHBORHOOD_CATEGORIES.find(([id])=>id===filter.category)?.[1]):null,filter.price?money(Number(filter.price),locale):null,places.find(p=>p.id===filter.building)?.name].filter(Boolean).join(" · ")}</span><button type="button" onClick={()=>{const next={...filter,q:"",category:"",price:"",deposit:"",building:"",subzone:"",scope:"AREA"};setFilter(next);setAppliedFilter(next);}}>{eText("clearFilters")}</button></div>}
          {loading ? (
            <div aria-busy="true"><RelooLoading locale={locale}/><RentalSkeleton/></div>
          ) : items.length ? (
            <div className="nk-grid">
              {items.map((item) => (
                <article className="nk-card" key={item.asset_id} data-asset={item.asset_id} data-analytics-asset={item.asset_id} data-analytics-placement="neighborhood">
                  <button
                    className="nk-card-image"
                    onClick={() => openItem(item)}
                  >
                    {item.images?.[0] ? (
                      <NeighborhoodImage
                        src={item.images[0]}
                        alt={item.title}
                        loading="lazy"
                      />
                    ) : (
                      <Package size={48} />
                    )}
                    <span>
                      {t(
                        item.rank === 0
                          ? "BUILDING"
                          : item.rank === 1
                            ? "SUBZONE"
                            : "AREA",
                      )}
                    </span>
                  </button>
                  <div className="nk-card-body">
                    <div className="nk-card-price">
                      {money(item.rate, locale)}{" "}
                      <small>
                        / {t(item.unit_minutes === 60 ? "hour" : "day")}
                      </small>
                    </div>
                    <h3>{item.title}</h3>
                    <p>
                      <MapPin size={14} />
                      {places.find((p) => p.id === item.building_id)?.name ||
                        area?.name}
                    </p>
                    <p>
                      <Clock3 size={14} />
                      {t(item.dates_checked ? "available" : "selectDates")}
                    </p>
                    <div className="nk-card-meta">
                      <span>
                        {t("deposit")}: {money(item.deposit, locale)}
                      </span>
                      {item.owner_verified && (
                        <span title={t("verifiedHint")}>
                          <ShieldCheck size={14} />
                          {t("VERIFIED")}
                        </span>
                      )}
                    </div>
                    {Number(item.review_count) > 0 ? (
                      <small>
                        {item.rating} / 5 · {item.review_count}{" "}
                        {t("averageRating")}
                      </small>
                    ) : (
                      <small>{t("noReviews")}</small>
                    )}
                    <button
                      className="nk-primary nk-rent-button" disabled={busy}
                      onClick={() => openItem(item)}
                    >
                      {eText("rent")}
                    </button>
                    <RecommendationControls
                      asset={item.asset_id}
                      owner={item.owner_id}
                      category={item.category}
                      reason={item.recommendationReason}
                      locale={locale}
                      manage
                      onChanged={() => fetchResults(filter)}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <section className="nk-empty">
              <Package size={32} />
              <h3>{t("empty")}</h3>
              <p>{t("emptyBody")}</p>
              <div>
                <button
                  className="nk-primary"
                  onClick={() => requireUser(() => setModal({ type: "need" }))}
                >
                  {t("need")}
                </button>
                <button
                  className="nk-secondary"
                  onClick={() => {
                    setFilter((f) => ({ ...f, scope: "AREA" }));
                    setAppliedFilter({ ...filter, scope: "AREA" });
                  }}
                >
                  {t("expand")}
                </button>
              </div>
            </section>
          )}
        </>
      )}
      {tab === "residency" && (
        <section className="nk-panel">
          <div className="nk-section-heading">
            <div>
              <h2>{t("residency")}</h2>
              <p>{t("membershipHint")}</p>
            </div>
            <ShieldCheck size={26} />
          </div>
          {mine ? (
            <>

              <div className="nk-stack">
                {mine.memberships?.map((m) => (
                  <article key={m.id} className="nk-row">
                    <div>
                      <h3>{places.find((p) => p.id === m.area_id)?.name}</h3>
                      <p>{places.find((p) => p.id === m.building_id)?.name}</p>
                      <span className="nk-badge">{t(m.status)}</span>
                      {m.reason && <p>{t(m.reason)}</p>}
                      {m.verified_until && (
                        <small>
                          {t("expires")}: {dateTime(m.verified_until, locale)}
                        </small>
                      )}
                    </div>
                    {m.status !== "VERIFIED" && (
                      <button
                        className="nk-secondary"
                        disabled={m.status === "PENDING"}
                        onClick={() =>
                          setModal({ type: "verify", membership: m.id })
                        }
                      >
                        {t("verify")}
                      </button>
                    )}
                    <Link href="/help">{t("support")}</Link>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <Link className="nk-primary" href="/auth?next=%2Fnoi-khu">
              {t("login")}
            </Link>
          )}
        </section>
      )}
      {tab === "needs" && (
        <section>
          <div className="nk-section-heading">
            <div>
              <h2>{t("needs")}</h2>
              <p>{t("offerHint")}</p>
            </div>
            <button
              className="nk-primary"
              onClick={() => requireUser(() => setModal({ type: "need" }))}
            >
              <Plus size={17} />
              {t("need")}
            </button>
          </div>
          <div className="nk-needs">
            {[
              ...needs,
              ...(mine?.needs || [])
                .filter((n) => !needs.some((x) => x.id === n.id))
                .map((n) => ({ ...n, mine: true })),
            ].map((n) => (
              <article key={n.id} className="nk-panel">
                <div className="nk-need-heading">
                  <h3>{n.title}</h3>
                  <span className="nk-badge">
                    {t(n.scope)} ?{" "}
                    {t(
                      Date.parse(n.expires_at) < now
                        ? "EXPIRED"
                        : n.status || "OPEN",
                    )}
                  </span>
                </div>
                <p>{n.note}</p>
                <p className="nk-muted">
                  {dateTime(n.starts_at, locale)} —{" "}
                  {dateTime(n.ends_at, locale)}
                </p>
                {n.budget != null && (
                  <p>
                    {t("budget")}: {money(n.budget, locale)}
                  </p>
                )}
                {n.images?.map((src) => (
                  <NeighborhoodImage
                    className="nk-need-image"
                    key={src}
                    src={src}
                    alt={n.title}
                  />
                ))}
                <div className="nk-row-actions">
                  {n.mine ? (
                    <>
                      <button
                        onClick={() => setModal({ type: "need", need: n })}
                      >
                        {t("edit")}
                      </button>
                      <button
                        onClick={() => mutate("CLOSE_NEED", { id: n.id })}
                      >
                        {t("closeNeed")}
                      </button>
                    </>
                  ) : (
                    <button
                      className="nk-secondary"
                      onClick={() =>
                        requireUser(() => setModal({ type: "offer", need: n }))
                      }
                    >
                      {t("offer")}
                    </button>
                  )}
                </div>
                {mine?.offers
                  ?.filter((f) => f.need_id === n.id)
                  .map((f) => (
                    <div className="nk-offer" key={f.id}>
                      <span>
                        {f.title ||
                          mine.listings?.find((l) => l.asset_id === f.asset_id)
                            ?.title ||
                          f.asset_id}
                      </span>
                      <p>{f.note}</p>
                      <small>
                        {money(f.rate, locale)} /{" "}
                        {t(f.unit_minutes === 60 ? "hour" : "day")} ?{" "}
                        {t("deposit")}: {money(f.deposit, locale)}
                      </small>
                      {n.mine && (
                        <button
                          className="nk-secondary"
                          onClick={() =>
                            openItem(
                              {
                                asset_id: f.asset_id,
                                area_id: n.area_id,
                                title: n.title,
                              },
                              { id: f.id, start: n.starts_at, end: n.ends_at },
                            )
                          }
                        >
                          {t("chooseOffer")}
                        </button>
                      )}
                    </div>
                  ))}
              </article>
            ))}
            {!needs.length && !mine?.needs?.length && (
              <div className="nk-empty">
                <FileCheck2 size={32} />
                <p>{t("nothing")}</p>
              </div>
            )}
          </div>
        </section>
      )}
      {tab === "orders" &&
        (detail ? (
          <OrderDetail
            data={detail}
            now={now}
            actor={mine?.actor}
            t={t}
            locale={locale}
            busy={busy}
            mutate={mutate}
            setModal={setModal}
            secret={secret}
            qr={qr}
            clearSecret={() => {
              setSecret("");
              setQr("");
            }}
            onBack={() => {
              if(embedded){window.location.assign("/dashboard/orders");return;}
              setDetail(null);
              setSecret("");
              setQr("");
            }}
          />
        ) : (
          <section className="nk-panel">
            {!embedded&&<><h2>{t("myOrders")}</h2><OrderScopeTabs tabs={ORDER_BUCKETS} active={orderTab} onChange={setOrderTab} counts={Object.fromEntries(ORDER_BUCKETS.map(([id])=>[id,accountCounts.counts["neighborhood."+id]]))} loading={loading||accountCounts.loading}/><p className="text-muted">{(mine?.orders||[]).filter(o=>neighborhoodBucket(o,orderTab)).length} đơn đang hiển thị trong danh sách tải gần nhất (tối đa 100). Số trên tab là tổng trạng thái từ server.</p></>}
            {mine?.orders?.length ? (
              mine.orders.filter(o=>neighborhoodBucket(o,orderTab)).map((o) => (
                <button
                  className="nk-order-row"
                  key={o.id}
                  onClick={() => showOrder(o.id)}
                >
                  <CalendarDays size={23} />
                  <span>
                    <strong>
                      {o.snapshot.assetTitle ||
                        items.find((i) => i.asset_id === o.asset_id)?.title ||
                        mine.listings?.find((i) => i.asset_id === o.asset_id)
                          ?.title ||
                        o.asset_id}
                    </strong>
                    <small>
                      {dateTime(o.starts_at, locale)} —{" "}
                      {dateTime(o.ends_at, locale)}
                    </small>
                  </span>
                  <span className="nk-badge">{t(o.status)}</span>
                  <strong>{money(o.snapshot.total, locale)}</strong>
                </button>
              ))
            ) : (
              <div className="nk-empty">
                <CalendarDays size={32} />
                <p>{t("nothing")}</p>
                {!mine && (
                  <Link href="/auth?next=%2Fnoi-khu">{t("login")}</Link>
                )}
              </div>
            )}
          </section>
        ))}
      {tab === "owner" && (
        <section>
          <div className="nk-section-heading">
            <div>
              <h2>{t("owner")}</h2>
              <p>{t("incomeHint")}</p>
            </div>
            <button
              className="nk-primary"
              onClick={() => requireUser(() => setModal({ type: "listing" }))}
            >
              <Plus size={17} />
              {t("post")}
            </button>
          </div>
          <div className="nk-income">
            <span>{t("income")}</span>
            <strong>{money(mine?.income, locale)}</strong>
            <small>{t("manualPayment")}</small>
          </div>
          <div className="nk-stack">
            {mine?.listings?.map((l) => (
              <article className="nk-panel nk-row" key={l.asset_id}>
                <div>
                  <h3>{l.title}</h3>
                  <span className="nk-badge">{t(l.status)}</span>
                  <p>
                    {money(l.rate, locale)} /{" "}
                    {t(l.unit_minutes === 60 ? "hour" : "day")} · {t("deposit")}
                    : {money(l.deposit, locale)}
                  </p>
                </div>
                <div className="nk-row-actions">
                  <button
                    onClick={() => setModal({ type: "listing", listing: l })}
                  >
                    {t("edit")}
                  </button>
                  <button
                    onClick={() => setModal({ type: "block", listing: l })}
                  >
                    {t("calendar")}
                  </button>
                </div>
              </article>
            )) || null}
            {!mine?.listings?.length && (
              <div className="nk-empty">
                <Package size={36} />
                <p>{t("ownerEmpty")}</p>
              </div>
            )}
          </div>
          <h3>{t("myOrders")}</h3>
          {mine?.orders
            ?.filter((o) => o.is_owner)
            .map((o) => (
              <button
                className="nk-order-row"
                key={o.id}
                onClick={() => showOrder(o.id)}
              >
                <span>
                  {o.asset_id}
                  <small>{dateTime(o.starts_at, locale)}</small>
                </span>
                <span className="nk-badge">{t(o.status)}</span>
              </button>
            ))}
        </section>
      )}
      {tab === "notifications" && (
        <section className="nk-panel">
          <h2>{t("notifications")}</h2>
          {mine && (
            <Preferences
              t={t}
              locale={locale}
              preferences={mine.preferences}
              busy={busy}
              onSave={(data) => mutate("PREFERENCES", data)}
            />
          )}
          <div className="nk-stack">
            {mine?.notifications?.map((n) => (
              <button
                key={n.id}
                className="nk-order-row"
                onClick={() => {
                  if (n.event.startsWith("RESIDENCY_")) navigate("residency");
                  else if (
                    ["NEED_MATCH", "OFFER_NEW", "ITEM_MATCH"].includes(n.event)
                  )
                    navigate("needs");
                  else showOrder(n.aggregate_id);
                }}
              >
                <Bell size={20} />
                <span>
                  <strong>
                    {t(EVENTS[n.event]?.title || "notifications")}
                  </strong>
                  <small>{t("currentState")}</small>
                </span>
                <small>{dateTime(n.created_at, locale)}</small>
              </button>
            ))}
            {!mine?.notifications?.length && (
              <p className="nk-muted">{t("noneNotifications")}</p>
            )}
          </div>
        </section>
      )}
      {area && (
        <footer className="nk-data-note">
          <ShieldCheck size={16} />
          <span>
            {area.name} · {t("source")}:{" "}
            {catalog?.sources?.find((s) => s.id === area.source_id)?.name} ·{" "}
            {t("updated")}: {dateTime(area.updated_at, locale)}
          </span>
          <button className="nk-text" onClick={() => setModal({ type: "map" })}>
            {t("map")}
          </button>
        </footer>
      )}
      {modal && (
        <NeighborhoodModal
          closeLabel={t("close")}
          title={t(
            {
              quote: "preview",dates:"selectDates",
              need: "need",
              listing: "post",
              verify: "verify",
              suggest: "suggestArea",
              offer: "offer",
              block: "calendar",
              action: modal.action,
              map: "map",
            }[modal.type] || "details",
          )}
          busy={busy}
          onClose={() => {
            setModal(null);
            if(!workspace){const url=new URL(location.href);url.searchParams.delete("resume");history.replaceState(null,"",url);}
            setSecret("");
          }}
        >
          {error && (
            <div className="nk-error" role="alert">
              {t(error)}
              {["IDENTITY_REQUIRED","IDENTITY_EXPIRED","PROFILE_INCOMPLETE","RESIDENCY_REQUIRED","AUTH_REQUIRED"].includes(error)&&<Link href={(error==="AUTH_REQUIRED"?"/auth":error==="RESIDENCY_REQUIRED"?"/dashboard/profile/residency":error==="PROFILE_INCOMPLETE"?"/dashboard/profile":"/dashboard/kyc")+"?next="+encodeURIComponent(window.location.pathname+window.location.search)}>{eText("continueSetup")}</Link>}
            </div>
          )}
          {modal.type === "dates"&&<form className="nk-form" onSubmit={async event=>{event.preventDefault();const form=new FormData(event.currentTarget),start=String(form.get("start")),end=String(form.get("end"));setFilter(f=>({...f,start,end}));if(!mine){setError("AUTH_REQUIRED");return;}setBusy(true);setError("");try{const r=await get("quote",{area:modal.item.area_id||filter.area,asset:modal.item.asset_id,start:isoLocal(start),end:isoLocal(end)});setModal({type:"quote",item:modal.item,start:isoLocal(start),end:isoLocal(end),quote:r.quote});}catch(e){setError(e.code||e.message);}finally{setBusy(false);}}}><Field label={t("start")}><input type="datetime-local" name="start" required defaultValue={filter.start}/></Field><Field label={t("end")}><input type="datetime-local" name="end" required defaultValue={filter.end}/></Field><button className="nk-primary" disabled={busy}>{busy?<RelooLoading compact locale={locale}/>:t("preview")}</button></form>}
          {modal.type === "quote" && (
            <QuickRentalQuote
              key={
                modal.quote.listingVersion +
                ":" +
                modal.quote.policyVersion +
                ":" +
                (modal.quote.promotion || "") +
                ":" +
                modal.quote.total
              }
              t={t}
              locale={locale}
              modal={modal}
              busy={busy}
              promotions={promotions}
              onPromotion={async (promotion) => {
                setBusy(true);setError("");try {
                  const r = await get("quote", {
                    area: modal.item.area_id || filter.area,
                    asset: modal.item.asset_id,
                    start: modal.start,
                    end: modal.end,
                    promotion,
                  });
                  setModal({ ...modal, quote: r.quote });
                } catch (e) {
                  setError(e.code || e.message);
                }finally{setBusy(false);}
              }}
              onDates={async(start,end)=>{setBusy(true);try{const r=await get("quote",{area:modal.item.area_id||filter.area,asset:modal.item.asset_id,start,end,promotion:modal.quote.promotion||""});setModal({...modal,start,end,quote:r.quote});setFilter(f=>({...f,start:new Date(Date.parse(start)+7*3600000).toISOString().slice(0,16),end:new Date(Date.parse(end)+7*3600000).toISOString().slice(0,16)}));}catch(e){setError(e.code||e.message);}finally{setBusy(false);}}}
              onConfirm={async (action = "BOOK") => {
                const r = await mutate(action, {
                  asset: modal.item.asset_id,
                  start: modal.start,
                  end: modal.end,
                  offer: modal.offer || "",
                  promotion: modal.quote.promotion || "",
                  policyVersion: modal.quote.policyVersion,
                  listingVersion: modal.quote.listingVersion,
                  total: modal.quote.total,
                  agreed: true,
                },{refresh:false});
                if (r?.id){if(action==="BOOK")recordRental("INQUIRY_SENT",{asset:modal.item.asset_id,category:modal.item.category});showOrder(r.id);}
              }}
            />
          )}
          {modal.type === "need" && (
            <NeedForm
              t={t}
              locale={locale}
              filter={filter}
              need={modal.need}
              locationFields={locationFields}
              busy={busy}
              submit={(data) => mutate(modal.need ? "EDIT_NEED" : "NEED", data)}
            />
          )}
          {modal.type === "listing" && (
            <ListingForm
              t={t}
              locale={locale}
              mine={mine}
              filter={filter}
              listing={modal.listing}
              locationFields={locationFields}
              busy={busy}
              submit={(data) => mutate("LISTING", data)}
            />
          )}
          {modal.type === "verify" && (
            <SimpleForm
              t={t}
              busy={busy}
              submit={(data) =>
                mutate("VERIFY", { membership: modal.membership, ...data })
              }
              fields={[
                ["invite", "text", false],
                ["verificationNote", "textarea", false],
              ]}
              transform={(d) => ({
                ...(d.invite ? { invite: d.invite } : {}),
                note: d.verificationNote,
              })}
              hint={t("inviteHint")}
            />
          )}
          {modal.type === "suggest" && (
            <SimpleForm
              t={t}
              busy={busy}
              submit={(data) => mutate("SUGGEST_AREA", data)}
              fields={[
                ["name", "text", true],
                ["address", "text", true],
              ]}
            />
          )}
          {modal.type === "offer" && (
            <form
              className="nk-form"
              onSubmit={(e) => {
                e.preventDefault();
                const d = new FormData(e.currentTarget);
                mutate("OFFER", {
                  need: modal.need.id,
                  asset: d.get("asset"),
                  note: d.get("note"),
                });
              }}
            >
              <p>{t("offerHint")}</p>
              <Field label={t("ownAsset")}>
                <select name="asset" required>
                  <option value="">{t("choose")}</option>
                  {mine?.listings
                    ?.filter((l) => l.status === "ACTIVE")
                    .map((l) => (
                      <option key={l.asset_id} value={l.asset_id}>
                        {l.title}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t("note")}>
                <textarea name="note" maxLength={1000} />
              </Field>
              <button className="nk-primary" disabled={busy}>
                {t("offer")}
              </button>
            </form>
          )}
          {modal.type === "block" && (
            <>
              <SimpleForm
                t={t}
                busy={busy}
                fields={[
                  ["start", "datetime-local", true],
                  ["end", "datetime-local", true],
                ]}
                submit={(d) =>
                  mutate("BLOCK", {
                    asset: modal.listing.asset_id,
                    start: isoLocal(d.start),
                    end: isoLocal(d.end),
                  })
                }
              />
              {mine?.blocks
                ?.filter((b) => b.asset_id === modal.listing.asset_id)
                .map((b) => (
                  <div className="nk-row" key={b.id}>
                    <span>
                      {dateTime(b.starts_at, locale)} —{" "}
                      {dateTime(b.ends_at, locale)}
                    </span>
                    <button
                      onClick={() =>
                        mutate("REMOVE_BLOCK", { id: b.id }, { close: false })
                      }
                    >
                      {t("removeBlock")}
                    </button>
                  </div>
                ))}
            </>
          )}
          {modal.type === "action" && (
            <OrderAction
              t={t}
              locale={locale}
              modal={modal}
              detail={detail}
              actor={mine?.actor}
              busy={busy}
              submit={async (data) => {
                await mutate(modal.action, { id: detail.order.id, ...data });
              }}
            />
          )}
          {modal.type === "map" && (
            <>
              <p>{t("mapHint")}</p>
              <AreaMap
                places={places.filter(
                  (p) => p.id === filter.area || p.parent_id === filter.area,
                )}
                t={t}
              />
              <p>
                {t("source")}:{" "}
                {
                  catalog.sources.find((s) => s.id === area?.source_id)
                    ?.attribution
                }
              </p>
            </>
          )}
        </NeighborhoodModal>
      )}
    </div>
  );
}
function ResidenceForm({ t, filter, locationFields, onSave, busy }) {
  const [state, set] = useState({
    area: filter.area,
    building: filter.building,
    subzone: filter.subzone,
    visible: false,
  });
  return (
    <form
      className="nk-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(state);
      }}
    >
      <div className="nk-form-grid">{locationFields(state, set)}</div>
      <label className="nk-check">
        <input
          type="checkbox"
          checked={state.visible}
          onChange={(e) => set({ ...state, visible: e.target.checked })}
        />
        {t("visibility")}
      </label>
      <button className="nk-primary" disabled={busy}>
        {t("setResidence")}
      </button>
    </form>
  );
}
function Preferences({ t, locale, preferences, onSave, busy }) {
  const [state, set] = useState({
    match: !!preferences?.match_enabled,
    marketing: !!preferences?.marketing_enabled,
    quietStart: preferences?.quiet_start ?? 22,
    quietEnd: preferences?.quiet_end ?? 7,
    cap: preferences?.daily_cap ?? 3,
  });
  return (
    <details className="nk-preferences">
      <summary>{t("preferences")}</summary>
      <form
        className="nk-form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...state, locale });
        }}
      >
        {["match", "marketing"].map((key) => (
          <label className="nk-check" key={key}>
            <input
              type="checkbox"
              checked={state[key]}
              onChange={(e) => set({ ...state, [key]: e.target.checked })}
            />
            {t(key === "match" ? "matchOptIn" : "marketingOptIn")}
          </label>
        ))}
        <div className="nk-form-grid">
          {[
            ["quietStart", "quietStart", 23],
            ["quietEnd", "quietEnd", 23],
            ["cap", "frequency", 10],
          ].map(([key, label, max]) => (
            <Field label={t(label)} key={key}>
              <input
                type="number"
                min={key === "cap" ? 1 : 0}
                max={max}
                value={state[key]}
                onChange={(e) =>
                  set({ ...state, [key]: Number(e.target.value) })
                }
              />
            </Field>
          ))}
        </div>
        <small>{t("notificationHint")}</small>
        <button disabled={busy} className="nk-primary">
          {t("save")}
        </button>
      </form>
    </details>
  );
}
export function SimpleForm({
  t,
  busy,
  fields,
  submit,
  transform = (d) => d,
  hint,
}) {
  const [error, setError] = useState("");
  return (
    <form
      className="nk-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const d = Object.fromEntries(new FormData(e.currentTarget));
          await submit(transform(d));
        } catch (e) {
          setError(e.message || "INVALID_INPUT");
        }
      }}
    >
      {hint && <p>{hint}</p>}
      {fields.map(([key, type, required]) => (
        <Field key={key} label={t(key)}>
          {type === "textarea" ? (
            <textarea name={key} required={required} maxLength={1500} />
          ) : (
            <input name={key} type={type} required={required} maxLength={200} />
          )}
        </Field>
      ))}
      {error && (
        <p role="alert" className="nk-error">
          {t(error)}
        </p>
      )}
      <button className="nk-primary" disabled={busy}>
        {busy ? t("working") : t("send")}
      </button>
    </form>
  );
}
function NeedForm({ t, filter, need, locationFields, busy, submit }) {
  const [state, set] = useState({
      ...filter,
      ...(need
        ? {
            area: need.area_id,
            subzone: need.subzone_id || "",
            building: need.building_id || "",
            scope: need.scope,
          }
        : {}),
    }),
    [error, setError] = useState("");
  return (
    <form
      className="nk-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const d = new FormData(e.currentTarget);
          await submit({
            ...state,
            ...(need ? { id: need.id } : {}),
            title: d.get("title"),
            category: d.get("category"),
            note: d.get("note"),
            start: isoLocal(d.get("start")),
            end: isoLocal(d.get("end")),
            budget: d.get("budget") === "" ? null : Number(d.get("budget")),
            images: await readPhotos(d.getAll("photos").filter((f) => f.size)),
          });
        } catch (e) {
          setError(e.message);
        }
      }}
    >
      <div className="nk-form-grid">
        {locationFields(state, set)}
        <Field label={t("scope")}>
          <select
            value={state.scope}
            onChange={(e) => set({ ...state, scope: e.target.value })}
          >
            {["AREA", "SUBZONE", "BUILDING"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("title")}>
        <input
          name="title"
          required
          minLength={3}
          maxLength={160}
          defaultValue={need?.title || filter.q}
        />
      </Field>
      <Field label={t("category")}>
        <CategorySelect t={t} defaultValue={need?.category} />
      </Field>
      <div className="nk-form-grid">
        <Field label={t("start")}>
          <input
            type="datetime-local"
            required
            name="start"
            defaultValue={
              need
                ? new Date(Date.parse(need.starts_at) + 7 * 3600000)
                    .toISOString()
                    .slice(0, 16)
                : filter.start
            }
          />
        </Field>
        <Field label={t("end")}>
          <input
            type="datetime-local"
            required
            name="end"
            defaultValue={
              need
                ? new Date(Date.parse(need.ends_at) + 7 * 3600000)
                    .toISOString()
                    .slice(0, 16)
                : filter.end
            }
          />
        </Field>
        <Field label={t("budget")}>
          <input
            type="number"
            min="0"
            max="1000000000"
            name="budget"
            defaultValue={need?.budget || ""}
          />
        </Field>
      </div>
      <Field label={t("note")}>
        <textarea name="note" maxLength={1500} defaultValue={need?.note} />
      </Field>
      <Field label={t("addPhotos")} hint={t("imagesHint")}>
        <input
          type="file"
          name="photos"
          accept="image/png,image/jpeg,image/webp"
          multiple
        />
      </Field>
      {error && <p className="nk-error">{t(error)}</p>}
      <button className="nk-primary" disabled={busy}>
        {t("send")}
      </button>
    </form>
  );
}
function ListingForm({
  t,
  locale,
  mine,
  filter,
  listing,
  locationFields,
  busy,
  submit,
}) {
  const [state, set] = useState({
      area: listing?.area_id || filter.area,
      building: listing?.building_id || filter.building,
      subzone: listing?.subzone_id || filter.subzone,
      point: listing?.handover_id || "",
      scope: listing?.scope || "AREA",
    }),
    [error, setError] = useState(""),
    [selectedAsset, setSelectedAsset] = useState(listing?.asset_id || ""),
    [preview, setPreview] = useState(null);
  const canonical =
    mine?.assets?.find((a) => a.id === selectedAsset) || listing;
  const editBase = !selectedAsset || canonical?.neighborhood_only;
  return (
    <form
      className="nk-form"
      onChange={() => setPreview(null)}
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const d = new FormData(e.currentTarget),
            number = (k) => Number(d.get(k));
          const payload = {
            ...state,
            asset: selectedAsset,
            title: editBase ? d.get("title") : canonical?.title,
            description: editBase
              ? d.get("description")
              : canonical?.description || "",
            category: editBase ? d.get("category") : canonical?.category,
            rate: number("rate"),
            deposit: number("deposit"),
            unitMinutes: number("unitMinutes"),
            minMinutes: number("minMinutes"),
            bufferMinutes: number("bufferMinutes"),
            handoverStart: number("handoverStart"),
            handoverEnd: number("handoverEnd"),
            accessories: String(d.get("accessories"))
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            condition: d.get("condition"),
            instructions: d.get("instructions"),
            verifiedOnly: d.get("verifiedOnly") === "on",
            instant: d.get("instant") === "on",
            images: editBase
              ? await readPhotos(d.getAll("photos").filter((f) => f.size))
              : [],
          };
          if (!preview) {
            setPreview(payload);
            return;
          }
          await submit(payload);
        } catch (e) {
          setError(e.message);
        }
      }}
    >
      <div className="nk-form-grid">{locationFields(state, set, true)}</div>
      <Field label={t("existingAsset")}>
        <select
          name="asset"
          value={selectedAsset}
          onChange={(e) => setSelectedAsset(e.target.value)}
          disabled={!!listing}
        >
          <option value="">{t("createAsset")}</option>
          {mine?.assets?.map((a) => (
            <option value={a.id} key={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </Field>
      {selectedAsset && !editBase ? (
        <p>
          {t("existingAssetHint")}{" "}
          <Link
            href={
              "/dashboard/assets/" + encodeURIComponent(selectedAsset) + "/edit"
            }
          >
            {t("editOriginal")}
          </Link>
        </p>
      ) : (
        <p>{t("onlyNeighborhood")}</p>
      )}
      <fieldset
        disabled={!editBase}
        className="nk-base-fields"
        key={selectedAsset}
      >
        <Field label={t("title")}>
          <input
            name="title"
            defaultValue={canonical?.title}
            required={editBase}
            minLength={3}
            maxLength={160}
          />
        </Field>
        <Field label={t("category")}>
          <CategorySelect t={t} defaultValue={canonical?.category} />
        </Field>
        <Field label={t("description")}>
          <textarea
            name="description"
            maxLength={4000}
            defaultValue={canonical?.description || ""}
          />
        </Field>
      </fieldset>
      <div className="nk-form-grid">
        {[
          ["rate", listing?.rate ?? "", "rate"],
          ["deposit", listing?.deposit ?? "", "depositAmount"],
          ["minMinutes", listing?.min_minutes || 60, "minMinutes"],
          ["bufferMinutes", listing?.buffer_minutes ?? 30, "bufferMinutes"],
          ["handoverStart", listing?.handover_start ?? 0, "handoverStart"],
          ["handoverEnd", listing?.handover_end ?? 24, "handoverEnd"],
        ].map(([key, value, label]) => (
          <Field key={key} label={t(label)}>
            <input
              name={key}
              type="number"
              min={
                key === "minMinutes"
                  ? 60
                  : key === "rate" || key === "handoverEnd"
                    ? 1
                    : 0
              }
              max={
                key === "rate" || key === "deposit"
                  ? 1000000000
                  : key === "handoverStart"
                    ? 23
                    : key === "handoverEnd"
                      ? 24
                      : key === "bufferMinutes"
                        ? 1440
                        : 129600
              }
              step="1"
              defaultValue={value}
              required
            />
          </Field>
        ))}
        <Field label={t("unit")}>
          <select
            name="unitMinutes"
            defaultValue={listing?.unit_minutes || 1440}
          >
            <option value="60">{t("hour")}</option>
            <option value="1440">{t("day")}</option>
          </select>
        </Field>
        <Field label={t("scope")}>
          <select
            value={state.scope}
            onChange={(e) => set({ ...state, scope: e.target.value })}
          >
            {["AREA", "SUBZONE", "BUILDING"].map((s) => (
              <option key={s} value={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("accessories")}>
        <textarea
          name="accessories"
          required
          defaultValue={listing?.accessories?.join("\n")}
        />
      </Field>
      <Field label={t("condition")}>
        <input
          name="condition"
          minLength={3}
          maxLength={1000}
          required
          defaultValue={listing?.condition}
        />
      </Field>
      <Field label={t("instructions")}>
        <textarea
          name="instructions"
          maxLength={2000}
          defaultValue={listing?.instructions}
        />
      </Field>
      <Field label={t("addPhotos")} hint={t("imagesHint")}>
        <input
          type="file"
          name="photos"
          disabled={!editBase}
          required={!selectedAsset}
          accept="image/png,image/jpeg,image/webp"
          multiple
        />
      </Field>
      <label className="nk-check">
        <input
          name="verifiedOnly"
          type="checkbox"
          defaultChecked={listing?.verified_only}
        />
        {t("verifiedOnly")}
      </label>
      <label className="nk-check">
        <input
          name="instant"
          type="checkbox"
          defaultChecked={listing?.instant}
        />
        {t("instant")}
      </label>
      {preview && (
        <section className="nk-terms">
          <h3>{t("previewListing")}</h3>
          <strong>{preview.title}</strong>
          <p>
            {money(preview.rate, locale)} /{" "}
            {t(preview.unitMinutes === 60 ? "hour" : "day")}
          </p>
          <p>
            {t("deposit")}: {money(preview.deposit, locale)} ·{" "}
            {t(preview.scope)}
          </p>
          <p>{preview.condition}</p>
          <p>{preview.accessories.join(" · ")}</p>
          <p>{preview.instructions}</p>
          <small>{t("previewHint")}</small>
        </section>
      )}
      {error && <p className="nk-error">{t(error)}</p>}
      <button className="nk-primary" disabled={busy}>
        {t(preview ? "publish" : "previewListing")}
      </button>
    </form>
  );
}
function OrderDetail({
  data,
  now,
  actor,
  t,
  locale,
  busy,
  mutate,
  setModal,
  secret,
  qr,
  clearSecret,
  onBack,
}) {
  const o = data.order,
    isOwner = o.owner_id === actor;
  const actions = [];
  if (o.status === "DRAFT" && !isOwner) actions.push("SUBMIT_DRAFT");
  if (o.status === "PENDING_OWNER" && isOwner) actions.push("ACCEPT", "REJECT");
  if (o.status === "PENDING_PAYMENT") {
    if (!isOwner && o.payment_status === "UNPAID")
      actions.push("PAYMENT_REPORT");
    if (isOwner && o.payment_status === "REPORTED") actions.push("PAYMENT_ACK");
    if (isOwner && o.payment_status === "PAID" && o.deposit_status === "UNPAID")
      actions.push("DEPOSIT_ACK");
  }
  if (o.status === "CONFIRMED" && isOwner) actions.push("READY");
  if (o.status === "ACTIVE" && !isOwner)
    actions.push("REQUEST_RETURN", "EXTEND");
  if (
    [
      "PENDING_OWNER",
      "PENDING_PAYMENT",
      "CONFIRMED",
      "READY_FOR_HANDOVER",
    ].includes(o.status)
  )
    actions.push("CANCEL");
  if (o.status !== "DRAFT") actions.push("ISSUE");
  if (o.refund_status === "REFUND_PENDING" && isOwner)
    actions.push("REFUND_REPORT");
  if (o.refund_status === "RETURN_REPORTED" && !isOwner)
    actions.push("REFUND_ACK");
  if (o.status === "COMPLETED" && o.deposit_status === "HELD_DIRECT" && isOwner)
    actions.push("DEPOSIT_RETURN");
  if (o.deposit_status === "RETURN_REPORTED" && !isOwner)
    actions.push("DEPOSIT_RETURN_ACK");
  if (
    o.status === "COMPLETED" &&
    !data.reviews.some((r) => r.profile_id === actor)
  )
    actions.push("REVIEW");
  const phase =
    o.status === "READY_FOR_HANDOVER"
      ? "PICKUP"
      : o.status === "RETURN_PENDING"
        ? "RETURN"
        : null;
  return (
    <section className="nk-panel">
      <button
        className="nk-text"
        onClick={() => {
          clearSecret();
          onBack();
        }}
      >
        {t("back")}
      </button>
      <div className="nk-section-heading">
        <h2>
          {t("order")} <small>{o.id.slice(0, 8)}</small>
        </h2>
        <span className="nk-badge">{t(o.status)}</span>
      </div>
      <h3>{o.snapshot.assetTitle}</h3>
      <p className="nk-muted">{o.snapshot.areaName}</p>
      <p>
        {dateTime(o.starts_at, locale)} — {dateTime(o.ends_at, locale)}
      </p>
      {["ACTIVE", "RETURN_PENDING"].includes(o.status) &&
        Date.parse(o.ends_at) < now && (
          <p className="nk-error">{t("overdue")}</p>
        )}
      <div className="nk-order-columns">
        <div>
          <dl className="nk-breakdown">
            {["rent", "fee", "deposit", "total"].map((k) => (
              <div key={k}>
                <dt>{t(k)}</dt>
                <dd>{money(o.snapshot[k], locale)}</dd>
              </div>
            ))}
          </dl>
          <div className="nk-terms">
            <h3>
              {t("policy")} · {o.snapshot.policyVersion}
            </h3>
            <p>{o.snapshot.terms[locale]}</p>
            <p>{t("manualPayment")}</p>
          </div>
        </div>
        <div>
          <dl className="nk-breakdown">
            {[
              ["payment", o.payment_status],
              ["depositStatus", o.deposit_status],
              ["refund", o.refund_status],
              ["dispute", o.dispute_status],
            ].map(([k, v]) => (
              <div key={k}>
                <dt>{t(k)}</dt>
                <dd>{t(v)}</dd>
              </div>
            ))}
          </dl>
          {o.hold_until &&
            ["PENDING_OWNER", "PENDING_PAYMENT"].includes(o.status) && (
              <p>
                {t("holdUntil")}: {dateTime(o.hold_until, locale)}
              </p>
            )}
          {data.handover && (
            <div className="nk-handover-point">
              <MapPin size={20} />
              <div>
                <h3>{data.handover.name}</h3>
                <p>{data.handover.address}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="nk-row-actions">
        {actions.map((a) => (
          <button
            disabled={busy}
            className={a === "ISSUE" ? "nk-secondary" : "nk-primary"}
            key={a}
            onClick={() => setModal({ type: "action", action: a })}
          >
            {t(
              a === "EXTEND"
                ? "extension"
                : a === "REVIEW"
                  ? "reviewPrompt"
                  : a,
            )}
          </button>
        ))}
      </div>
      {phase && (
        <div className="nk-handover-panel">
          <h3>{t(phase === "PICKUP" ? "pickup" : "return")}</h3>
          <p>{t("otpHint")}</p>
          {((phase === "PICKUP" && isOwner) ||
            (phase === "RETURN" && !isOwner)) && (
            <button
              className="nk-secondary"
              disabled={busy}
              onClick={() =>
                mutate("ISSUE_OTP", { id: o.id, phase }, { close: false })
              }
            >
              {t("issueOtp")}
            </button>
          )}
          {secret && <output className="nk-otp">{secret}</output>}
          {qr && (
            <NeighborhoodImage
              className="nk-qr"
              src={qr}
              alt={t("handoverQr")}
            />
          )}
          <button
            className="nk-primary"
            disabled={busy}
            onClick={() =>
              setModal({ type: "action", action: "HANDOVER", phase })
            }
          >
            {t("checklist")}
          </button>
          {data.checks
            .filter((c) => c.phase === phase)
            .map((c) => (
              <p key={c.profile_id}>
                <Check size={15} />
                {c.profile_id === actor ? t("confirm") : t("owner")} ·{" "}
                {dateTime(c.confirmed_at, locale)}
              </p>
            ))}
        </div>
      )}
      {data.extensions.map((e) => (
        <div className="nk-row nk-terms" key={e.id}>
          <div>
            <strong>
              {t("extension")}: {dateTime(e.ends_at, locale)}
            </strong>
            <p>
              {t("extensionExtra")}: {money(e.extra, locale)} · {t(e.status)}
            </p>
            <small>{t("extensionHint")}</small>
          </div>
          {isOwner && e.status === "PENDING" && (
            <>
              <button
                onClick={() =>
                  mutate("EXTENSION_ACCEPT", { id: o.id, extension: e.id })
                }
              >
                {t("approveExtension")}
              </button>
              <button
                onClick={() =>
                  mutate("EXTENSION_REJECT", { id: o.id, extension: e.id })
                }
              >
                {t("rejectExtension")}
              </button>
            </>
          )}
          {isOwner && e.status === "ACCEPTED" && (
            <button
              onClick={() =>
                mutate("EXTENSION_PAID", { id: o.id, extension: e.id })
              }
            >
              {t("extensionPay")}
            </button>
          )}
        </div>
      ))}
      {data.disputes.map((d) => (
        <div className="nk-error" key={d.id}>
          <strong>{t("dispute")}</strong>
          <p>{d.note}</p>
          <p>{d.resolution}</p>
        </div>
      ))}
      <details>
        <summary>{t("returnEvidence")}</summary>
        {data.checks.map((c) => (
          <div key={c.phase + c.profile_id}>
            <p>
              {t(c.phase === "PICKUP" ? "pickup" : "return")} · {c.condition}
            </p>
            {c.images?.map((src) => (
              <NeighborhoodImage
                className="nk-need-image"
                key={src}
                src={src}
                alt={t("evidence")}
              />
            ))}
          </div>
        ))}
      </details>
      <h3>{t("timeline")}</h3>
      <ol className="nk-timeline">
        {data.events.map((e) => (
          <li key={e.id}>
            <strong>
              {t(
                {
                  BOOK: "PENDING_OWNER",
                  HANDOVER: "confirmHandover",
                  EXTEND: "extension",
                  ISSUE_OTP: "issueOtp",
                }[e.action] || e.action,
              )}
            </strong>
            <time>{dateTime(e.created_at, locale)}</time>
          </li>
        ))}
      </ol>
    </section>
  );
}
function OrderAction({ t, locale, modal, detail, actor, busy, submit }) {
  const [checked, setChecked] = useState([]),
    [error, setError] = useState(""),
    [scanCode, setScanCode] = useState(""),
    o = detail.order;
  return (
    <form
      className="nk-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        try {
          const d = new FormData(e.currentTarget);
          let data = {
            reason: d.get("reason") || "",
            note: d.get("note") || "",
          };
          if (modal.action === "EXTEND") data = { end: isoLocal(d.get("end")) };
          if (modal.action === "HANDOVER")
            data = {
              phase: modal.phase,
              checked: checked.length === o.snapshot.accessories.length,
              checklist: o.snapshot.accessories,
              condition: d.get("condition"),
              ...(d.get("code") ? { code: d.get("code") } : {}),
              images: await readPhotos(
                d.getAll("photos").filter((f) => f.size),
              ),
            };
          if (modal.action === "REVIEW")
            data = { rating: Number(d.get("rating")), note: d.get("note") };
          if (modal.action === "ISSUE")
            data.images = await readPhotos(
              d.getAll("photos").filter((f) => f.size),
            );
          await submit(data);
        } catch (e) {
          setError(e.message);
        }
      }}
    >
      {["CANCEL", "REJECT"].includes(modal.action) && (
        <>
          <p>{o.snapshot.terms[locale]}</p>
          <Field label={t("reason")}>
            <textarea name="reason" required minLength={5} maxLength={1000} />
          </Field>
        </>
      )}
      {modal.action === "EXTEND" && (
        <>
          <p>{t("extensionHint")}</p>
          <Field label={t("extendTo")}>
            <input type="datetime-local" name="end" required />
          </Field>
        </>
      )}
      {modal.action === "HANDOVER" && (
        <>
          <p>{t("otpHint")}</p>
          {o.snapshot.accessories.map((accessory, i) => (
            <label key={i} className="nk-check">
              <input
                type="checkbox"
                checked={checked.includes(i)}
                onChange={(e) =>
                  setChecked((c) =>
                    e.target.checked ? [...c, i] : c.filter((x) => x !== i),
                  )
                }
              />
              {accessory}
            </label>
          ))}
          <Field label={t("condition")}>
            <textarea
              name="condition"
              minLength={3}
              required
              maxLength={1000}
            />
          </Field>
          <Field label={t("scanQr")}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={async (e) => {
                try {
                  const { readHandoverQr } = await import(
                    "@/lib/neighborhood/qr-client"
                  );
                  setScanCode(
                    await readHandoverQr(e.target.files[0], o.id, modal.phase),
                  );
                } catch {
                  setError("INVALID_QR");
                }
              }}
            />
          </Field>
          <Field label={t("otp")}>
            <input
              name="code"
              value={scanCode}
              onChange={(e) =>
                setScanCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required={
                (modal.phase === "PICKUP" && actor !== o.owner_id) ||
                (modal.phase === "RETURN" && actor !== o.renter_id)
              }
              autoComplete="one-time-code"
            />
          </Field>
          <Field label={t("evidence")}>
            <input
              type="file"
              name="photos"
              multiple
              accept="image/jpeg,image/png,image/webp"
              required
            />
          </Field>
          <label className="nk-check">
            <input type="checkbox" required />
            {t("checkAll")}
          </label>
          <small>{t("submitMissing")}</small>
        </>
      )}
      {modal.action === "ISSUE" && (
        <>
          <Field label={t("note")}>
            <textarea required minLength={10} maxLength={1500} name="note" />
          </Field>
          <Field label={t("evidence")}>
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
            />
          </Field>
        </>
      )}
      {modal.action === "REVIEW" && (
        <>
          <Field label={t("rating")}>
            <input
              name="rating"
              type="number"
              required
              min="1"
              max="5"
              step="1"
            />
          </Field>
          <Field label={t("reviewNote")}>
            <textarea required name="note" maxLength={1000} />
          </Field>
        </>
      )}
      {modal.action.includes("PAYMENT") ||
      modal.action.includes("DEPOSIT") ||
      modal.action.includes("REFUND") ? (
        <p>{t("manualPayment")}</p>
      ) : null}
      {error && (
        <p role="alert" className="nk-error">
          {t(error)}
        </p>
      )}
      <button
        className="nk-primary"
        disabled={
          busy ||
          (modal.action === "HANDOVER" &&
            checked.length !== o.snapshot.accessories.length)
        }
      >
        {busy
          ? t("working")
          : t(modal.action === "HANDOVER" ? "confirmHandover" : "confirm")}
      </button>
    </form>
  );
}
export function AreaMap({ places, t }) {
  const polygons = places.filter((p) =>
    ["Polygon", "MultiPolygon"].includes(p.geometry?.type),
  );
  if (!polygons.length)
    return (
      <div className="nk-empty">
        <MapPin size={30} />
        <p>{t("noMap")}</p>
        <small>{t("mapHint")}</small>
      </div>
    );
  const all = polygons.flatMap((p) =>
      p.geometry.type === "Polygon"
        ? p.geometry.coordinates
        : p.geometry.coordinates.flat(),
    ),
    xs = all.flat().map((p) => p[0]),
    ys = all.flat().map((p) => p[1]),
    minX = Math.min(...xs),
    minY = Math.min(...ys),
    dx = Math.max(...xs) - minX || 1,
    dy = Math.max(...ys) - minY || 1;
  return (
    <svg
      viewBox="0 0 600 360"
      role="img"
      aria-label={t("map")}
      className="nk-map"
    >
      {polygons.flatMap((p) =>
        (p.geometry.type === "Polygon"
          ? [p.geometry.coordinates]
          : p.geometry.coordinates
        ).map((poly, i) => (
          <path
            key={p.id + i}
            d={poly
              .map(
                (ring) =>
                  "M" +
                  ring
                    .map(
                      ([x, y]) =>
                        `${20 + ((x - minX) / dx) * 560},${340 - ((y - minY) / dy) * 320}`,
                    )
                    .join("L") +
                  "Z",
              )
              .join(" ")}
            fillRule="evenodd"
          >
            <title>{p.name}</title>
          </path>
        )),
      )}
    </svg>
  );
}

function CategorySelect({ t, defaultValue }) {
  return (
    <select name="category" defaultValue={defaultValue || "cong-cu"} required>
      {NEIGHBORHOOD_CATEGORIES.map(([id, key]) => (
        <option key={id} value={id}>
          {t(key)}
        </option>
      ))}
    </select>
  );
}
