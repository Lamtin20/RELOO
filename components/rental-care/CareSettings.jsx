"use client";
import {CATEGORIES} from '@/lib/constants';
import {setupCategoryName} from '@/lib/i18n/setup';
import {useLocale} from '@/components/settings/LocaleProvider';

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ShieldCheck,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  RelooCalendar as nativeCalendar,
  calendarAvailable,
} from "@/lib/mobile/calendar";
import { useNativeApp } from "@/lib/mobile/useNativeApp";
import { careText } from "@/lib/rental-care/content";
import {
  text as categoryText,
  NEIGHBORHOOD_CATEGORIES,
} from "@/lib/neighborhood/content";
import { careFetch, usePersonalization } from "./PersonalizationProvider";
import "./rental-care.css";
import { Recommendations } from "./Recommendations";
import { useAuth } from "@/lib/store";
export function CareAccountLinks({ locale = "vi-VN" }) {
  const t = (k) => careText(locale, k);
  return (
    <nav className="rc-account-links">
      <Link href={"/account/personalization?lang=" + locale}>
        <SlidersHorizontal size={20} />
        {t("personalTitle")}
      </Link>
    </nav>
  );
}
export function CareSettings(props) {
  return (
    <CareSettingsInner
      key={(props.mode || "calendar") + ":" + (props.initialLocale || "vi-VN")}
      {...props}
    />
  );
}
function CareSettingsInner({ mode = "calendar" }) {
  const native = useNativeApp();
  const confirmDialog = useRef(null);
  const owner = useRef(null),
    readSequence = useRef(0),
    { user } = useAuth();
  const {locale}=useLocale();
  const [care, setCare] = useState(null),
    [personal, setPersonal] = useState(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [other, setOther] = useState(false),
    [switchTarget, setSwitch] = useState(false),
    [dual, setDual] = useState(false),
    [calendars, setCalendars] = useState([]),
    [selected, setSelected] = useState(""),
    [device, setDevice] = useState(""),
    [returnToApp, setReturnToApp] = useState(false),
    [confirmReset, setConfirmReset] = useState(null);
  const { refresh } = usePersonalization(),
    t = (k) => careText(locale, k);
  const authOwner = user?.id;
  const ownData =
    !user?.id ||
    care?.testMode ||
    ((!care?.actor || care.actor === user.id) &&
      (!personal?.actor || personal.actor === user.id));
  useEffect(() => {
    const dialog = confirmDialog.current;
    if (confirmReset) dialog?.showModal();
    return () => dialog?.close();
  }, [confirmReset]);
  const load = useCallback(async () => {
    const sequence = ++readSequence.current;
    try {
      const [c, p] = await Promise.all([
        careFetch("/api/rental-care"),
        careFetch("/api/personalization"),
      ]);
      if (sequence !== readSequence.current) return;
      if (
        (c.actor && p.actor && c.actor !== p.actor) ||
        (authOwner && !c.testMode && c.actor && c.actor !== authOwner)
      )
        throw Error("FORBIDDEN");
      const nextOwner = c.actor || p.actor || null;
      if (owner.current !== nextOwner) {
        owner.current = nextOwner;
        setOther(false);
        setSwitch(false);
        setDual(false);
        setCalendars([]);
        setSelected("");
        setDevice("");
        setConfirmReset(null);
        setNotice("");
        setBusy(false);
      }
      setCare(c);
      setPersonal(p);
      setError("");
    } catch (e) {
      if (sequence !== readSequence.current) return;
      setCare(null);
      setPersonal(null);
      setError(e.message);
    }
  }, [authOwner]);
  useEffect(() => {
    const initial = setTimeout(
      () =>
        setReturnToApp(
          new URLSearchParams(location.search).get("native_setup") === "1",
        ),
      0,
    );
    const timer = setTimeout(load, 0),
      poll = setInterval(load, 15000);
    return () => {
      clearTimeout(initial);
      clearTimeout(timer);
      clearInterval(poll);
    };
  }, [load]);
  async function act(path, body) {
    if (busy) return null;
    const actor = care?.actor || personal?.actor || null;
    if (!actor) {
      setError(
        care?.testMode || personal?.testMode
          ? "chooseTestRole"
          : "AUTH_REQUIRED",
      );
      return null;
    }
    if (owner.current !== actor) return null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await careFetch(path, {
        subject: actor,
        ...body,
      });
      if (owner.current !== actor) return null;
      setNotice(t("saved"));
      refresh();
      await load();
      return result;
    } catch (e) {
      if (owner.current === actor) setError(e.message);
      return null;
    } finally {
      if (owner.current === actor) setBusy(false);
    }
  }
  async function connectGoogle() {
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({
        url: location.origin + "/account/calendar?native_setup=1",
      });
      return;
    }
    const result = await act("/api/rental-care/google/connect", {
      native: Capacitor.isNativePlatform(),
      returnToApp,
    });
    if (result?.url) {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: result.url });
      } else location.assign(result.url);
    }
  }
  async function chooseDevice() {
    setError("");
    try {
      if (
        !Capacitor.isNativePlatform() ||
        !Capacitor.isPluginAvailable("RelooCalendar")
      )
        throw Error("deviceUnavailable");
      const permission = await nativeCalendar.requestPermission();
      if (!permission.granted) throw Error("REAUTH");
      const data = await nativeCalendar.calendars();
      setCalendars(data.calendars || []);
      setDevice(data.device);
      if (!data.calendars?.length) throw Error("noCalendar");
    } catch (e) {
      setError(e.message);
    }
  }
  async function saveDevice() {
    const calendar = calendars.find((c) => c.id === selected);
    if (!calendar) return;
    const created = await act("/api/rental-care", {
      action: "device",
      device,
      calendar: calendar.id,
      name: calendar.name,
      independent: true,
      confirmSwitch: switchTarget,
    });
    if (created?.id)
      await act("/api/rental-care", {
        action: "activate",
        id: created.id,
        confirmSwitch: switchTarget,
        dual,
        confirmDual: dual,
        locale,
      });
  }
  return (
    <section className="rc-settings" lang={locale}>
      <div className="rc-top">
        <Link href="/account">{t("account")}</Link>
        
      </div>
      {(care?.testMode || personal?.testMode) && (
        <div className="rc-test">
          <strong>{t("test")}</strong>
          <select
            aria-label={t("testActor")}
            value={care?.actor || personal?.actor || ""}
            disabled={busy}
            onChange={async (e) => {
              const nextActor = e.target.value;
              setBusy(true);
              setError("");
              try {
                await careFetch("/api/neighborhood/test-session", {
                  actor: nextActor,
                });
                refresh();
                await load();
              } catch (error) {
                setError(error.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <option value="" disabled>
              {t("chooseTestRole")}
            </option>
            {[
              ["nk-test-renter", "renter"],
              ["nk-test-owner", "owner"],
              ["nk-test-renter2", "second"],
            ].map(([id, label]) => (
              <option key={id} value={id}>
                {t(label)}
              </option>
            ))}
          </select>
        </div>
      )}
      <header>
        <span className="rc-eyebrow">RELOO</span>
        <h1>{t(mode === "calendar" ? "title" : "personalTitle")}</h1>
        <p>{t(mode === "calendar" ? "intro" : "personalHint")}</p>
      </header>
      <CareAccountLinks locale={locale} />
      {returnToApp && (
        <a className="rc-secondary" href="reloo://calendar">
          {t("returnToApp")}
        </a>
      )}
      {error && (
        <div role="alert" className="rc-error">
          {t(error)}{" "}
          {error === "AUTH_REQUIRED" ? (
            <Link
              href={
                "/auth?next=" +
                encodeURIComponent(
                  "/account/" +
                    (mode === "calendar" ? "calendar" : "personalization"),
                )
              }
            >
              {t("login")}
            </Link>
          ) : (
            <button onClick={load}>{t("reload")}</button>
          )}
        </div>
      )}
      {notice && (
        <p role="status" className="rc-success">
          {notice}
        </p>
      )}
      {!care && !personal && !error && <p role="status">{t("loading")}</p>}
      {ownData &&
        mode === "calendar" &&
        care &&
        (!care.enabled ? (
          <p>{t("featureOff")}</p>
        ) : (
          <>
            <div className="rc-grid">
              <article className="rc-panel">
                <CalendarDays size={28} />
                <h2>{t("google")}</h2>
                <p>{t("googleHint")}</p>
                <p>{t("nativeBrowserHint")}</p>
                <p className="rc-muted">{t("phoneHint")}</p>
                <button
                  className="rc-primary"
                  disabled={busy || !care.googleConfigured || care.testMode}
                  onClick={connectGoogle}
                >
                  {busy ? t("busy") : t("connect")}
                </button>
                {!care.googleConfigured && <p>{t("notConfigured")}</p>}
              </article>
              <article className="rc-panel">
                <h2>{t("device")}</h2>
                <p>{t("deviceHint")}</p>
                <p className="rc-muted">{t("localLimit")}</p>
                <button
                  className="rc-secondary"
                  disabled={busy || !native || !calendarAvailable()}
                  onClick={chooseDevice}
                >
                  {t("chooseDevice")}
                </button>
                {!native && <p>{t("deviceUnavailable")}</p>}
                {calendars.length > 0 && (
                  <>
                    <label>
                      {t("choose")}
                      <select
                        value={selected}
                        onChange={(e) => setSelected(e.target.value)}
                      >
                        <option value="">{t("choose")}</option>
                        {calendars.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="rc-primary"
                      disabled={!selected || busy}
                      onClick={saveDevice}
                    >
                      {t("saveDevice")}
                    </button>
                  </>
                )}
              </article>
            </div>
            <p>
              <strong>{t("registered")}:</strong> {care.registeredEmail || "—"}
            </p>
            {care.connections?.length > 0 && (
              <label className="rc-check">
                <input
                  type="checkbox"
                  checked={switchTarget}
                  onChange={(e) => setSwitch(e.target.checked)}
                />
                {t("switch")}
              </label>
            )}
            {care.connections?.length > 0 && (
              <label className="rc-check">
                <input
                  type="checkbox"
                  checked={dual}
                  onChange={(e) => setDual(e.target.checked)}
                />
                {t("dualTarget")}
              </label>
            )}
            {!care.connections?.length && <p>{t("none")}</p>}
            {care.connections?.map((c) => (
              <article className="rc-panel rc-connection" key={c.id}>
                <div>
                  <h2>
                    {t("target")}: {c.email || c.calendar_name || t("device")}
                  </h2>
                  <span
                    className={"rc-status rc-status--" + c.status.toLowerCase()}
                  >
                    {t(c.status)}
                  </span>
                  <p>{c.calendar_name || t("none")}</p>
                  {c.provider === "DEVICE" && (
                    <p className="rc-muted">{t("deviceScoped")}</p>
                  )}
                  <small>
                    {c.last_sync_at
                      ? t("lastSync") +
                        ": " +
                        new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Ho_Chi_Minh",
                        }).format(new Date(c.last_sync_at))
                      : t("notSynced")}
                  </small>
                </div>
                {c.status === "PENDING" && (
                  <div>
                    {c.provider === "GOOGLE" &&
                      (!care.emailVerified ||
                        c.email?.toLowerCase() !==
                          care.registeredEmail?.toLowerCase()) && (
                        <label className="rc-check">
                          <input
                            type="checkbox"
                            checked={other}
                            onChange={(e) => setOther(e.target.checked)}
                          />
                          {t("different")}
                        </label>
                      )}
                    <button
                      className="rc-primary"
                      disabled={busy}
                      onClick={() =>
                        act("/api/rental-care", {
                          action: "activate",
                          id: c.id,
                          confirmOther: other,
                          confirmSwitch: switchTarget,
                          dual,
                          confirmDual: dual,
                          locale,
                        })
                      }
                    >
                      {t("confirm")}
                    </button>
                  </div>
                )}
                {["FAILED", "REVIEW"].includes(c.status) && (
                  <button
                    className="rc-secondary"
                    disabled={busy}
                    onClick={() =>
                      act("/api/rental-care", { action: "retry", id: c.id })
                    }
                  >
                    <RefreshCw size={16} />
                    {t("retry")}
                  </button>
                )}
                {c.status === "REAUTH" && <p>{t("CALENDAR_PERMISSION")}</p>}
                <button
                  className="rc-text"
                  disabled={busy}
                  onClick={() =>
                    act("/api/rental-care", { action: "disconnect", id: c.id })
                  }
                >
                  {t("disconnect")}
                </button>
              </article>
            ))}
            <section className="rc-panel">
              <h2>{t("returnAction")}</h2>
              <form
                key={care.actor + ":" + care.preferences.return_action}
                onSubmit={(e) => {
                  e.preventDefault();
                  act("/api/rental-care", {
                    action: "preferences",
                    returnAction: new FormData(e.currentTarget).get(
                      "returnAction",
                    ),
                    locale,
                  });
                }}
              >
                <label>
                  <select
                    name="returnAction"
                    defaultValue={care.preferences.return_action}
                  >
                    <option value="KEEP">{t("keep")}</option>
                    <option value="DELETE">{t("delete")}</option>
                  </select>
                </label>
                <button className="rc-secondary" disabled={busy}>
                  {t("save")}
                </button>
              </form>
            </section>
            {care.events?.length > 0 && (
              <div className="rc-sync-list">
                {care.events.map((e) => (
                  <span key={e.id}>{t(e.status)}</span>
                ))}
              </div>
            )}
          </>
        ))}
      {ownData &&
        mode === "personalization" &&
        personal &&
        (!personal.available ? (
          <p>{t("featureOff")}</p>
        ) : (
          <section className="rc-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                act("/api/personalization", {
                  action: "preferences",
                  enabled: f.get("enabled") === "on",
                  categories: f.getAll("category"),
                });
              }}
              key={
                personal.actor +
                ":" +
                String(personal.enabled) +
                personal.epoch +
                ":" +
                personal.revision
              }
            >
              <label className="rc-check">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={personal.enabled}
                  disabled={busy}
                />
                <strong>{t("learnFromActivity")}</strong>
              </label>
              <p>{t("offHint")}</p>
              <fieldset disabled={busy}>
                <legend>{t("categories")}</legend>
                <div className="rc-category-grid">
                  {CATEGORIES.map(category => {const id=category.id;return (
                    <label className="rc-check" key={id}>
                      <input
                        type="checkbox"
                        name="category"
                        onChange={e=>{if(e.currentTarget.form.querySelectorAll('input[name="category"]:checked').length>5){e.currentTarget.checked=false;setError(t("categories"));}else setError("");}}
                        value={id}
                        defaultChecked={personal.categories?.includes(id)}
                      />
                      {setupCategoryName(category,locale)}
                    </label>
                  );})}
                </div>
              </fieldset>
              <button className="rc-primary" disabled={busy}>
                {t("save")}
              </button>
            </form>
            <div className="rc-reset">
              <p>{t("resetHint")}</p>
              {["clear", "reset"].map((action) => (
                <button
                  className="rc-secondary"
                  key={action}
                  disabled={busy}
                  onClick={() => setConfirmReset(action)}
                >
                  {t(action)}
                </button>
              ))}
            </div>
          </section>
        ))}
      {ownData &&
        mode === "personalization" &&
        personal?.exclusions?.length > 0 && (
          <section className="rc-panel">
            <h2>{t("hiddenPreferences")}</h2>
            {personal.exclusions.map((x) => (
              <div className="rc-connection" key={x.kind + ":" + x.target}>
                <span>
                  {x.kind === "CATEGORY"
                    ? categoryText(locale, "category:" + x.target)
                    : x.label || t("hiddenEntry")}
                </span>
                <button
                  className="rc-secondary"
                  disabled={busy}
                  onClick={() =>
                    act("/api/personalization", {
                      action: "exclude",
                      kind: x.kind,
                      target: x.target,
                      enabled: false,
                    })
                  }
                >
                  {t("unblock")}
                </button>
              </div>
            ))}
          </section>
        )}
      {ownData &&
        mode === "personalization" &&
        personal?.available &&
        personal.actor && <Recommendations locale={locale} allowGlobal />}
      {confirmReset && (
        <dialog
          className="rc-onboarding"
          ref={confirmDialog}
          aria-labelledby="rc-reset-title"
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setConfirmReset(null);
          }}
        >
          <h2 id="rc-reset-title">{t(confirmReset)}</h2>
          <p>{t(confirmReset === "clear" ? "clearHint" : "resetHint")}</p>
          {error && (
            <p role="alert" className="rc-error">
              {t(error)}
            </p>
          )}
          <button
            className="rc-secondary"
            disabled={busy}
            onClick={() => setConfirmReset(null)}
          >
            {t("close")}
          </button>
          <button
            className="rc-primary"
            disabled={busy}
            onClick={async () => {
              const saved = await act("/api/personalization", {
                action: "clear",
                all: confirmReset === "reset",
              });
              if (saved) setConfirmReset(null);
            }}
          >
            {busy ? t("busy") : t(confirmReset)}
          </button>
        </dialog>
      )}
      <aside className="rc-privacy">
        <ShieldCheck size={22} />
        <div>
          <h2>{t("privacy")}</h2>
          <p>{t("privacyHint")}</p>
          {mode === "calendar" && <p>{t("alarmHint")}</p>}
        </div>
      </aside>
    </section>
  );
}
