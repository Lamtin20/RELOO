import {requirePreciseLocation} from '@/lib/maps/location-requirement';
import {normalizePhone} from '@/lib/phone';
import {validateOnboardingDetails} from '@/lib/auth/onboarding';
import {addressText,validateAddress} from '@/lib/profile/validation';
import {addressCatalog} from '@/lib/profile/address-server';
import {
  authenticatedIdentity,
  findAccountProfile,
  needsProfileCompletion,
} from "@/lib/auth/identity";
import { validateProfileInput } from "@/lib/auth/validation";
import {
  provisionAccountProfile,
  assertRegistrationStorageReady,
} from "@/lib/auth/provision";
import {
  assertOrigin,
  errorResponse,
  rateLimit,
  readJson,
  HttpError,
} from "@/lib/server/http";
export async function POST(request) {
  try {
    assertOrigin(request);
    rateLimit(request, "complete-profile", 8);
    const { authUser } = await authenticatedIdentity(request);
    const profile = await findAccountProfile(authUser);
    if (profile && !needsProfileCompletion(profile))
      return Response.json({
        ok: true,
        activationStatus: profile.activation_status,
        alreadyComplete: true,
      });
    const body=await readJson(request),input=validateProfileInput(body);
    if(authUser.phone&&normalizePhone(authUser.phone)!==input.phone)throw new HttpError(400,'S? ?i?n tho?i ph?i kh?p t?i kho?n ?? x?c nh?n.');
    const details=validateOnboardingDetails(body);
    try{details.addressDetails=await validateAddress(body.addressDetails,addressCatalog);}catch(e){throw new HttpError(/UNAVAILABLE|CATALOG_INVALID/.test(e.message)?503:400,'Vui l?ng ch?n khu v?c v? nh?p ??a ch? li?n h? h?p l?.');}
    details.addressDetails.preciseLocation=await requirePreciseLocation(details.addressDetails.preciseLocation,profile?.id||authUser.id);
    details.address=addressText(details.addressDetails);input.details=details;
    await assertRegistrationStorageReady();
    const outcome = await provisionAccountProfile(authUser, input, request);
    return Response.json(
      {
        ok: true,
        activationStatus: outcome.activation_status,
        screeningStatus: outcome.screening_status,
        caseId: outcome.case_id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
