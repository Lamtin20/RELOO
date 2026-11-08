import { randomInt } from "node:crypto";
export function livePoses() {
  return [
    "STRAIGHT",
    ...(randomInt(2) ? ["LEFT", "RIGHT"] : ["RIGHT", "LEFT"]),
    "STRAIGHT",
  ];
}
export function validChallenge(challenge, profileId, now = Date.now()) {
  return (
    challenge?.profile_id === profileId &&
    challenge.consumed_at === null &&
    Date.parse(challenge.expires_at) > now &&
    Date.parse(challenge.issued_at) <= now &&
    Array.isArray(challenge.poses) &&
    challenge.poses.length === 4 &&
    challenge.poses[0] === "STRAIGHT" &&
    challenge.poses[3] === "STRAIGHT" &&
    ["LEFT,RIGHT", "RIGHT,LEFT"].includes(challenge.poses.slice(1, 3).join(","))
  );
}
