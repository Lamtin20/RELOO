import { requirePermission } from "@/lib/operations/permissions";
import { errorResponse } from "@/lib/server/http";
export async function GET(request) {
  try {
    const { db, staff } = await requirePermission(request, "crm.read");
    const allowed = (permission) =>
      staff.permissions.includes("*") || staff.permissions.includes(permission);
    const since = new Date(Date.now() - 86400000 * 7).toISOString();
    const results = await Promise.all([
      db
        .from("profiles")
        .select("id,name,email,phone,activation_status,kyc_level,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("risk_blacklist")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("automation_jobs")
        .select("id,kind,status,attempts,run_at,result")
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("api_traces")
        .select("method,route,status,duration_ms,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1000),
      db
        .from("journey_events")
        .select("event,path,category,created_at")
        .gte("created_at", since)
        .limit(1000),
      db
        .from("transactions")
        .select("id,status,created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      db
        .from("kyc_submissions")
        .select(
          "id,profile_id,status,reason,created_at,review_due_at,declared_expiry,profiles!kyc_submissions_profile_id_fkey(name)",
        )
        .in("status", ["REVIEW", "QUEUED", "PROCESSING"])
        .is("superseded_at", null)
        .order("review_due_at", { ascending: true, nullsFirst: false })
        .limit(200),
      db.from("crm_staff").select("profile_id,role,permissions,enabled"),
      db
        .from("kyc_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "REVIEW")
        .is("superseded_at", null),
      db
        .from("kyc_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "REVIEW")
        .is("superseded_at", null)
        .lt("review_due_at", new Date().toISOString()),
    ]);
    if (results.some((item) => item.error))
      throw new Error("CRM storage unavailable");
    const [customers, blacklist, jobs, traces, events, orders, kyc, staffRows] =
      results.map((item) => item.data);
    const kycReview = { pending: results[8].count, overdue: results[9].count };
    return Response.json(
      {
        ok: true,
        customers: allowed("customers.read") ? customers : [],
        blacklist: allowed("risk.read") ? blacklist : [],
        jobs: allowed("jobs.read") ? jobs : [],
        traces: allowed("traffic.read") ? traces : [],
        events: allowed("traffic.read") ? events : [],
        orders: allowed("orders.read") ? orders : [],
        kyc: allowed("kyc.read")
          ? kyc.map((item) => ({
              ...item,
              overdue:
                item.status === "REVIEW" &&
                Date.parse(item.review_due_at) < Date.now(),
            }))
          : [],
        kycReview: allowed("kyc.read") ? kycReview : null,
        staff: allowed("roles.read") ? staffRows : [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
