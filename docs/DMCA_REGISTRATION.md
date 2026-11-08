# RELOO DMCA.com registration

**Updated 17 October 2026:** the owner authenticated via Google Sign-in. `reloo.vn` was added to the existing account and ownership validation completed using the issued root file (`msg=valcompleted`). The signed-in badge ID is `fe3278c5-9e96-4c76-a204-720c968aa755`. Runtime configuration now uses `RELOO_DMCA_PROTECTION_ID` and `RELOO_DMCA_REGISTRATION_CONFIRMED`; the common footer automatically links the current public canonical page. Badge requests are proxied as WebP without exposing visitor IP/cookies. The provider certificate still reports pending scanning/approval; ownership validation is not a paid Verified Protection certificate. See [the current integration report](FREE_LOCATION_GA_DMCA_20261017.md) for deployment evidence and free-service indexing delays. The notes below document the earlier incomplete registration attempt and have been superseded by this update.

The user authorized a free website registration and a footer link. Official sources checked on 16 October 2026:
- https://www.dmca.com/badges.aspx?r=m
- https://www.dmca.com/FAQ/How-do-I-add-a-DMCA-Protection-Badge-to-my-Website

The public page includes several form variants. The live free-registration iframe asked for first name, last name and email. The user supplied the representative name and managing email and explicitly authorized free registration. That form was submitted once; the browser moved to `/Badges.aspx?quickmode=true&default=1`. The registration session was later unavailable, and an actual reloo.vn certificate has not yet been verified. The operator has been asked to check the provider email and share only a public certificate URL/Protection ID. Do not resubmit blindly, invent contact details, or submit a paid plan. Website registration/protection is not claimed complete.

The public badge page emits example/session badge IDs even before registration. They must NOT be copied into RELOO as proof of registration. Wait for the actual registered account/certificate and check that it identifies reloo.vn. Email verification or a challenge, if requested by DMCA.com, must be completed by the account owner.

Prepared footer component: `components/layout/DmcaBadge.jsx`. It stays hidden until BOTH public build-time settings are configured after registration:

```
NEXT_PUBLIC_DMCA_PROTECTION_ID=<actual-issued-uuid>
NEXT_PUBLIC_DMCA_REGISTRATION_CONFIRMED=true
```

The link is constrained to the official HTTPS protection-status endpoint. The link is rendered with native HTML/CSS, contains no raster imports and adds no third-party script or relaxed CSP. It links to the real certificate; it does not claim all RELOO user uploads are owned by RELOO, verified by DMCA.com, or guaranteed against copying. It is not the vendor's automated per-page enrollment/helper script. If automated enrollment of every page is required later, review the official helper separately and its consent/network implications; do not silently inject it site-wide.

Rebuild the app after the two settings are supplied. Keep private registration credentials out of source control, frontend and logs. An unregistered footer must not display a Protected/certified claim.
