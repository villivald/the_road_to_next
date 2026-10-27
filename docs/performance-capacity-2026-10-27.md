# Performance and capacity acceptance — 27 October 2026

The local implementation passes the agreed investigation thresholds in this lab.
Optional monitoring works on the production build and remains disabled by default.
Production activation and a beta field-measurement window are still required;
these results do not establish real-user percentiles or peak concurrent capacity.
No database migration or application SQL change is needed for this implementation.

## Method and evidence

Base commit: `96cd784`, plus the Step 5 working-tree changes. Raw reports capture
their source/dependency fingerprint, dirty-tree flag, conditions and machine.
Measurements used Node 24.14.0, Chromium 153.0.8010.12, an Apple M4 Pro with 14
logical CPUs and 24 GiB RAM, and the dedicated local `performance` schema.
Fixtures were removed after each case. Development and production data were not
used. The macOS runner prevented idle system sleep during the accepted pass.

The sequential production-build suite passed all 15 cases: three capacity cases
and 12 monitoring cases across Chromium, Firefox and WebKit. It recorded 312 page
loads and 36 Browse-tab interactions. EN/light and FI/dark, fresh and warm browser
caches, desktop and a configured mobile network/CPU throttle were covered. The
signed-out homepage and Premium page were measured alongside the empty fixture;
the capacity pages used a verified owner. See the
[repeatable method and monitoring instructions](performance-and-capacity.md).

Each service operation has five samples immediately after bulk seeding and five
after updating statistics in the isolated schema. Browser measurements follow the
statistics update. Database timings are Prisma query-event timings, not separate
PostgreSQL execution or pool-wait measurements. Per-operation query counts below
count those events, including reported transaction commands.

## Service reads

Median elapsed milliseconds after updating test statistics:

| Service       | Empty | 10 lists × 20 wishes | 100 lists × 50 wishes | Query events/call, populated |
| ------------- | ----: | -------------------: | --------------------: | ---------------------------: |
| My lists      |   1.8 |                  5.6 |                   9.8 |                            7 |
| Browse lists  |   2.0 |                  2.2 |                   6.8 |                            5 |
| Browse wishes |   1.3 |                  1.3 |                   6.0 |                            3 |
| List detail   |     — |                  1.7 |                   1.7 |                            2 |

The larger My lists fixture measured 16.4 ms immediately after seeding and 9.8 ms
after updating statistics. An earlier pass measured approximately 200 ms. Focused
traces and the accepted pass did not reproduce that result; its exact original
plan/cause was not captured. Keep that observation as a diagnostic follow-up,
without claiming an application fix or attributing it conclusively to statistics.

Browse medians grew with the 25× larger wish dataset, while query-event counts
remained constant. The observed 6–7 ms reads do not justify a query rewrite or
weaker access checks. Reservation counts retain their existing repeatable-read
snapshot and authorization rules.

## Downloads and interactions

Maximum first-load transfer in decimal KB across the sampled routes/languages;
Browse-tab values are median milliseconds. The empty case includes the additional
homepage and Premium routes, so its maximum is not a like-for-like growth ratio.

| Dataset                    | Desktop transfer | Mobile transfer | Desktop tab | Mobile tab |
| -------------------------- | ---------------: | --------------: | ----------: | ---------: |
| Empty plus marketing pages |           599 KB |          951 KB |       84 ms |     277 ms |
| 10 × 20                    |           620 KB |          642 KB |      104 ms |     486 ms |
| 100 × 50                   |           660 KB |          648 KB |      110 ms |     481 ms |

Premium was closest to the agreed 1 MB investigation threshold, at approximately
951 KB on mobile. Further artwork additions need a same-condition transfer check.
The larger capacity fixture stayed below 648 KB on mobile. All sampled initial
layout-shift values were below 0.017; no application exceptions, failing media
responses, HTTP 5xx responses or horizontal overflow were recorded in the accepted
pass. These initial-window lab observations are not field LCP/INP/CLS acceptance.

Completed matched document requests in the local run had per-route server p95s
below 35 ms. Server handling excludes browser/network time and production startup,
Neon wake-up and Blob latency. RSC records include prefetches and are kept separate;
they do not by themselves measure user-triggered navigation.

## Monitoring and optimization decisions

The monitoring suite verifies normalized labels, no cookie/referrer on reports,
guest-exchange exclusion, and Do Not Track/Global Privacy Control in all three
engines. Chromium explicitly delivered LCP, INP and CLS after an interaction and
document exit. Other engines report the metrics they support. Matched-route
filtering removes internal routing probes that otherwise duplicate near-zero
server samples. The summarizer successfully groups validated local log records;
these exports remain labeled and stored as lab evidence.

The owner accepted field p75 LCP ≤2.5 s, INP ≤200 ms and CLS ≤0.1; investigate
normal page/RSC server p95 >1 s, mobile first-load transfer >1 MB, or >20% growth
under identical conditions. The field thresholds still need production evidence.

- **Repeated database/count reads: deferred.** Current service/server timings fit
  the budget. Investigate the earlier 200 ms observation if repeated; prioritize
  request-stage tracing when normal hosted p95 exceeds 1 s or the same fixture
  regresses materially. Preserve the count snapshot and access checks.
- **Active-language-only client catalogs: deferred.** Both catalogs remain in
  the client translation path. Revisit on >20% same-condition JavaScript growth,
  transfer-budget failure or a trace showing material parse/execute cost.
- **SQL-bounded previews and covered-list skipping: deferred.** The generated
  preview SELECT still lacks a per-list SQL limit; the ORM/UI cap does not prove
  bounded wish-row work. Revisit with substantially larger/image-heavy lists,
  cover-heavy fixtures or rising query time. Current tests do not establish that
  this overfetch has been fixed.

Static marketing pages, search indexes and hosting changes remain measurement-led
follow-ups. Neon usage/sleep monitoring remains the owner's parallel 3–7 day task.

## Verification and rollout

ESLint, Stylelint, Prettier, TypeScript, 190 unit tests, 288 isolated integration
tests and production builds pass. The existing privacy/information UI coverage
also passes both Chromium projects at 320px, light/dark, 200% text, reduced motion
and automated accessibility checks. Real-device and screen-reader follow-ups
remain the previously accepted manual work.

Raw accepted artifacts are git-ignored:

- `.local/performance/2026-10-27/{empty,typical,larger}.json` and query-phase JSONs
- `.local/performance-verified.log`
- `.local/performance/lab-runtime.jsonl` and `lab-summary.json`
- `.local/performance-check-final.log`, `performance-integration.log` and
  `performance-policy-ui.log`

Earlier failed/suspension-affected runs remain diagnostic history, not the accepted
result. The final test-only output-directory change makes future runs use their
UTC date; it does not change application code or the measurements above.

After review, deploy with `PERFORMANCE_MONITORING=1` and
`PERFORMANCE_SAMPLE_RATE=0.1`. Confirm sanitized server and browser records on that
deployment, then collect a bounded beta window with adequate samples per group.
Set the monitoring flag to `0` and redeploy to disable it. No migration, new
scheduled job or database polling is needed. This task did not deploy or change
production configuration.
