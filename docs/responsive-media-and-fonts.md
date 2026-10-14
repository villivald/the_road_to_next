# Responsive private images and smaller fonts

Implemented on 14 October 2026 following the performance audit.

## Image delivery

New list and wish uploads store their existing full-size WebP plus 200, 400, 800,
and 1200 px variants where those widths are smaller than the source. Avatar
uploads add centered square variants at 64, 128, and 256 px, without enlarging
either source dimension. The original image remains available for detail views
and as a fallback.

`MediaImage` uses a native picture source with width descriptors and layout-specific
sizes. Next's unoptimized image remains the fallback with intrinsic dimensions,
lazy loading, decoding, and alt text. Cards, stacked previews, avatars, and detail
views each advertise their display size. There is no public image optimizer,
per-request resizing, or new image cache.

Variants add storage objects and upload writes. They are generated once so repeat
card views can download smaller files without repeated server transformations.

Every request, including `?w=400`, goes through the existing account or guest
authorization and the check after storage I/O. Responses retain private/no-store
headers. A supported width that is absent on a legacy image serves the original;
unsupported or ambiguous width parameters return 404.

The additive migration introduces `Media.variantWidths` and `Media.variantVersion`.
Pending rows record every intended path before uploads start. Cleanup removes all
recorded files before deleting the row, and retries partial failures. The schema
stores variant metadata on the media row, avoiding another relation query for
each image request.

## Existing images

The backfill is bounded, resumable, and defaults to a read-only preview. It uses
the same database/environment precedence as the other maintenance scripts:
existing process variables first, then `.env.local`, then `.env`.

```sh
npm run media:backfill
npm run media:backfill -- --apply --limit 100
```

The first command reports how many attached images need variants. The second
processes at most 100. Repeat until `remaining` is zero. The maximum batch is 500.
Failed images remain eligible; failures produce a nonzero exit code. This command
does not need new environment variables, but the existing database and private
Blob credentials must match the environment being processed.

Standalone backfill and cleanup commands use the static Blob read-write token
when available. Downloaded `VERCEL_OIDC_TOKEN` values are temporary and can cause
403 errors locally; the maintenance commands exclude them. Runtime authentication
on Vercel and the Inngest cleanup function are unchanged. Backfill reports the
failed phase and a sanitized reason without printing credentials or storage URLs.

Each backfilled image is staged under a new storage UUID. After all files are
written, a transaction swaps storage metadata while preserving the original image
ID, alt text, dimensions, and attachment. The staging row becomes the durable
cleanup record for old files. If an image is removed or replaced during the write,
the swap is skipped and the unused staged files are queued for cleanup. A failed
write leaves the current image usable.

Normal Inngest media cleanup removes old files. The existing manual maintenance
command can also run it:

```sh
npm run media:cleanup
```

## Fonts

The app now serves `Manrope-Variable.woff2` and `Fraunces-500-Optical.woff2`, totaling
111,468 bytes on disk. Manrope retains variable weights. Fraunces fixes the weight
at the existing heading weight of 500 and preserves variable optical sizing.
Both retain complete character mappings, including Finnish glyphs, rather than
using a Latin-only subset. Display remains `swap`; font families and UI styling
remain the same.

Original TTF sources and licenses are retained. WOFF2 assets are committed, so
deployment needs no Python packages or additional network access. Rebuilding
instructions are in [the font README](../src/assets/fonts/README.md).

The audit measured about 318 KB of current font transfer. The new assets are
approximately 111 KB before HTTP headers. This is a substantial bandwidth saving;
it does not establish a particular LCP or Lighthouse score improvement.

## Rollout

1. Run the additive migration against the intended database before deploying the
   new code: `npm run db:migrate`. For production, use the production connection
   configuration; applying a local migration alone does not update Neon.
2. Deploy normally. Fonts and variants for new uploads are available immediately.
   Existing images continue to work at their original size.
3. With that environment's database and storage credentials, run the backfill
   preview and bounded apply commands above. Run one backfill worker at a time to
   avoid redundant processing. Normal cleanup handles staged and replaced files.
4. Check cards, list/wish details, avatar uploads, guest viewing, and access
   revocation. Compare transferred sizes and mobile field metrics after rollout.

No new environment variables or hosting-plan upgrade are required. Production
migration, backfill, and deployment are separate rollout operations; implementing
the feature does not run them automatically.

## Verification

- ESLint, Stylelint, Prettier, TypeScript, and 122 unit tests passed.
- All 187 integration tests passed, including variant privacy, guest revocation
  during storage reads, partial upload/deletion failures, backfill ID preservation,
  and replacement during backfill.
- Production builds and desktop/mobile image, avatar, discovery, reservation,
  and guest browser workflows passed. The image-loading check confirms that card
  dimensions are unchanged before and after image delivery.
- Eight additional homepage checks covered EN/FI, desktop/mobile, and light/dark.
  The browser used the custom Fraunces font, downloaded 112,068 font bytes including
  response headers, and reported no layout shift, overflow, or JavaScript errors.
- The font converter regenerated byte-identical files and preserved character
  mappings. The backfill CLI's preview default and invalid-argument handling were
  checked against the isolated database.

The initial implementation was verified on the isolated test database before
production rollout. The follow-up below records the completed production backfill.

## Production backfill follow-up — 14 October 2026

The first production attempt failed on all four source reads with 403 responses.
The downloaded environment contained temporary OIDC credentials that the Blob SDK
preferred over the valid read-write token. Standalone maintenance now excludes
those OIDC credentials when a static token is configured; deployed runtime
authentication remains unchanged.

The retry completed with `processed: 4`, `skipped: 0`, `failed: 0`, and `remaining: 0`.
Original files and all eleven generated variants were verified through authenticated
read-only storage requests. The PostgreSQL SSL-mode deprecation warning was
separate from the storage failure; setting `sslmode=verify-full` explicitly retains
the driver's current certificate and hostname verification behavior.

The final production check found zero images awaiting backfill and zero detached
media rows awaiting cleanup. No manual storage cleanup remains for this rollout.
