# Performance audit — 13 October 2026

The best next step is to optimize images, fonts, and database reads within the existing Next.js app. The measurements do not justify a framework migration or establish that upgrading Vercel would solve the current bottlenecks.

This audit made no application-source, production-data, hosting-plan, or deployment changes. Font and image experiments used temporary files; signed-in testing used the isolated local test database. This report is the only tracked deliverable.

## Scope and method

- Production: `https://wishlistfi.vercel.app`, anonymous read-only requests to the homepage, Browse in all three modes, Premium, sign-in, About, and public list/wish details.
- Deployment and checkout matched commit `72be0e75245f7a4643271d6ebdb8121762afdfc5`. The deployed functions use Frankfurt (`fra1`), Node 24, and Fluid Compute.
- Twelve Lighthouse mobile runs: three per homepage, Browse lists, Browse wishes, and Premium. Lighthouse 13.5.0 used its simulated throttling model.
- Separate Chromium mobile tests used a 390 × 844 viewport, approximately 1.6 Mbps downloads, 150 ms configured latency, and 4× CPU throttling. These are observed browser measurements, not Lighthouse's model.
- Signed-in local production-server testing covered a Premium owner and a free member, My lists, Browse, populated/empty reservations, profile, plan, and list/wish details. Additional checks covered guest views and representative actions. Payment and email providers were isolated from real services.
- SQL tracing recorded statements and timing without recording parameter values, session cookies, or secrets. Query plans were tested with approximately 576 and 20,576 synthetic wishes.
- Temporary font and image experiments measured actual file sizes and rendering behavior.

These are lab measurements from one location and Chromium, not real-user percentiles. The audit did not run a high-concurrency production load test, exercise real payments, or establish Safari performance, worldwide latency, peak capacity, or production database pool wait times. Local storage does not reproduce private Vercel Blob latency. The production database region could not be independently verified through the environment API; the local Neon configuration points to Frankfurt and a pooled endpoint.

## Production results

### Mobile Lighthouse

Medians across three runs per route. Transfer totals include the resources requested during the audit and use decimal KB.

| Page          | Performance score | First contentful paint | Largest contentful paint | Total blocking time | Layout shift | Transfer |
| ------------- | ----------------: | ---------------------: | -----------------------: | ------------------: | -----------: | -------: |
| Homepage      |                91 |                 0.93 s |                   3.55 s |               18 ms |            0 |   574 KB |
| Browse lists  |                91 |                 0.93 s |                   3.48 s |                6 ms |            0 |   677 KB |
| Browse wishes |                90 |                 0.92 s |                   3.62 s |               12 ms |            0 |   679 KB |
| Premium       |                91 |                 0.93 s |                   3.49 s |               15 ms |            0 |   576 KB |

The simulated LCP values leave room for improvement. Main-thread blocking and initial-load layout stability are already good in these tests. There were no application JavaScript errors in the sampled public browser loads.

The separate directly throttled runs produced lower LCP values: approximately 1.0–1.3 seconds on Browse and 1.6 seconds on Premium. Homepage runs varied from 1.27 to 2.98 seconds. Their measured CLS remained below 0.001. Different throttling methods and connection reuse explain why these results should not be averaged with Lighthouse or treated as a speed guarantee.

