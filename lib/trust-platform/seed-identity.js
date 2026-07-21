/**
 * Seed identity profiles from demo users
 */

import { buildIdentityProfileFromUser } from './identity-engine';

export function seedIdentityProfiles(users = []) {
  return users.map((u) => buildIdentityProfileFromUser(u)).filter(Boolean);
}

export function mergeIdentityProfiles(existing, users) {
  const seeded = seedIdentityProfiles(users);
  const map = new Map(seeded.map((p) => [p.userId, p]));
  for (const p of existing ?? []) {
    if (!map.has(p.userId)) map.set(p.userId, p);
  }
  return Array.from(map.values());
}
