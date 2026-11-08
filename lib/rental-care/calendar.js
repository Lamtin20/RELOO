import { createHash } from "node:crypto";
export const CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.app.created",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];
export const eventKey = (job) =>
  createHash("sha256")
    .update(
      "reloo-calendar:" + job.connection + ":" + job.source + ":" + job.rental,
    )
    .digest("hex");
export function calendarEvent(job, locale = "vi-VN") {
  const done = job.state === "RETURNED",
    english = locale === "en-US";
  return {
    getCalendar: (token, id) =>
      request("calendars/" + encodeURIComponent(id), token),
    id: eventKey(job),
    summary: done
      ? english
        ? "Returned · RELOO"
        : "Đã trả đồ · RELOO"
      : english
        ? "Return reminder · RELOO"
        : "Nhắc trả đồ · RELOO",
    description: english
      ? "Check the current rental details in RELOO."
      : "Mở RELOO để kiểm tra đơn và hạn trả hiện tại.",
    start: {
      dateTime: new Date(Date.parse(job.end) - 15 * 60000).toISOString(),
      timeZone: "Asia/Ho_Chi_Minh",
    },
    end: {
      dateTime: new Date(job.end).toISOString(),
      timeZone: "Asia/Ho_Chi_Minh",
    },
    reminders: {
      useDefault: false,
      overrides: done
        ? []
        : [
            { method: "popup", minutes: 1440 },
            { method: "popup", minutes: 60 },
          ],
    },
    visibility: "private",
    transparency: "transparent",
    extendedProperties: {
      private: { relooKey: eventKey(job), revision: String(job.revision) },
    },
  };
}
export class CalendarError extends Error {
  constructor(code, status = 503) {
    super(code);
    this.code = code;
    this.status = status;
  }
}
// Production requests are restricted to documented Google endpoints. Test transports
// are injected in unit tests; no environment URL override can export tokens.
export function googleCalendar({ fetcher = fetch } = {}) {
  async function request(path, token, { method = "GET", body, etag } = {}) {
    const r = await fetcher("https://www.googleapis.com/calendar/v3/" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
        ...(etag ? { "If-Match": etag } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(15000),
      redirect: "error",
    });
    if (r.status === 401) throw new CalendarError("REAUTH", 401);
    if (r.status === 412 || r.status === 429 || r.status >= 500)
      throw new CalendarError("PROVIDER_RETRY", r.status);
    if (r.status === 404 || r.status === 410) return null;
    if (r.status === 409) return { conflict: true };
    if (!r.ok)
      throw new CalendarError(
        r.status === 403 ? "CALENDAR_PERMISSION" : "CALENDAR_FAILED",
        r.status,
      );
    return r.status === 204 ? {} : r.json();
  }
  return {
    async findCalendar(token, connection) {
      let pageToken;
      const marker = "RELOO:" + connection,
        found = [];
      for (let page = 0; page < 4; page++) {
        const q = new URLSearchParams({
            maxResults: "250",
            showHidden: "true",
            ...(pageToken ? { pageToken } : {}),
          }),
          data = await request("users/me/calendarList?" + q, token);
        found.push(
          ...(data?.items || []).filter(
            (c) => c.description === marker && c.accessRole === "owner",
          ),
        );
        pageToken = data?.nextPageToken;
        if (!pageToken) break;
      }
      if (found.length > 1) throw new CalendarError("CALENDAR_REVIEW");
      return found[0] || null;
    },
    createCalendar: (token, connection) =>
      request("calendars", token, {
        method: "POST",
        body: {
          summary: "RELOO",
          description: "RELOO:" + connection,
          timeZone: "Asia/Ho_Chi_Minh",
        },
      }),
    async sync(token, job, locale) {
      const id = job.remoteId || eventKey(job),
        path =
          "calendars/" +
          encodeURIComponent(job.calendar) +
          "/events/" +
          encodeURIComponent(id);
      let existing = await request(path, token);
      if (
        existing &&
        existing.extendedProperties?.private?.relooKey !== eventKey(job)
      )
        throw new CalendarError("CALENDAR_REVIEW");
      if (
        existing &&
        Number(existing.extendedProperties.private.revision) > job.revision
      )
        return id;
      if (
        job.state === "CANCELLED" ||
        (job.state === "RETURNED" && job.returnAction === "DELETE")
      ) {
        if (existing)
          await request(path, token, { method: "DELETE", etag: existing.etag });
        return id;
      }
      const body = calendarEvent(job, locale);
      if (existing) {
        const { id: unused, ...patch } = body;
        void unused;
        const updated = await request(path, token, {
          method: "PATCH",
          body: patch,
          etag: existing.etag,
        });
        if (!updated || updated.id !== id)
          throw new CalendarError("CALENDAR_REVIEW");
        return id;
      }
      if (job.state === "RETURNED") return id;
      const added = await request(
        "calendars/" + encodeURIComponent(job.calendar) + "/events",
        token,
        { method: "POST", body },
      );
      if (!added) throw new CalendarError("CALENDAR_REVIEW");
      if (added?.conflict) {
        existing = await request(path, token);
        if (
          !existing ||
          existing.extendedProperties?.private?.relooKey !== eventKey(job)
        )
          throw new CalendarError("CALENDAR_REVIEW");
        const { id: unused, ...patch } = body;
        void unused;
        if (
          Number(existing.extendedProperties.private.revision) <= job.revision
        ) {
          const updated = await request(path, token, {
            method: "PATCH",
            body: patch,
            etag: existing.etag,
          });
          if (!updated || updated.id !== id)
            throw new CalendarError("CALENDAR_REVIEW");
        }
      } else if (added.id !== id) {
        throw new CalendarError("CALENDAR_REVIEW");
      }
      return id;
    },
  };
}
export async function refreshCalendarToken(
  secret,
  { fetcher = fetch, env = process.env } = {},
) {
  if (
    !env.RELOO_CALENDAR_CLIENT_ID ||
    !env.RELOO_CALENDAR_CLIENT_SECRET ||
    !secret.refresh_token
  )
    throw new CalendarError("CALENDAR_NOT_CONFIGURED");
  const r = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.RELOO_CALENDAR_CLIENT_ID,
      client_secret: env.RELOO_CALENDAR_CLIENT_SECRET,
      refresh_token: secret.refresh_token,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  const data = await r.json();
  if (!r.ok || !data.access_token)
    throw new CalendarError(
      data.error === "invalid_grant" ? "REAUTH" : "PROVIDER_RETRY",
    );
  return data.access_token;
}