Real-user targets should be evaluated at the 75th percentile: LCP ≤ 2.5 seconds, INP ≤ 200 ms, and CLS ≤ 0.1. Lighthouse TBT is not a measurement of real-user INP. [Web Vitals guidance](https://web.dev/articles/vitals).

### Server response times

Five sequential production HTTP requests per route, with a fresh curl connection for each request. TTFB includes connection setup and server waiting.

| Route         | Median TTFB | Slowest observed TTFB |
| ------------- | ----------: | --------------------: |
| Homepage      |      337 ms |              2,793 ms |
| Browse lists  |      157 ms |                502 ms |
| Browse wishes |      150 ms |                158 ms |
| Browse people |      147 ms |                184 ms |
| Premium       |      150 ms |                159 ms |
| Sign-in       |      154 ms |                181 ms |
| About         |      171 ms |                195 ms |

The first homepage request was an outlier. That is consistent with startup or connection effects, but it does **not** prove a Vercel cold start or Neon wake-up. No controlled idle-start experiment or production trace identified its cause. The warmed responses are generally quick.

All sampled page responses were Vercel cache misses. Personalized header/session behavior makes the current public page documents dynamic. This is an architectural optimization opportunity, not evidence that private pages should be cached publicly.

## Findings and recommendations

### 1. Deliver images at the size actually displayed

**Priority: high. Effort: medium. Evidence: measured production bytes and resize experiment.**

The shared `MediaImage` component uses `next/image` with `unoptimized`. Stored wish/list images can be 1600 px wide, and cards receive that same file even when displayed much smaller. Avatar files can be 512 px wide despite a tiny header display.

One production catalogue image measured 1600 × 1000 and 111,582 bytes. It appeared at approximately 191 × 120 CSS pixels in a card stack. Temporary WebP variants of that same image measured:

| Width            |   Bytes | Reduction from current file |
| ---------------- | ------: | --------------------------: |
| 400 px           |  12,940 |                         88% |
| 600 px           |  23,936 |                         79% |
| 800 px           |  39,534 |                         65% |
| 1600 px, current | 111,582 |                           — |

The correct choice depends on card width and device pixel ratio. A high-density mobile screen still needs more than one pixel per CSS pixel. The savings above are for this image, not a universal compression guarantee.

Generate a small set of variants when an image is uploaded, then serve them with `srcset` and accurate `sizes`. Keep the large variant for detail views and create small avatar variants. Avoid repeated image transformation inside each media GET. Existing media needs a resumable backfill; replacement, deletion, and cleanup must include all variants.

**Preserve current privacy behavior.** Media routes validate access before storage I/O and again before returning bytes. They deliberately use `private, no-store`. An authenticated image request currently performs four SELECTs; an anonymous one performs two permission reads. Smaller files reduce transfer and connection occupation, but do not automatically reduce those query counts. Do not remove the second check or introduce public CDN caching as a shortcut: hiding wishes, changing membership, ending guest access, and reserving wishes can revoke access.

Warm-browser tests confirmed that fonts, JavaScript, and CSS were cached, while the protected image downloaded again. Smaller variants therefore help repeat visits as well as first visits. Conditional requests might eventually reduce repeated transfer, but require authorization before every response and a separate review of revocation behavior.

Source: [media-image.tsx](../src/features/media/components/media-image.tsx), [media GET](../src/app/api/media/[id]/route.ts), [guest media GET](../src/app/guest/lists/[listId]/media/[id]/route.ts), [image validation](../src/features/media/service/validation.ts).

### 2. Reduce font downloads without changing the design

**Priority: high. Effort: small. Evidence: generated files and controlled browser comparison.**

The current TTF files total 525 KB on disk and transfer approximately 318 KB in production: about 248 KB for Fraunces and 70 KB for Manrope. That is a large share of the first-visit download.

Full-character WOFF2 versions measured 194,812 bytes for Fraunces and 53,712 bytes for Manrope. More importantly, the app currently uses Fraunces at weight 500. A WOFF2 version fixed at that weight, with optical sizing retained and the other axes fixed at their existing defaults, measured 57,500 bytes. Combined with the full Manrope WOFF2, that is approximately **111 KB**, around **65% less** than the current production font transfer.

Keep the complete character coverage rather than assuming all user names and wish titles are Latin. Register the files correctly through the existing local-font setup and preserve `font-display: swap` and fallback metrics. Review the wordmark, EN/FI headings, small text, dark mode, and user-entered text before adopting the weight-specific file.

A temporary browser comparison verified the custom font actually rendered, with an identical homepage heading bounding box. The Fraunces download finished about 1.3 seconds sooner under the test throttle. **Homepage LCP stayed at a median 696 ms in both variants**, because visible fallback content/the hero already satisfied LCP. This is a proven bandwidth and font-completion improvement; an LCP improvement has not been proven. The local baseline used different compression from production, so its transfer total was approximately 259 KB, not 318 KB.

### 3. Simplify repeated database reads and sequential round trips

**Priority: high for signed-in navigation. Effort: medium. Evidence: SQL tracing and latency sensitivity experiment.**

The My lists full document made 13 SQL commands: ten SELECTs plus BEGIN, isolation-level setup, and COMMIT. Browse and reservations made approximately eight SELECTs; profile and plan made seven. These counts include the shared account/header reads. Client navigations can reuse layouts and have different counts.

Session reads are already deduplicated inside a render through React `cache`. The remaining opportunities include:

- Read available and reserved wish counts in one consistent aggregate. The current two queries use a repeatable-read transaction to keep counts consistent; replacing them with one statement can preserve that consistency while removing transaction round trips.
- Deduplicate identical avatar and current Premium-access reads within the same render. Profile and plan repeat some shared-header reads. Keep mutation and transaction authorization checks fresh; do not turn this into a cross-user or long-lived cache.
- Investigate joining related display data where appropriate instead of successive parent/child reads. This is not a classic one-query-per-card problem: the ORM already batches several relations.

To isolate sensitivity, the audit added an artificial 35 ms delay to every local SQL completion. It did not change production or measure actual Neon latency.

| Full response                 | Normal local median | With artificial delay |
| ----------------------------- | ------------------: | --------------------: |
| Owner My lists                |               18 ms |                422 ms |
| Member My lists               |                8 ms |                399 ms |
| Owner Browse                  |               12 ms |                215 ms |
| Member populated reservations |                8 ms |                212 ms |
| Owner profile                 |                7 ms |                132 ms |
| Owner plan                    |                7 ms |                135 ms |
| Owner list detail             |               13 ms |                255 ms |

This demonstrates that round-trip dependencies can dominate otherwise inexpensive server rendering. It does not predict exact production timings or the benefit of a hosting upgrade.

Source: [get-my-lists.ts](../src/features/wishlist/queries/get-my-lists.ts), [wish-counts.ts](../src/features/wishlist/service/wish-counts.ts), [authentication](../src/features/auth/actions/get-auth.ts), [Prisma client](../src/lib/prisma.ts).

### 4. Load only the active language catalogue in the browser

**Priority: medium. Effort: medium. Evidence: production chunk inspection.**

Fresh public pages transferred approximately 213–218 KB of JavaScript. A shared translation chunk accounted for roughly 42 KB compressed and 177 KB decoded; it includes both English and Finnish text plus message codes.

Keep the active locale's client catalogue separate, or pass narrower text sets into client boundaries where that remains maintainable. Preserve server-action error translations and runtime message lookup. Make this an isolated change and compare the resulting production bundle before pursuing more elaborate per-component catalogue splitting.

The main framework chunks are larger, but measured TBT was only 6–18 ms at the route medians. There is no evidence here that wholesale React replacement is the first performance priority.

Source: [text.ts](../src/i18n/text.ts), [use-text.ts](../src/i18n/use-text.ts).

### 5. Bound preview queries inside the database

**Priority: medium as lists grow. Effort: medium. Evidence: controlled overfetch test.**

The UI caps catalogue pages at 20 lists and three preview pictures per list, which is good. However, the Prisma preview query's per-parent `take: 3` does not produce a SQL limit in the tested query strategy. Some wish rows are retrieved and then trimmed by the ORM.

With 20 image-bearing wishes in one test list, the preview SELECT returned 77 wish rows across 20 lists, although the UI needed only 60. The subsequent media query still fetched 60 rows: this finding concerns database wish-row overfetch, not 77 full image downloads.

Consider a database-level per-list limit using a supported join strategy, lateral query, or window function. Also avoid calculating wish-image previews for lists whose explicit cover is used instead. Preserve ordering and fallback behavior. This is a growth optimization, not a demonstrated emergency in the current dataset.

### 6. Add field measurements and investigate slow outliers

**Priority: high alongside the first optimizations. Effort: small to medium.**

There is no installed real-user Web Vitals collector in the inspected app. Add privacy-conscious sampling for LCP, INP, CLS, and navigation timing, plus server p50/p95 durations and database pool waiting. Use normalized route patterns such as `/lists/[id]`, not customer IDs, emails, titles, or tokens. Exclude guest-link exchange URLs and secret-bearing fragments from analytics/logs.

Record request stages separately: authentication, database waiting, query execution, rendering, and private image retrieval. This makes it possible to distinguish Vercel startup, Neon wake-up, Blob retrieval, and network cost before buying infrastructure to address the wrong cause.

### 7. Consider static public marketing pages later

**Priority: lower than images, fonts, and signed-in reads. Effort: medium.**

Homepage, About, and Premium explanations could eventually serve a static public body with an independently personalized account area. This would reduce server work for visitors and avoid a dynamic document on every visit. Next.js can support that architecture; a framework migration is not necessary to obtain it.

Validate account navigation, localization, hydration, and layout stability before changing the shell. Do not cache personalized documents, private catalogue data, or billing status publicly.

## Navigation, actions, and growth

The local top-tab tests measured click-to-target-content, including the removal of the loading preview. Most transitions completed in approximately 30–340 ms without throttling. Lightweight routes with configured network latency typically took around 180–335 ms. These are local synthetic workflows, not production INP.

Rapid navigation through image-heavy owner pages under the bandwidth throttle produced several 11–12 second outliers while the associated server responses remained below 100 ms. The fixtures deliberately used approximately 379 KB per image and the local server used a different transport/storage path from production. Repeating the test with image requests omitted removed those outliers: owner reservations completed around 182 ms and Account around 332 ms. This supports image/network contention as the explanation in this local experiment; it is not a measured production navigation delay. The appropriate follow-up is smaller variants and a production navigation trace. Omitting images is useful only for isolating that dependency, not as an app experience benchmark.

Profile saves, reservation/cancellation, and guest views were tested against isolated accounts. Their authorization, rate limits, locks, and transaction boundaries should be retained. A query count on a mutation includes correctness checks and can include the updated page render; it is not a list of checks that should be removed.

| Local workflow, three samples | Median server duration | SQL commands |
| ----------------------------- | ---------------------: | -----------: |
| Profile save                  |                  19 ms |           16 |
| Reserve a wish                |                  17 ms |           20 |
| Cancel reservation            |                  20 ms |           11 |
| Guest list view               |                  17 ms |            5 |
| Guest wish detail             |                   6 ms |            3 |
| Guest image                   |                   7 ms |            2 |

Profile and reservation checks completed successfully, including the cancellation redirect and updated reservation state. These figures exclude the user's network and real Blob retrieval. The guest-list first sample was 94 ms; its warmed samples were 12–17 ms.

Billing code review found bounded, visibility-aware refresh attempts and an in-flight guard. The plan page only mounts provider refresh when billing is enabled and a billing account exists; the sampled free-account visits did not issue billing POSTs. Paddle requests have an eight-second timeout. Real provider response and webhook latency were not benchmarked, so this audit does not establish billing-service performance.

With approximately 20,576 local wishes, median public-list and public-wish service reads remained around 6 ms. An unsuccessful substring wish search rose from approximately 2.3 ms at the smaller fixture to 23.9 ms. That scan is a future scaling concern, not evidence of current production overload. Consider trigram/search indexes only after examining real search usage and query plans. Do not infer maximum concurrent users from this single-user local test.

## Vercel Pro and framework choice

**Keep Next.js for the next optimization step.** The measured JavaScript blocking time is low. Images, fonts, sequential database reads, and private-media delivery would remain relevant under Astro or TanStack Start. Recreating authentication, mutations, billing, permission-aware media, and localization would add substantial migration work without a measured benefit here. No head-to-head implementation benchmark was performed.

**Do not expect a Pro upgrade alone to fix these findings.** Hobby and Pro functions both default to 2 GB / 1 vCPU; Pro allows a larger 4 GB / 2 vCPU configuration. More CPU is most useful for CPU-bound work, and the current server-rendering tests were inexpensive. [Vercel memory and CPU documentation](https://vercel.com/docs/functions/configuring-functions/memory).

Fluid Compute is already enabled on this project. Its concurrency and startup optimizations are therefore not entirely new benefits that require this app to upgrade. [Fluid Compute documentation](https://vercel.com/docs/fluid-compute).

Pro can provide operational headroom and startup-related benefits, but the audit cannot assign them a percentage speedup. Upgrade for the required hosting capabilities and workload, then compare production p95 and startup traces. It will not shrink the font files, create responsive images, or eliminate database round trips.

Neon idle behavior is a separate concern from the Vercel plan. The account plan and actual production wake-up frequency were not verified, so the initial slow request should not be attributed to Neon. [Neon scale-to-zero documentation](https://neon.com/docs/introduction/scale-to-zero).

## Suggested implementation order and acceptance checks

1. Convert local fonts to WOFF2 and adopt the weight-specific Fraunces file after visual review. Verify full glyph coverage, EN/FI text, logo proportions, fallback behavior, and no increase in CLS. Expect the font payload near 111 KB; do not promise a specific LCP improvement.
2. Add private responsive image variants and small avatars, including backfill and cleanup. Verify card/detail quality at DPR 1–3, correct `sizes`, reduced transferred bytes, and immediate access denial after visibility, reservation, membership, or guest-link changes.
3. Simplify wish-count aggregation and deduplicate identical render reads. Compare SQL counts and production p50/p95, and retain reservation/count consistency under concurrent updates.
4. Add field metrics and server-stage timing, respecting guest secrets and private user data. Establish actual mobile p75 and slow-request causes.
5. Split client locale payloads, then address preview overfetch. Rerun the same production-build browser/Lighthouse measurements with matched content and repeat counts.
6. Reassess hosting and static marketing-page architecture using field evidence. Keep route prefetching unless measurements show a specific waste: the observed RSC segment prefetch traffic was only about 6–8 KB initially and 16–18 KB after scrolling, not a large download bottleneck.

Preserve the existing good behavior: cached static assets, `font-display: swap`, server-rendered page bodies, bounded pagination, compact DOMs, limited main-thread work, stable initial layout, permission-aware images, and bounded billing polling.

## Evidence files

Raw artifacts are local and intentionally git-ignored under `img/performance-audit-2026-10-13/`. They are not production telemetry or public report attachments.

- `audit-summary.json`: aggregated Lighthouse, HTTP, infrastructure, query, and experiment results.
- `lighthouse-*.json`, `lighthouse-summary.json`: all twelve mobile runs.
- `production-http.json`, `production-browser.json`, `production-mobile-throttled.json`: public deployment measurements and resource breakdowns.
- `local-http-comparison.json`, `server-http-*.jsonl`: isolated server/query sensitivity tests.
- `font-comparison.json`, `font-ab-comparison.json`, `image-variant-comparison.json`: font and image experiments.
- `query-scaling.json`, `preview-overfetch.json`: local growth/query tests.
- `interaction-timings.json`, `interaction-queries.jsonl`, `interaction-no-images-timings.json`: synthetic navigation traces and the image-dependency diagnostic.
- `action-workflows.json`, `action-queries.jsonl`: isolated guest/profile/reservation workflow checks.

Temporary audit scripts and converters were kept outside the repository. Production was only inspected and read; no deploy, payment, message, plan upgrade, or production database modification was performed.
