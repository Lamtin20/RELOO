import {
  authenticatedIdentity,
  findAccountProfile,
  incompleteSession,
} from "@/lib/auth/identity";
import { requireAccount, publicSession } from "@/lib/security/authorization";
import { errorResponse } from "@/lib/server/http";

export async function GET(request) {
  try {
    const { authUser } = await authenticatedIdentity(request);
    const profile = await findAccountProfile(authUser);
    if (!profile)
      return Response.json(
        { ok: true, user: incompleteSession(authUser) },
        { headers: { "Cache-Control": "no-store" } },
      );
    const account = await requireAccount(request, { active: false });
    return Response.json(
      { ok: true, user: publicSession(account.profile) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error.status === 401)
      return Response.json(
        { ok: true, user: null },
        { headers: { "Cache-Control": "no-store" } },
      );
    return errorResponse(error);
  }
}
