// A closed vocabulary prevents URLs, search terms and customer identifiers from
// becoming metric labels. Guest exchange, recovery and billing are excluded.
const staticRoutes = new Set([
  "/",
  "/browse",
  "/premium",
  "/about",
  "/privacy",
  "/terms",
  "/accessibility",
  "/support",
  "/sign-in",
  "/sign-up",
  "/password-forgot",
  "/email-verification",
  "/lists",
  "/lists/new",
  "/lists/shared",
  "/favorites",
  "/reservations",
  "/account/profile",
  "/account/password",
  "/account/delete",
]);

const dynamicRoutes = [
  [/^\/lists\/[^/]+$/, "/lists/[id]"],
  [/^\/lists\/[^/]+\/wishes\/new$/, "/lists/[id]/wishes/new"],
  [/^\/lists\/[^/]+\/wishes\/[^/]+$/, "/lists/[id]/wishes/[id]"],
  [/^\/lists\/[^/]+\/edit$/, "/lists/[id]/edit"],
  [/^\/lists\/[^/]+\/sharing$/, "/lists/[id]/sharing"],
  [/^\/lists\/[^/]+\/guest-links$/, "/lists/[id]/guest-links"],
  [/^\/lists\/[^/]+\/wishes\/[^/]+\/edit$/, "/lists/[id]/wishes/[id]/edit"],
  [/^\/reservations\/[^/]+$/, "/reservations/[id]"],
] as const;

export const performanceRoutes = [
  ...staticRoutes,
  ...dynamicRoutes.map(([, route]) => route),
];

export const normalizePerformanceRoute = (path: string): string | null => {
  // Work on paths only; never accept externally supplied URL origins.
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  const pathname =
    path.split(/[?#]/, 1)[0].replace(/^\/(en|fi)(?=\/|$)/, "") || "/";
  if (staticRoutes.has(pathname)) return pathname;
  return dynamicRoutes.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
};
