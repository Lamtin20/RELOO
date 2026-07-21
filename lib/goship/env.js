/**
 * Goship API — biến môi trường (server-only cho token/secret)
 */

function readEnv(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

export function getGoshipApiBaseUrl() {
  return (
    readEnv("GOSHIP_API_URL", "NEXT_PUBLIC_GOSHIP_API_URL") ||
    "https://sandbox.goship.io/api/v2"
  ).replace(/\/$/, "");
}

export function getGoshipAccessToken() {
  return readEnv("GOSHIP_ACCESS_TOKEN", "GOSHIP_TOKEN");
}

export function getGoshipClientId() {
  return readEnv("GOSHIP_CLIENT_ID");
}

export function getGoshipClientSecret() {
  return readEnv("GOSHIP_CLIENT_SECRET");
}

export function isGoshipConfigured() {
  return Boolean(getGoshipAccessToken());
}
