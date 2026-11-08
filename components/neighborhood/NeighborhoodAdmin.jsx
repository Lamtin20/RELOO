"use client";
import {useLocale} from '@/components/settings/LocaleProvider';

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  Building2,
  ShieldCheck,
  Database,
  ClipboardList,
} from "lucide-react";
import {
  neighborhoodApi,
  Field,
  NeighborhoodModal,
  SimpleForm,
  AreaMap,
  NeighborhoodImage,
} from "./Neighborhood";
import { text } from "@/lib/neighborhood/content";
import { dateTime } from "@/lib/neighborhood/domain";
export function NeighborhoodAdmin() {
  const {locale}=useLocale();
  const [data, setData] = useState(null),
    [tab, setTab] = useState("catalog"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState(null),
    [secret, setSecret] = useState("");
  const t = (k) => text(locale, k);
  const load = useCallback(async () => {
    try {
      setData(await neighborhoodApi("admin", {}, null, true, locale));
      setError("");
    } catch (e) {
      setError(e.code || "SERVICE_UNAVAILABLE");
    }
  }, [locale]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  async function save(action, payload) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await neighborhoodApi(
        "",
        {},
        { key: crypto.randomUUID(), action, data: payload },
        true,
        locale,
      );
      if (r.secret) setSecret(r.secret);
      setModal(null);
      setNotice(t("saved"));
      await load();
      return r;
    } catch (e) {
      setError(e.code || e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }
  function decision(action, payload, title) {
    setModal({ kind: "decision", title, action, payload });
  }
  return (
    <section className="nk-page nk-admin" lang={locale}>
      <div className="nk-section-heading">
        <div>
          <h2>{t("admin")}</h2>
          <p>{t("policyHint")}</p>
        </div>
        <div className="nk-row-actions">
          
          <button className="nk-secondary" onClick={load}>
            <RefreshCw size={16} />
            {t("reload")}
          </button>
        </div>
      </div>
      {data?.testMode && <div className="nk-test">{t("testMode")}</div>}
      {error && (
        <p className="nk-error" role="alert">
          {t(error)}
        </p>
      )}
      {notice && (
        <p role="status" className="nk-notice">
          {notice}
        </p>
      )}
      {secret && (
        <div className="nk-notice">
          <p>{t("inviteCreated")}</p>
          <output className="nk-private-code">{secret}</output>
          <button onClick={() => setSecret("")}>{t("close")}</button>
        </div>
      )}
      <nav className="nk-tabs" aria-label={t("admin")}>
        {[
          ["catalog", Building2],
          ["reviews", ShieldCheck],
          ["sources", Database],
          ["jobs", ClipboardList],
          ["audit", ClipboardList],
        ].map(([key, Icon]) => (
          <button
            key={key}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => setTab(key)}
          >
            <Icon size={16} />
            {t(key)}
          </button>
        ))}
      </nav>
      {tab === "catalog" && (
        <>
          <div className="nk-row-actions">
            <button
              className="nk-primary"
              onClick={() => setModal({ kind: "place" })}
            >
              <Plus size={17} />
              {t("catalog")}
            </button>
            <button
              className="nk-secondary"
              onClick={() => setModal({ kind: "policy" })}
            >
              {t("publishPolicy")}
            </button>
            <button
              className="nk-secondary"
              onClick={() => setModal({ kind: "promotion" })}
            >
              {t("promotions")}
            </button>
            <button
              className="nk-secondary"
              onClick={() => setModal({ kind: "invite" })}
            >
              {t("inviteCreate")}
            </button>
          </div>
          <div className="nk-admin-grid">
            {data?.places?.map((p) => (
              <article className="nk-admin-card" key={p.id}>
                <div className="nk-row">
                  <h3>{p.name}</h3>
                  <span className="nk-badge">{t(p.kind + "_KIND")}</span>
                </div>
                <small>{p.id}</small>
                <p>{p.address_normalized}</p>
                <p>
                  {t(p.status + "_PLACE")} · {t("confidence")}: {p.confidence} ·{" "}
                  {t("sourceVersion")}: {p.source_version || p.version}
                </p>
                <small>
                  {t("source")}:{" "}
                  {data.sources.find((s) => s.id === p.source_id)?.name}
                </small>
                <div className="nk-row-actions">
                  <button
                    className="nk-secondary"
                    onClick={() => setModal({ kind: "place", place: p })}
                  >
                    {t("edit")}
                  </button>
                  {p.status === "PENDING" && (
                    <button
                      className="nk-primary"
                      onClick={() =>
                        decision(
                          "ADMIN_PLACE_REVIEW",
                          { id: p.id, decision: "ACTIVE" },
                          "approve",
                        )
                      }
                    >
                      {t("approve")}
                    </button>
                  )}
                  <button
                    className="nk-secondary"
                    onClick={() =>
                      decision(
                        "ADMIN_LOCK",
                        { id: p.id, locked: !p.admin_locked },
                        "lock",
                      )
                    }
                  >
                    {p.admin_locked ? t("unlock") : t("lock")}
                  </button>
                  <button
                    className="nk-secondary"
                    onClick={() => setModal({ kind: "merge", place: p })}
                  >
                    {t("merge")}
                  </button>
                  {p.kind === "AREA" && (
                    <button
                      className="nk-secondary"
                      onClick={() =>
                        decision(
                          "ADMIN_ENABLE",
                          { id: p.id, enabled: !p.enabled },
                          p.enabled ? "disable" : "enable",
                        )
                      }
                    >
                      {t(p.enabled ? "disable" : "enable")}
                    </button>
                  )}
                </div>
                <details>
                  <summary>{t("map")}</summary>
                  <AreaMap places={[p]} t={t} />
                </details>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "reviews" && (
        <>
          <h3>{t("verificationQueue")}</h3>
          {data?.memberships?.map((m) => (
            <article className="nk-admin-card" key={m.id}>
              <h3>{data.places.find((p) => p.id === m.area_id)?.name}</h3>
              <p>
                {m.profile_id} ·{" "}
                {data.places.find((p) => p.id === m.building_id)?.name}
              </p>
              <span className="nk-badge">{t(m.status)}</span>
              {data.verifications
                ?.filter((v) => v.membership_id === m.id)
                .map((v) => (
                  <p key={v.id}>{v.note}</p>
                ))}
              <div className="nk-row-actions">
                {["VERIFIED", "REJECTED", "REVOKED", "REVERIFY"].map(
                  (status) => (
                    <button
                      className="nk-secondary"
                      key={status}
                      onClick={() =>
                        decision("ADMIN_VERIFY", { id: m.id, status }, status)
                      }
                    >
                      {t(status)}
                    </button>
                  ),
                )}
              </div>
            </article>
          ))}
          <h3>{t("myListings")}</h3>
          {data?.listings?.map((l) => (
            <article key={l.asset_id} className="nk-admin-card">
              <h3>{l.title}</h3>
              <p>
                {l.owner_id} · {t(l.scope)}
              </p>
              <div className="nk-row-actions">
                {["ACTIVE", "REJECTED"].map((status) => (
                  <button
                    className="nk-secondary"
                    key={status}
                    onClick={() =>
                      decision(
                        "ADMIN_LISTING",
                        { asset: l.asset_id, status },
                        status === "ACTIVE" ? "approve" : "reject",
                      )
                    }
                  >
                    {t(status === "ACTIVE" ? "approve" : "reject")}
                  </button>
                ))}
              </div>
            </article>
          ))}
          <h3>{t("reviewChanges")}</h3>
          {data?.changes?.map((c) => (
            <article key={c.id} className="nk-admin-card">
              <h3>{c.proposal.name}</h3>
              <p>{c.proposal.address}</p>
              <small>
                {t("externalId")}: {c.external_id}
              </small>
              <pre>{JSON.stringify(c.proposal, null, 2)}</pre>
              <div className="nk-row-actions">
                {["APPROVED", "REJECTED"].map((decisionCode) => (
                  <button
                    key={decisionCode}
                    className="nk-secondary"
                    onClick={() =>
                      decision(
                        "ADMIN_CHANGE",
                        { id: c.id, decision: decisionCode },
                        decisionCode === "APPROVED" ? "approve" : "reject",
                      )
                    }
                  >
                    {t(decisionCode === "APPROVED" ? "approve" : "reject")}
                  </button>
                ))}
              </div>
            </article>
          ))}
          <h3>{t("dispute")}</h3>
          {data?.disputes?.map((d) => (
            <article key={d.id} className="nk-admin-card">
              <p>{d.note}</p>
              {d.images?.map((src) => (
                <NeighborhoodImage
                  className="nk-need-image"
                  key={src}
                  src={src.replace(
                    "/api/neighborhood/evidence/",
                    "/api/crm/neighborhood/evidence/",
                  )}
                  alt={t("evidence")}
                />
              ))}
              <small>{d.order_id}</small>
              <button
                onClick={() =>
                  decision("RESOLVE", { id: d.order_id }, "RESOLVE")
                }
              >
                {t("RESOLVE")}
              </button>
            </article>
          ))}
          {!data?.memberships?.length &&
            !data?.listings?.length &&
            !data?.changes?.length &&
            !data?.disputes?.length && (
              <p className="nk-empty">{t("nothing")}</p>
            )}
        </>
      )}
      {tab === "sources" && (
        <>
          <button
            className="nk-primary"
            onClick={() => setModal({ kind: "source" })}
          >
            <Plus size={17} />
            {t("source")}
          </button>
          <p>{t("sourceHint")}</p>
          {data?.sources?.map((s) => (
            <article key={s.id} className="nk-admin-card">
              <h3>{s.name}</h3>
              <p>
                {s.provider} · {s.id}
              </p>
              <p>{s.terms}</p>
              <p>{s.attribution}</p>
              <small>
                {t("lastSuccess")}:{" "}
                {s.last_success
                  ? dateTime(s.last_success, locale)
                  : t("nothing")}{" "}
                · {t("lastError")}: {s.last_error || t("NONE")}
              </small>
              <button
                className="nk-secondary"
                onClick={() => setModal({ kind: "source", source: s })}
              >
                {t("edit")}
              </button>
              {s.enabled && s.provider === "PARTNER_JSON" && (
                <button
                  className="nk-secondary"
                  onClick={() => decision("ADMIN_SYNC", { id: s.id }, "sync")}
                >
                  {t("sync")}
                </button>
              )}
            </article>
          ))}
          {data?.syncRuns?.map((r) => (
            <p key={r.id} className="nk-muted">
              {dateTime(r.started_at, locale)} · {r.status} · {r.imported} ·{" "}
              {r.result_code}
            </p>
          ))}
        </>
      )}
      {tab === "jobs" && (
        <>
          {data?.jobs?.map((j) => (
            <article className="nk-admin-card" key={j.id}>
              <div className="nk-row">
                <strong>{j.event}</strong>
                <span className="nk-badge">{j.status}</span>
              </div>
              <p>
                {j.id} · {j.attempts} · {j.last_error}
              </p>
              {["FAILED", "DEAD"].includes(j.status) && (
                <button
                  className="nk-secondary"
                  onClick={() =>
                    decision("ADMIN_RETRY", { id: j.id }, "retryJob")
                  }
                >
                  {t("retryJob")}
                </button>
              )}
            </article>
          ))}
        </>
      )}
      {tab === "audit" && (
        <>
          {data?.audit?.map((a) => (
            <article className="nk-admin-card" key={a.id}>
              <div className="nk-row">
                <strong>{a.action}</strong>
                <time>{dateTime(a.created_at, locale)}</time>
              </div>
              <p>{a.reason}</p>
              <small>
                {a.actor_id} · {a.resource_id} · {a.correlation_id}
              </small>
            </article>
          ))}
        </>
      )}
      {modal && (
        <NeighborhoodModal
          closeLabel={t("close")}
          title={t(
            modal.title ||
              {
                place: "catalog",
                source: "source",
                policy: "publishPolicy",
                invite: "inviteCreate",
                merge: "merge",
                promotion: "promotions",
              }[modal.kind],
          )}
          busy={busy}
          onClose={() => setModal(null)}
        >
          {error && <p className="nk-error">{t(error)}</p>}
          {modal.kind === "decision" && (
            <SimpleForm
              t={t}
              busy={busy}
              fields={[["reason", "textarea", true]]}
              submit={(d) =>
                save(modal.action, { ...modal.payload, reason: d.reason })
              }
            />
          )}
          {modal.kind === "merge" && (
            <SimpleForm
              t={t}
              busy={busy}
              fields={[
                ["mergeTarget", "text", true],
                ["reason", "textarea", true],
              ]}
              submit={(d) =>
                save("ADMIN_MERGE", {
                  id: modal.place.id,
                  target: d.mergeTarget,
                  reason: d.reason,
                })
              }
            />
          )}
          {modal.kind === "place" && (
            <AdminPlace
              data={data}
              place={modal.place}
              t={t}
              busy={busy}
              save={save}
            />
          )}
          {modal.kind === "policy" && (
            <AdminPolicy data={data} t={t} busy={busy} save={save} />
          )}
          {modal.kind === "promotion" && (
            <AdminPromotion data={data} t={t} busy={busy} save={save} />
          )}
          {modal.kind === "source" && (
            <AdminSource t={t} busy={busy} save={save} source={modal.source} />
          )}
          {modal.kind === "invite" && (
            <form
              className="nk-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                save("ADMIN_INVITE", {
                  area: f.get("area"),
                  building: f.get("building"),
                  profile: f.get("profile"),
                  hours: Number(f.get("hours")),
                  reason: f.get("reason"),
                });
              }}
            >
              <AreaSelect data={data} t={t} />
              <Field label={t("building")}>
                <select name="building">
                  <option value="">{t("any")}</option>
                  {data.places
                    .filter((p) => p.kind === "BUILDING")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t("profileId")}>
                <input name="profile" maxLength={150} />
              </Field>
              <Field label={t("inviteHours")}>
                <input
                  name="hours"
                  type="number"
                  min="1"
                  max="168"
                  defaultValue="24"
                  required
                />
              </Field>
              <Reason t={t} />
              <button className="nk-primary" disabled={busy}>
                {t("inviteCreate")}
              </button>
            </form>
          )}
        </NeighborhoodModal>
      )}
    </section>
  );
}
function Reason({ t }) {
  return (
    <Field label={t("adminReason")}>
      <textarea name="reason" required minLength={5} maxLength={1000} />
    </Field>
  );
}
function AreaSelect({ data, t }) {
  return (
    <Field label={t("area")}>
      <select name="area" required>
        <option value="">{t("choose")}</option>
        {data?.places
          ?.filter((p) => p.kind === "AREA" && p.status === "ACTIVE")
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>
    </Field>
  );
}
function AdminPlace({ data, place, t, busy, save }) {
  const [error, setError] = useState("");
  return (
    <form
      className="nk-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        try {
          const f = Object.fromEntries(new FormData(e.currentTarget));
          save("ADMIN_PLACE", {
            ...f,
            kind: place?.kind || f.kind,
            ...(place ? { id: place.id } : {}),
            aliases: f.aliases.split("\n").filter(Boolean),
            geometry: f.geometry ? JSON.parse(f.geometry) : null,
            administrative: f.administrative
              ? JSON.parse(f.administrative)
              : place?.administrative || {},
            confidence: Number(f.confidence),
          });
        } catch {
          setError("INVALID_GEOMETRY");
        }
      }}
    >
      <Field label={t("kind")}>
        <select
          name="kind"
          disabled={!!place}
          defaultValue={place?.kind || "AREA"}
        >
          {["AREA", "SUBZONE", "BUILDING", "HANDOVER"].map((k) => (
            <option value={k} key={k}>
              {t(k + "_KIND")}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("parent")}>
        <select name="parent" defaultValue={place?.parent_id || ""}>
          <option value="">{t("any")}</option>
          {data?.places
            ?.filter((p) => p.kind !== "HANDOVER" && p.status === "ACTIVE")
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </Field>
      {[
        ["name", "name"],
        ["address", "address_normalized"],
        ["addressRaw", "address_raw"],
      ].map(([k, field]) => (
        <Field key={k} label={t(k)}>
          <input
            name={k}
            required={k === "name"}
            defaultValue={place?.[field] || ""}
          />
        </Field>
      ))}
      <Field label={t("aliases")}>
        <textarea name="aliases" defaultValue={place?.aliases?.join("\n")} />
      </Field>
      <Field label={t("source")}>
        <select
          name="source"
          defaultValue={
            place?.source_id || "00000000-0000-4000-8000-000000000001"
          }
        >
          {data?.sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="nk-form-grid">
        <Field label={t("externalId")}>
          <input name="externalId" defaultValue={place?.external_id || ""} />
        </Field>
        <Field label={t("sourceVersion")}>
          <input
            name="sourceVersion"
            defaultValue={place?.source_version || ""}
          />
        </Field>
      </div>
      <Field label={t("geo")}>
        <textarea
          name="geometry"
          defaultValue={place?.geometry ? JSON.stringify(place.geometry) : ""}
        />
      </Field>
      <Field label={t("administrative")}>
        <textarea
          name="administrative"
          defaultValue={JSON.stringify(place?.administrative || {})}
        />
      </Field>
      <Field label={t("confidence")}>
        <input
          name="confidence"
          type="number"
          min="0"
          max="1"
          step="0.01"
          defaultValue={place?.confidence || 0}
        />
      </Field>
      <Reason t={t} />
      {error && <p className="nk-error">{t(error)}</p>}
      <button disabled={busy} className="nk-primary">
        {t("save")}
      </button>
    </form>
  );
}
function AdminPolicy({ data, t, busy, save }) {
  return (
    <form
      className="nk-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save("ADMIN_POLICY", {
          area: f.get("area"),
          terms: { "vi-VN": f.get("vi"), "en-US": f.get("en") },
          feeBps: Number(f.get("feeBps")),
          holdMinutes: Number(f.get("holdMinutes")),
          paymentMinutes: Number(f.get("paymentMinutes")),
          cancelBeforeHours: Number(f.get("cancelBeforeHours")),
          reason: f.get("reason"),
        });
      }}
    >
      <AreaSelect data={data} t={t} />
      <Field label={t("policyTerms") + " · " + t("vietnamese")}>
        <textarea required minLength={30} name="vi" />
      </Field>
      <Field label={t("policyTerms") + " · " + t("english")}>
        <textarea required minLength={30} name="en" />
      </Field>
      {[
        ["feeBps", 0, 10000],
        ["holdMinutes", 30, 1440],
        ["paymentMinutes", 30, 1440],
        ["cancelBeforeHours", 24, 720],
      ].map(([key, value, max]) => (
        <Field
          key={key}
          label={t(key === "cancelBeforeHours" ? "cancelBefore" : key)}
        >
          <input
            type="number"
            min="0"
            max={max}
            required
            defaultValue={value}
            name={key}
          />
        </Field>
      ))}
      <Reason t={t} />
      <button disabled={busy} className="nk-primary">
        {t("publishPolicy")}
      </button>
    </form>
  );
}
function AdminSource({ t, busy, save, source }) {
  return (
    <form
      className="nk-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save("ADMIN_SOURCE", {
          ...(source ? { id: source.id } : {}),
          name: f.get("name"),
          provider: f.get("provider"),
          feedUrl: f.get("feedUrl"),
          terms: f.get("terms"),
          attribution: f.get("attribution"),
          syncMinutes: Number(f.get("syncMinutes")),
          enabled: f.get("enabled") === "on",
          storageAllowed: f.get("storageAllowed") === "on",
          reason: f.get("reason"),
        });
      }}
    >
      <p>{t("sourceHint")}</p>
      <Field label={t("sourceName")}>
        <input name="name" required defaultValue={source?.name || ""} />
      </Field>
      <Field label={t("provider")}>
        <select name="provider" defaultValue={source?.provider || "MANUAL"}>
          <option value="MANUAL">{t("manualSource")}</option>
          <option value="PARTNER_JSON">{t("partnerSource")}</option>
        </select>
      </Field>
      <Field label={t("feedUrl")}>
        <input
          type="url"
          name="feedUrl"
          defaultValue={source?.feed_url || ""}
        />
      </Field>
      <Field label={t("sourceTerms")}>
        <textarea
          name="terms"
          required
          minLength={20}
          defaultValue={source?.terms || ""}
        />
      </Field>
      <Field label={t("attribution")}>
        <input
          name="attribution"
          required
          defaultValue={source?.attribution || ""}
        />
      </Field>
      <Field label={t("syncMinutes")}>
        <input
          name="syncMinutes"
          type="number"
          min="60"
          max="43200"
          defaultValue={source?.sync_minutes || 1440}
        />
      </Field>
      <label className="nk-check">
        <input
          type="checkbox"
          required
          name="storageAllowed"
          defaultChecked={source?.storage_allowed}
        />
        {t("storageAllowed")}
      </label>
      <label className="nk-check">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={source?.enabled}
        />
        {t("enable")}
      </label>
      <Reason t={t} />
      <button className="nk-primary" disabled={busy}>
        {t("save")}
      </button>
    </form>
  );
}

