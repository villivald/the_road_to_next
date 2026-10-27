# Performance and capacity

Step 5 adds repeatable local capacity measurements and optional production
performance monitoring. Monitoring is disabled by default. No database migration,
new table, scheduled job or third-party analytics service is required.

The [27 October acceptance report](performance-capacity-2026-10-27.md) records the
current local baseline, accepted budgets and explicit optimization deferrals.

## Monitoring

Set `PERFORMANCE_MONITORING=1` and `PERFORMANCE_SAMPLE_RATE=0.1` on the intended
deployment, then deploy the reviewed commit. Both are server variables; no public
key or build-time client setting is needed. The rate must be between 0 and 1;
invalid values select no samples. The default rate is 10%. Set the monitoring flag
to `0` and redeploy to disable it. Do not change database scale-to-zero settings.

Browser reports contain only a normalized route template, metric name, numerical
value and `narrow`/`wide` viewport category. LCP, INP, CLS, FCP and TTFB are reported
at most once per metric per sampled document. Values use milliseconds except CLS,
which is unitless. INP is absent when a visitor has no qualifying interaction.
Documents loaded through a guest exchange are excluded, even after client
navigation. Reports on excluded pages are suppressed. Initial-document attribution
is retained across client navigation; these measurements are not individual
client-transition timings or pageview counts. BFCache restores are not counted as
new documents by this collector.

Browser reports respect Do Not Track and Global Privacy Control. Requests use
`credentials: omit` and `referrerPolicy: no-referrer`, create no cookies or storage
identifiers, and send no URL, query, fragment, content, user/session/metric ID,
email, IP, user agent, payment details or performance-entry attribution. Guest,
password-reset, invitation and billing routes are excluded. Unknown routes are
dropped rather than logged verbatim. EN/FI privacy copy describes this optional
monitoring. Hosting infrastructure still handles ordinary request metadata;
these application-level rules do not change provider access logs or retention.

The same-origin endpoint accepts only the closed schema, bounds timings at five
minutes and CLS at 100, rejects bodies over 512 bytes, and caps accepted samples at 120/minute per running instance. It does not
read sessions or the database. This is a local cost bound, not a distributed abuse
limit; Origin can be forged outside a browser. Reports are untrusted operational
signals, not security or billing evidence. Rejected reports are silently discarded
by the browser. Missing samples and the cap can bias busy periods.

Server timings use Next.js's completed matched root-request OpenTelemetry span.
Internal routing probes without `http.route` are excluded so they do not add
duplicate near-zero samples. The custom
processor emits only route template, method, status, document/RSC category and
rounded milliseconds. It never exports whole spans, errors, SQL, headers, trace
IDs, URLs or events. Sampling is independent per request; incoming trace headers
cannot force collection. There is no network exporter or periodic flush. The
provider records root requests only; it does not auto-instrument database or
provider calls. These durations are Next.js handling time; they do not measure
DNS/TLS, browser rendering, whole-function startup, database pool waiting or
individual query stages. Recheck the root-span contract when upgrading Next.js.
RSC records include automatic prefetches; their distribution alone does not
establish user-triggered navigation latency. Compare document records separately
and identify normal RSC requests in an isolated reproduction or hosting traces.

The platform's normal log pipeline receives records with
`kind: "wishlist-performance"`. Configure access/retention with the existing log
owner. Do not poll the database to collect performance data. Keep local benchmark
logs separate from production exports: a synthetic browser also produces browser
metrics, and the marker alone does not identify real visitors.

Export a bounded production log window using the hosting log tools and filter
application records by `wishlist-performance`. Never publish raw provider logs.
Summarize locally:

```bash
npm run performance:summary -- .local/performance/runtime.jsonl
```

The command accepts direct application JSONL or Vercel JSONL with a JSON `message`.
It discards all unknown fields/records, groups field values by route/device/metric,
and server values by route/method/transport/status class. It calculates nearest-rank
p50/p75/p95 and sample counts. A percentile from a few visits is not an acceptance
decision. Record the collection window, deployment, rate, lost/capped samples if
known, and at least 100 observations per relevant group before treating tails as
useful evidence. Do not average p95s across groups/windows.

## Isolated capacity lab

```bash
npm run performance:lab
```

The runner asserts the dedicated `wishlist_test` database and schema at
`127.0.0.1:55433` with a dedicated `performance` schema, starts its Docker services, applies existing migrations there,
and builds/starts the production app at `127.0.0.1:3017`. On macOS the browser
runner uses `caffeinate -i` only while it runs, preventing idle system sleep from
invalidating measurements. It never seeds development
or production databases. Other browser fixtures in the `wishlist` schema are not
visible to this app instance. Run it sequentially with integration/browser suites.

Datasets contain 0 lists/0 wishes, 10 lists × 20 wishes, and 100 lists × 50 wishes
for one verified owner. Every wish has a distinct protected image record/URL;
synthetic images share local bytes using hard links. This stresses previews and
pagination without external providers. Synthetic fixture records and image files
are removed after each completed case. An interrupted run's fixture records are
removed at the next run; inspect remaining local media files before deleting any.

