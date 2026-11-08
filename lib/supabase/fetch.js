export function supabaseServerFetch(resource, options = {}) {
  let target = resource;
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL, internalUrl = process.env.SUPABASE_INTERNAL_URL;
  if (publicUrl && internalUrl) {
    const parsed = new URL(typeof resource === "string" ? resource : resource.url || String(resource));
    if (parsed.origin === new URL(publicUrl).origin) target = new URL(parsed.pathname + parsed.search, internalUrl);
  }
  return fetch(target, { ...options, signal: AbortSignal.timeout(12000) });
}
