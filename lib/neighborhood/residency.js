export function residencyMethods(env = process.env) {
  const methods = (env.RELOO_NEIGHBORHOOD_RESIDENCY_METHODS || "MANUAL,INVITE")
    .split(",")
    .map((v) => v.trim());
  return [...new Set(methods.filter((v) => ["MANUAL", "INVITE"].includes(v)))];
}
// Only a reviewed server adapter may supply a partner result. GPS/IP or a
// client-supplied VERIFIED value never satisfy this contract.
export async function verifyResidencyWithPartner(
  { profileId, areaId, buildingId, consentReceipt },
  { adapter } = {},
) {
  if (!adapter?.verify || !adapter?.trustedServerAdapter || !consentReceipt)
    throw Error("RESIDENCY_PROVIDER_UNAVAILABLE");
  const result = await adapter.verify({
    profileId,
    areaId,
    buildingId,
    consentReceipt,
  });
  if (
    !result?.externalReference ||
    !result?.signatureVerified ||
    !["VERIFIED", "PENDING", "REJECTED"].includes(result.status)
  )
    throw Error("RESIDENCY_PROVIDER_UNAVAILABLE");
  return {
    status: result.status,
    externalReference: result.externalReference,
    verifiedUntil: result.verifiedUntil || null,
  };
}
