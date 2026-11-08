export const CAPTURE_KINDS = ["front", "back", "selfie"];
export const CAPTURE_POSES = ["STRAIGHT", "LEFT", "RIGHT", "STRAIGHT"];
export const captureTimestamp=()=>Date.now();
// This is camera guidance, not identity matching or certified anti-spoofing.
export function facePose(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;
  const left = landmarks[234],
    right = landmarks[454],
    nose = landmarks[1];
  const width = right.x - left.x;
  if (
    width < 0.16 ||
    width > 0.75 ||
    nose.x < 0.2 ||
    nose.x > 0.8 ||
    nose.y < 0.2 ||
    nose.y > 0.8
  )
    return null;
  const yaw = (nose.x - (left.x + right.x) / 2) / width;
  return {
    pose:
      yaw < -0.16
        ? "RIGHT"
        : yaw > 0.16
          ? "LEFT"
          : Math.abs(yaw) < 0.09
            ? "STRAIGHT"
            : "MOVING",
    yaw,
  };
}
export function validCaptureManifest(
  value,
  session,
  profileId,
  now = Date.now(),
) {
  if (
    !session ||
    session.profile_id !== profileId ||
    session.consumed_at ||
    !Number.isFinite(Date.parse(session.expires_at)) ||
    Date.parse(session.expires_at) <= now ||
    session.capture_version !== 2
  )
    return false;
  if (
    !value ||
    value.version !== 2 ||
    value.source !== "LIVE_CAMERA" ||
    !Array.isArray(value.poses) ||
    JSON.stringify(value.poses.map((x) => x.pose)) !==
      JSON.stringify(session.challenge_poses || CAPTURE_POSES)
  )
    return false;
  const issued = Date.parse(session.issued_at);
  if (!Number.isFinite(issued)) return false;
  let prior = issued;
  for (const step of value.poses) {
    if (
      !Number.isFinite(step.at) ||
      step.at < prior + 500 ||
      step.at > now + 5000
    )
      return false;
    prior = step.at;
  }
  return (
    CAPTURE_KINDS.every((kind) =>
      /^[a-f0-9]{64}$/.test(value.hashes?.[kind] || ""),
    ) && now - issued >= 2000
  );
}
