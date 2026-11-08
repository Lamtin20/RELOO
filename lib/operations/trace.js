export function traceRoute(pathname) {
  const matched = pathname.match(/^\/api\/(auth|security|crm|kyc|profile|weather|support|journey|affiliate|ghtk|chat|rent|neighborhood|listings|pricing|db)(?:\/[a-z-]+){0,3}/);
  return matched ? matched[0].replace(/\/[a-f0-9-]{24,}/gi, "/:id") : "/other";
}
export function createTraceMatcher(routes) {
  const matchers = routes.map((route) => ({ route, regex: new RegExp('^' + route.split('/').map((part) => part.startsWith('[') ? '[^/]+' : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/') + '$') }));
  return (pathname) => matchers.find((item) => item.regex.test(pathname))?.route || '/api/other';
}
