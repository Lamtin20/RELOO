import {
  careAccount,
  careError,
  safeResponse,
  bodyFor,
  rpc,
  personalEnabled,
  anonymousCareTest,
} from "@/lib/rental-care/server";
import { validateEvent, rankProducts } from "@/lib/personalization/domain";
import { CATEGORIES } from "@/lib/constants";
export async function GET(request) {
  try {
    if (!personalEnabled())
      return safeResponse({ available: false, enabled: false });
    if (await anonymousCareTest(request))
      return safeResponse({
        available: true,
        enabled: false,
        testMode: true,
        actor: null,
        epoch: 1,
        categories: [],
      });
    const { profile, db, testMode } = await careAccount(request),
      c = await rpc(db, "reloo_pp_declared_context", { p_actor: profile.id });
    return safeResponse({
      available: true,
      actor: profile.id,
      enabled: c.enabled,
      epoch: c.epoch,
      revision: c.revision,
      signalRevision: c.signalRevision,
      rankingWindow: Math.floor(Date.now() / 3600000),
      configurationRevision: c.config?.revision || 1,
      categories: c.categories,
      manualCategories: c.manualCategories,
      onboardingSeen: c.onboardingSeen,
      exclusions: c.exclusions,
      testMode: !!testMode,
    });
  } catch (e) {
    return careError(e);
  }
}
export async function POST(request) {
  try {
    if (!personalEnabled()) throw Error("FEATURE_DISABLED");
    const account = await careAccount(request),
      { profile, db } = account,
      b = await bodyFor(request, account);
    const fields = {
      preferences: ["enabled", "categories", "reset"],
      interests: ["categories", "skip"],
      event: ["event"],
      exclude: ["kind", "target", "enabled"],
      clear: ["all"],
      recommend: ["ids", "category", "province", "start", "end", "allowGlobal"],
    };
    if (
      !Object.hasOwn(fields, b.action) ||
      Object.keys(b).some(
        (k) => !["action", "subject", ...fields[b.action]].includes(k),
      )
    )
      throw Error("INVALID_INPUT");
    if (b.action === "preferences" || b.action === "interests") {
      if (
        (b.action === "preferences" && typeof b.enabled !== "boolean") ||
        (b.action === "interests" && typeof b.skip !== "boolean") ||
        !Array.isArray(b.categories) ||
        b.categories.length > 5 ||
        b.categories.some(
          (c) => !CATEGORIES.some((category) => category.id === c),
        )
      )
        throw Error("INVALID_INPUT");
      if(b.action==='interests'&&!b.skip){await rpc(db,'reloo_pp_declared_set',{p_actor:profile.id,p_categories:b.categories});return safeResponse({ok:true,categories:b.categories,onboardingSeen:true});}
      const c = await rpc(db, "reloo_pp_declared_preferences", {
        p_actor: profile.id,
        p_enabled: b.action==='interests'?false:b.enabled,
        p_categories: b.action==='interests'?[]:b.categories,
        p_reset: b.reset === true,
      });
      return safeResponse({
        enabled: c.enabled,
        epoch: c.epoch,
        categories: c.categories,
      });
    }
    if (b.action === "event") {
      const event = validateEvent(b.event);
      if (!event) return safeResponse({ result: "IGNORED" });
      return safeResponse({
        result: await rpc(db, "reloo_pp_record", {
          p_actor: profile.id,
          p_event: event.id,
          p_version: event.version,
          p_epoch: event.epoch,
          p_kind: event.kind,
          p_asset: event.asset || null,
          p_category: event.category || null,
          p_at: event.at,
          p_topic: event.topic,
        }),
      });
    }
    if (b.action === "clear")
      return safeResponse(
        await rpc(db, "reloo_pp_declared_clear", {
          p_actor: profile.id,
          p_all: b.all === true,
        }),
      );
    if (b.action === "exclude") {
      if (
        !["PRODUCT", "CATEGORY", "OWNER"].includes(b.kind) ||
        typeof b.target !== "string" ||
        b.target.length > 150 ||
        typeof b.enabled !== "boolean"
      )
        throw Error("INVALID_INPUT");
      await rpc(db, "reloo_pp_exclude", {
        p_actor: profile.id,
        p_kind: b.kind,
        p_target: b.target,
        p_enabled: b.enabled,
      });
      return safeResponse({ ok: true });
    }
    if (b.action === "recommend") {
      if (
        !Array.isArray(b.ids) ||
        b.ids.length > 300 ||
        b.ids.some((id) => typeof id !== "string" || id.length > 150) ||
        (b.category && !CATEGORIES.some((c) => c.id === b.category)) ||
        (b.province && !/^\d{1,4}$/.test(b.province))
      )
        throw Error("INVALID_INPUT");
      if (
        (b.start || b.end) &&
        (!Number.isFinite(Date.parse(b.start)) ||
          !Number.isFinite(Date.parse(b.end)))
      )
        throw Error("INVALID_INPUT");
      const [context, items] = await Promise.all([
        rpc(db, "reloo_pp_declared_context", { p_actor: profile.id }),
        b.ids.length || b.allowGlobal === true
          ? rpc(db, "reloo_pp_candidates", {
              p_actor: profile.id,
              p_ids: b.ids,
              p_category: b.category || null,
              p_province: b.province || null,
              p_start: b.start || null,
              p_end: b.end || null,
            })
          : Promise.resolve([]),
      ]);
      return safeResponse({
        ...rankProducts(items, context),
        enabled: context.enabled || !!context.manualCategories?.length,
        epoch: context.epoch,
      });
    }
    throw Error("INVALID_INPUT");
  } catch (e) {
    return careError(e);
  }
}
