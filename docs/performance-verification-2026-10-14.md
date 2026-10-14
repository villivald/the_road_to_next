# Production performance verification — 14 October 2026

The responsive images and WOFF2 fonts have a measurable production benefit. They
reduce first-visit downloads by roughly 36–41% in the directly throttled mobile
tests, and the image saving also applies to return visits. Lighthouse mobile scores
rose from 90–91 to 97. Observed visible-content paint times did not improve uniformly,
so this should not be described as a universal percentage speedup.

## Method

The production site, `https://wishlistfi.vercel.app`, was compared with the saved
13 October audit. No application code, database records, storage files, or deployment
settings were changed during this verification.

- Twelve Lighthouse runs, three per route, used version 13.5.0, the same Chrome
  153 browser version, and identical simulated throttling settings as the baseline.
- Twelve directly throttled production browser loads, three per route, used a
  390 × 844 viewport, DPR 3, 150 ms configured latency, 1.6 Mbps downloads, and
  4× CPU slowdown. The original direct-browser baseline had two samples per route.
- Eleven additional unthrottled loads covered public pages and details, mobile
  and desktop Browse, and a warm-browser reload. These match the original route
  selection procedure.
- Tests ran sequentially so Lighthouse and browser measurements did not compete
  with each other for CPU or network bandwidth.
- Browse's before/after images had the same IDs and displayed dimensions. The
  smaller files were selected from their new variants, rather than obtaining savings
  by removing pictures or shrinking the layout.

These are repeated production lab tests, not real-user percentiles. They compare
different days rather than randomly assigned simultaneous deployments. Network,
server load, cache state, and normal timing variation can affect the timing results.
The asset-byte reductions are more directly attributable to the changes.

## Measured downloads

Decimal KB, rounded. Mobile totals include document, fonts, scripts, CSS, images,
and RSC requests recorded during the initial measurement window.

| Measurement                           | Before |  After | Reduction |
| ------------------------------------- | -----: | -----: | --------: |
| Fresh font transfer                   | 318 KB | 112 KB |       65% |
| Mobile list-preview image, DPR 3      | 112 KB |  40 KB |       64% |
| Mobile wish-card image, DPR 3         | 112 KB |  66 KB |       41% |
| Desktop list-preview image, DPR 1     | 112 KB | 4.6 KB |       96% |
| Mobile homepage initial transfer      | 570 KB | 364 KB |       36% |
| Mobile Browse lists initial transfer  | 675 KB | 397 KB |       41% |
| Mobile Browse wishes initial transfer | 677 KB | 425 KB |       37% |
| Mobile Premium initial transfer       | 573 KB | 366 KB |       36% |
| Warm mobile Browse reload             | 130 KB |  59 KB |       55% |

The mobile list stack displayed the image at 178 × 178 CSS pixels and selected
the 800 px variant. The mobile wish card displayed it at 358 × 269 CSS pixels and
selected the 1200 px variant. The desktop preview selected the 200 px variant.
Screen density therefore still controls image quality; mobile does not simply
receive the smallest available file.

On the unthrottled warm reload, fonts and JavaScript transferred zero bytes in both
versions. The protected image remained private/no-store and was downloaded again,
but its smaller size reduced that reload's total by approximately 71 KB. The
performance improvement does not depend on weakening image access or caching rules.

## Mobile Lighthouse

Median of three runs per route. LCP is Lighthouse's simulated largest contentful
paint, not the observed browser timing in the following section.

| Page          | Score before → after | LCP before → after | Transfer before → after | TBT before → after |   CLS |
| ------------- | -------------------: | -----------------: | ----------------------: | -----------------: | ----: |
| Homepage      |              91 → 97 |      3.55 → 2.58 s |            574 → 369 KB |         18 → 23 ms | 0 → 0 |
| Browse lists  |              91 → 97 |      3.48 → 2.57 s |            677 → 372 KB |          6 → 14 ms | 0 → 0 |
| Browse wishes |              90 → 97 |      3.62 → 2.57 s |            679 → 402 KB |         12 → 14 ms | 0 → 0 |
| Premium       |              91 → 97 |      3.49 → 2.57 s |            576 → 370 KB |         15 → 16 ms | 0 → 0 |

Simulated LCP improved by approximately 0.9–1.05 seconds, or 26–29%. First
contentful paint stayed around 0.92 seconds. Blocking time remains low; the small
increases above should not be presented as an improvement or meaningful evidence
of a regression from these samples alone.

Lighthouse uses a different viewport/network model from the directly throttled
DPR-3 runs, so its image selections and transferred totals differ. These two sets
of measurements should not be averaged together.

## Observed browser timing

Directly throttled mobile measurements:

| Page          | Observed LCP median before → after | Slowest font download median before → after |
| ------------- | ---------------------------------: | ------------------------------------------: |
| Homepage      |                      2.13 → 1.33 s |                               3.05 → 1.87 s |
| Browse lists  |                      1.29 → 1.37 s |                               3.57 → 2.01 s |
| Browse wishes |                      1.03 → 1.00 s |                               3.57 → 2.03 s |
| Premium       |                      1.62 → 1.61 s |                               3.07 → 1.87 s |

The homepage's original two samples varied widely, so its median improvement is
not sufficient evidence for a precise homepage speedup. Browse lists was slightly
slower in visible-content paint, while Browse wishes and Premium were broadly
unchanged. Text/fallback content can paint before fonts finish downloading, which
explains why a substantially smaller font payload does not necessarily advance
observed LCP.

Asset completion did improve: on Browse, the slowest font download fell by about
1.5 seconds. The list-preview image request fell from a median 2.16 to 1.22 seconds,
and the wish-card image request from 2.15 to 1.43 seconds. Those request timings also
include variable server/network waiting, so they are supporting evidence rather
than a guaranteed reduction for every user.

No application JavaScript errors or failed private-media responses were recorded
in the additional public-page browser checks. Observed initial-load CLS remained
below 0.001 in the throttled runs and was zero in the unthrottled checks.

## Conclusion and next measurement

The change is worthwhile: first visits download substantially less data, return
visits keep an image-related saving, assets finish sooner under constrained
bandwidth, and Lighthouse reports better mobile loading performance. Visual size
and access protections were retained.

The next useful evidence is privacy-conscious real-user LCP, INP, and CLS, plus
server p95 timings. It would establish how these improvements affect actual
visitors and whether database round trips or cold responses remain noticeable.
This verification does not justify claiming that the whole app is 40% faster or
that every tab transition is now quicker.

Raw before/after evidence is git-ignored under:

- `img/performance-audit-2026-10-13/`
- `img/performance-check-2026-10-14/`

The new directory contains all Lighthouse reports, browser traces/resource totals,
screenshots, and `comparison.json`. Only this report is added to tracked work.