function AdminPromotion({ data, t, busy, save }) {
  return (
    <form
      className="nk-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        save("ADMIN_PROMOTION", {
          area: f.get("area"),
          title: { "vi-VN": f.get("vi"), "en-US": f.get("en") },
          terms: {
            "vi-VN": text("vi-VN", "promotionTerms"),
            "en-US": text("en-US", "promotionTerms"),
          },
          amount: Number(f.get("amount")),
          budget: Number(f.get("budget")),
          expires: new Date(f.get("expires") + ":00+07:00").toISOString(),
          enabled: f.get("enabled") === "on",
          reason: f.get("reason"),
        });
      }}
    >
      <AreaSelect data={data} t={t} />
      <Field label={t("name") + " · " + t("vietnamese")}>
        <input name="vi" required minLength={3} />
      </Field>
      <Field label={t("name") + " · " + t("english")}>
        <input name="en" required minLength={3} />
      </Field>
      <Field label={t("promotionAmount")}>
        <input type="number" name="amount" min="1" max="1000000000" required />
      </Field>
      <Field label={t("promotionBudget")}>
        <input type="number" name="budget" min="1" max="1000000000" required />
      </Field>
      <Field label={t("expires")}>
        <input type="datetime-local" name="expires" required />
      </Field>
      <p>{t("promotionTerms")}</p>
      <label className="nk-check">
        <input name="enabled" type="checkbox" />
        {t("enable")}
      </label>
      <Reason t={t} />
      <button className="nk-primary" disabled={busy}>
        {t("save")}
      </button>
    </form>
  );
}