The lab covers My lists, Browse lists/wishes and populated list detail. The empty
dataset also measures the signed-out homepage and Premium page; capacity pages
use a verified owner. It records five warmed service-query samples immediately
after seeding, then updates statistics only in the test schema and records five
more steady-state samples. Both phases retain statement counts, individual
statement durations, summed Prisma query-event duration (`databaseMs`) and
elapsed service duration. Query-event timings include adapter/round-trip work and
can overlap; their sum can exceed elapsed service time. They do not separate
PostgreSQL execution, pool waiting and network time.
Browser loads follow the statistics refresh, with three loads per
route/device/language/cache state.
EN uses light mode and FI dark mode. Desktop uses 1280 × 800/DPR 1 with no added
throttle. Mobile uses 390 × 844/DPR 3, 150 ms configured latency, 1.6 Mbps download,
0.75 Mbps upload and 4× CPU slowdown. A fresh browser context measures empty-browser
cache; reloading measures warm-browser cache. Server/database caches remain warm.
Local private media does not reproduce Blob or Neon wake-up latency.

Measurements include initial document TTFB, observed LCP/CLS, transfer bytes,
compressed JavaScript/image bytes, request count and Browse tab response time.
The observation window ends after fonts and network idle. LCP/CLS here describe
that initial window, not full-visit field metrics; tab response time is not INP.
Resources include the document and requests in that window, including prefetch
and telemetry overhead. `transferSize` includes response overhead and follows
browser timing/cache rules. No arbitrary millisecond threshold is a flaky test
assertion: functional errors, server failures and horizontal overflow fail the
suite, while recorded values inform the acceptance review.

Raw local reports are git-ignored under `.local/performance/<UTC-date>/`
(`.local/performance/2026-10-27/` for this acceptance). Reports
include the candidate commit, source/dependency fingerprint, dirty-tree flag,
browser/version, machine and conditions. Preserve the directory before repeating
the command, which replaces the dataset and query-phase files. Do not run unrelated builds or load tests while recording
timings. The sequential lab measures capacity of bounded page reads at increasing
dataset sizes; it does not establish peak concurrent users or a production SLA.

## Launch budgets

The owner accepted these field, server and transfer budgets on 27 October 2026.
They are review thresholds, not established production results. The local scaling
and interaction triggers below support investigation without claiming a production SLA:

| Measurement                                | Threshold                                                             | Evidence required                                               |
| ------------------------------------------ | --------------------------------------------------------------------- | --------------------------------------------------------------- |
| Field LCP / INP / CLS                      | p75 ≤ 2.5 s / 200 ms / 0.1                                            | Per device, adequate beta window/sample                         |
| Successful page/RSC server handling        | p95 ≤ 1 s; investigate repeated >2 s                                  | Separate route/transport, normal traffic and idle-start samples |
| Local larger vs typical page service reads | Investigate >2× sustained median growth or unbounded statement growth | Five samples; repeat isolated outliers                          |
| Mobile first-load transfer                 | Investigate >1 MB or >20% growth on the same fixture                  | Same route, browser, throttle and cache state                   |
| Initial-load layout and functionality      | CLS ≤0.1; no JS/5xx/media failures or overflow                        | All sampled conditions                                          |
| Local Browse tab interaction               | Investigate >1 s median                                               | Same network profile; excludes real-user INP                    |

For infrastructure cost, continue the owner's 3–7 day Neon observation from
[background jobs](background-jobs.md). Record CU-hour increments, sleep intervals,
compute size, remaining allowance/reset date, storage and traffic separately from
these local timings. A faster local query does not prove lower hosted costs or
justify disabling scale-to-zero. Peak-load and spending limits need a production
traffic forecast and Step 6 ownership.

## Remaining optimization decisions

Preserve the image/font work and all authorization, revocation and count-snapshot
rules. Do not replace repeatable-read reservation counts with independent reads
merely to reduce statement counts. Do not cache personalized responses publicly.

1. Repeated database/count reads: assess the current statement/timing baseline.
   Prioritize if normal page/RSC p95 exceeds 1 s or larger-fixture service medians
   repeatedly exceed twice the typical fixture. Trace authentication, pool waiting
   and query stages in an isolated reproduction before removing correctness reads.
2. Active-language-only client catalogs: defer until same-condition first-load
   JavaScript grows by >20%, transfer exceeds the threshold above, or browser
   traces identify parsing as material. Current client translation code imports
   both catalogs; no claim that it has already been split is made.
3. SQL-bounded previews/skipping covered-list previews: inspect the larger image
   fixture. Prioritize on growing database row work/service time despite bounded
   page size, or before much larger image-heavy lists. The ORM's per-parent limit
   and selected media count alone do not establish bounded SQL wish rows. A new
   SQL path needs access/order/count-consistency regression checks.

Static marketing pages, search indexes and hosting changes remain deferred until
traces show a corresponding bottleneck. Hosted field collection and production monitoring verification remain acceptance
work after deployment. The budgets are agreed.

## Implementation references

- [Next.js Web Vitals reporting](https://nextjs.org/docs/app/guides/analytics)
- [Next.js instrumentation](https://nextjs.org/docs/app/guides/instrumentation)
- [OpenTelemetry API](https://github.com/open-telemetry/opentelemetry-js/blob/main/api/README.md)
