# Dependency maintenance

Reviewed 25 October 2026. Keep `package.json` and `package-lock.json` together.

The personalization review updates Zod to 4.6.7, Undici to 6.29.1, and fast-uri to
3.1.9. These address the [Zod collection-size advisory](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5),
[Undici response-handling advisory](https://github.com/advisories/GHSA-xjj6-f33q-929c),
and [fast-uri normalization advisories](https://github.com/advisories/GHSA-w74x-v6f9-j3xg).

Two scoped overrides reuse the app's patched Zod version:

- `@vercel/cli-config` otherwise pins Zod 4.1.11.
- `inngest` otherwise installs Zod 3.25.76, which also bundles an older Zod 4.
  The installed SDK imports only `zod/v3`. That compatibility entry point remains
  available in Zod 4; this does not migrate Inngest's schemas to the v4 API. See
  [Zod's subpath compatibility guarantee](https://zod.dev/v4/versioning).

Revisit these overrides when upgrading either parent package. Do not replace them
with an unrestricted override for every Zod consumer or apply `npm audit fix
--force`: the audit's suggested parent-package downgrades are not appropriate here.
Existing overrides for other packages remain unchanged.

After dependency updates, run `npm run check`, `npm run test:integration`, and the
browser suites sequentially. `e2e/background-jobs.spec.ts` checks the real SDK's
initialization through the isolated app's introspection endpoint without publishing
events. Rendering tests decode generated QR cards, and browser tests cover billing,
sharing, guest access, localization, loading states, and personalization.
