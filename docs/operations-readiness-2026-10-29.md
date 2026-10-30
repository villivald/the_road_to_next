# Step 6 operations readiness — 29–30 October 2026

Status: **implementation and backup/restore verification ready; deployment and
owner acceptance pending**. A real encrypted hosted DB/media backup now passes an
offline local restore. Production status is clear across nine aggregate checks.
Off-device custody, live alert/support delivery, policy decisions and budget
adoption remain open. This report separates evidence from those pending actions.
The reusable procedures are in [the runbook](operations-runbook.md).

## Verified now

- Vercel CLI 54.6.1 resolves the linked `wishlist.fi` project, repository root,
  Node 24, Next.js and `npm ci`.
- `wishlist.fi` and `www.wishlist.fi` alias READY production deployment
  `dpl_4amH8C2euXwKtc5fzp4w3bnXBrhN`, Git SHA
  `32721ba8dfb9b37538dcdbdce048b0259b24b57b` on `main`.
- The Vercel team currently uses **Hobby**. Current alert groups were empty;
  one team-wide `Default Alert Rule` exists. Follow-up metadata confirms automatic
  owner/project-admin subscription; coverage and actual notification delivery
  have not been verified. An empty alert list does not
  mean alerts are correctly configured.
- `vercel usage --format json` returned `Costs not found (404)`. This does not
  establish zero usage/cost. Check the team's usage dashboard and provider bills.
- Production has configured names for app URL, sender, Resend, Paddle sandbox,
  direct DB URL, Inngest event/signing keys, Turnstile and performance monitoring.
  Values were not refreshed in this checkpoint. Local-only Mailpit/Inngest dev
  flags are absent from the production listing.
- The approved follow-up confirms one shared default `DATABASE_URL` entry for
  **Preview and Production**, no branch-specific database override, and the same
  `BLOB_STORE_ID` in both. Blob management confirms **Private** access in `arn1`
  (Stockholm). Preview is not an isolated recovery/test target. Actual deployed
  Preview behavior was not exercised.
- The owner confirmed personal operation in **Finland** and responsibility for
  `support@wishlist.fi`. Earlier controlled inbound
  receipt passed on 20 October, recorded in the ignored hosted acceptance report.
  A fresh reply/inbox test is still pending; no external email was sent here.
- Deployed source has five existing Inngest jobs; the candidate adds a sixth,
  opt-in final-failure handler. Source rejects Paddle live mode. The maintenance
  schedules and bounded batches are documented in [background jobs](background-jobs.md).

The initial broad `vercel env pull` was rejected by automatic approval review.
The owner subsequently approved narrow database/storage reads and TLS testing.
Only the approved connection-variable metadata and resource identifiers were
requested; Vercel omitted sensitive URL/project-ID values from its read API.
The current Blob identifier was readable. No full environment export or new
host-side provider-credential copy was created. The backup tool generates its own
separate private encryption keys. Credentials were never printed or committed.

TLS verification used the existing ignored `.env.production-migration.local`
connection copy dated 16 October; the relevant Vercel variable metadata was last
updated before that copy. Successful authentication establishes that this copy
still connects, not independent extraction of the current deployed URL strings.
The resource-sharing finding is supported by the current shared variable/store
mapping. No deployment, provider-setting change, paid upgrade or production
migration was performed. Hosted backup capture was read-only; no restore was
performed against the hosted database.

## Implemented operational tools

`operations:status` requires an exact host/port/database/schema confirmation
before connecting and runs a read-only transaction. It reports aggregate overdue
or failed email/invitation, billing and media signals. There is no HTTP health
endpoint exposing customer data, no scheduled SQL polling and no provider send,
refund or cleanup side effect. On 30 October it ran against the confirmed hosted
direct target and returned **clear**, exit 0: all nine attention counts were zero.
This is a point-in-time queue check, not continuous monitoring or provider uptime.

`operations:recovery-drill` deploys migrations into a fresh disposable local
PostgreSQL 18 container, captures a custom-format dump and local media, mutates
the source and restores into a second database. It verifies all table contents,
migration records, constraint metadata and selected constraint enforcement,
private-list membership, an active reservation and original/variant image bytes. It removes the
container afterwards. Fixture artifacts are ignored under `.local/operations/`.
This does not prove hosted backups, actual Neon history retention, Blob archive
recovery, production RPO/RTO or restored application access enforcement. The
separate real archive test below establishes DB/media export recovery, with those
stated cutover limits.

## Real encrypted manual backup and offline restore — passed 30 October

The owner selected encrypted manual Mac backups initially and will keep an
off-device copy. `operations:backup` now makes that procedure repeatable. It
requires explicit database/store confirmation and selected private settings
files, uses a verified direct TLS connection and a read-only exported PostgreSQL
snapshot, and archives attached ready originals plus their recorded variants.
It does not require a permanent Preview database or additional cloud storage.

The final tracked-command run captured at **04:45:31 UTC on 30 October** and
verified:

- **26 public tables, 176 rows**, including migration records; every restored
  table's row count and canonical SHA-256 content digest matched its source snapshot.
- **35 private image files**, totaling **1,153,326 bytes**; every original/variant
  byte count and SHA-256 matched.
- A saved **AES-256 GPG archive** was decrypted after the plaintext capture was
  removed; restoration ran with the container network disconnected, no public
  port, no application workers and no hosted restore.
- Restore/decrypt/verification took approximately **2.33 seconds**, with the entire
  small capture approximately **15.42 seconds**. This is not a measured production
  cutover time or a four-hour recovery guarantee.

Backup ID: `2026-10-30T04-45-28.845Z-52f6fb0d`.
The ignored directory `.local/operations/manual-backups/<backup-id>/` contains
`wishlist.tar.gpg` and `verification.json`; the separate restricted
`.local/operations/backup-keys/<backup-id>.passphrase` contains its random key.
The ignored `.local/operations/manual-backup.sh` records the confirmed repeat
command without passwords/tokens in its arguments. No plaintext customer dump or
media files were intentionally written to the Mac filesystem; temporary decrypted
data used Docker RAM filesystems, and the container was removed.

An earlier successful capture had 204 rows. An offline comparison of both encrypted
manifests found the row-count difference exclusively in `AuthRateLimit` (30 to 2),
consistent with expired-record cleanup; customer-content table counts did not
change. Each archive was independently compared with its own consistent source
snapshot. The final report describes the tracked command's capture, not a
cumulative row count.

**Owner action:** copy the encrypted archive and verification report off-device,
check the copied archive hash, and put the matching key in a separate password
manager location. Off-device protection has not been verified. Daily capture,
seven daily versions and a 24-hour data-loss target remain proposals; there is no
automatic backup scheduler or expiry. Confirm Neon's plan/history window separately.
Application authorization/cutover, external provider state and handling deletion
requests after a backup remain deliberate recovery work, not implied by SQL hashes.

## Alert and support follow-up

The candidate registers `operations-failure-alert` on Inngest final-failure events,
filtered to the five known Wishlist jobs. It is **disabled unless
`OPERATIONS_ALERT_EMAIL` is configured**. It reuses transactional email, omits raw
errors/customer data, excludes itself/other apps, retries its durable send step
three times and uses a stable per-run Resend idempotency key. Starts are limited
to one alert per failed job every four hours; additional events are discarded.
No cron, SQL polling, provider setting or external notification was added here.

Unit tests cover opt-in, recipient validation, metadata-only content, unsafe run
IDs, own/other-app exclusion, delivery failure and bounded worker registration.
One fictional alert was captured in a **disposable local Mailpit** inbox; both
text and HTML contained the run ID and omitted private fixture fields. The inbox
was removed. No external email was sent and Inngest Cloud delivery was not tested.

Current local Resend credentials received **401** on read-only account/domain
inspection; that does not establish a production sending failure or justify key
rotation. No Inngest management API key is available locally. Current plans,
provider notification recipients/coverage and quotas therefore still need console
confirmation. DNS follow-up found support MX at `mail.tutanota.de`, DMARC
`quarantine` and a Resend DKIM record; these do not prove sender alignment,
current inbox receipt or reply routing. The owner handles support, but a fresh
controlled hosted delivery/reply test remains pending authorization and deployment.

The alert covers jobs that fail, not every recipient error returned as a worker
result, missed schedules, queues, quota/spend or the mail provider's own outage.
Keep the dashboard/on-demand checks in the runbook. Before accepting live alerts,
deploy with the optional operator address, confirm Inngest sync/configuration,
and arrange one authorized controlled notification test without breaking a real job.

## PostgreSQL SSL warning: fix implemented locally; deployment pending

The installed `pg-connection-string` warning explains that `prefer`, `require`
and `verify-ca` currently alias `verify-full`; the next major changes semantics.
The stored connection copy uses `sslmode=require`. Both pooled and direct
connections succeeded with only that parameter changed in memory to
**`verify-full`**. Each client negotiated **TLS 1.3**, trusted the certificate,
validated the hostname and completed an explicitly read-only metadata transaction.
A deliberately wrong hostname was rejected with `ERR_TLS_CERT_ALTNAME_INVALID`.
`prisma migrate status` also succeeded using `verify-full` on the direct URL and
reported the database up to date. No migration was applied.

The database reports **PostgreSQL 18.6**. The recovery drill now uses
`postgres:18-alpine` (locally 18.6), matching its major version. A PostgreSQL 17
`pg_dump` is not suitable for this source: the client must be at least as new as
the server major. [PostgreSQL backup-client documentation](https://www.postgresql.org/docs/18/app-pgdump.html)

The backend `pg_stat_ssl` view returned `ssl=false`; it must not be used alone to
infer the security of this proxied Internet connection. The actual client TLS
socket was encrypted and certificate-authorized, and the negative hostname test
failed as expected. This verification makes no separate claim about Neon's
internal transport configuration.

The candidate adds `withExplicitNeonTls` to the application and Prisma CLI
configuration: Neon PostgreSQL URLs with `sslmode=require` become
`sslmode=verify-full` in memory. Other providers, local URLs, already explicit
modes and opt-in `uselibpqcompat=true` are preserved. Credentials, schema and
other query parameters are retained. No environment-value edit or migration is
needed for this candidate; integration-generated URLs are normalized on use.
This removes the ambiguous legacy alias for the tested configuration after the
reviewed code is deployed. It is **not yet a deployed resolution**. Confirm
runtime connectivity and absence of the old warning after deployment, and review
any explicitly selected compatibility mode separately. Sources:
[driver SSL guidance](https://node-postgres.com/features/ssl),
[connection-string semantics](https://github.com/brianc/node-postgres/tree/master/packages/pg-connection-string).

Sanitized hosted evidence is ignored at
`.local/operations/2026-10-29/hosted-target-verification.json` and
`blob-store-verification.json`. It contains comparisons, version/TLS results and
metadata, not passwords or connection URLs. The TLS check ran from this machine;
it does not reproduce the network path of a deployed Vercel function.

## Proposed initial beta budget — owner review required

Use a **€50/month planning envelope**, with a review at €35 projected and a
decision before €45 projected. These are operator review thresholds, not provider
hard caps. No paid plan, automatic pause, spending rule or purchase is activated.
Start with 20–30 invited testers and expand after a week of measured usage;
this is a rollout proposal, not an implemented signup/list/wish limit.

| Allocation                                 | Planning reserve          | Decision                                                                                                      |
| ------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| App hosting                                | €25/month                 | Reserve for a one-seat Vercel Pro plan if required for the actual use; current Hobby is confirmed             |
| Neon compute, storage and history          | €15/month                 | Observe 3–7 days, retain scale-to-zero, choose plan/history window from measured usage and recovery needs     |
| Private media and encrypted backup storage | €5/month                  | Manual encrypted Mac backup selected; owner supplies off-device destination and verifies separate key custody |
| Domain allocation / contingency            | €5/month                  | Check actual domain and mailbox invoices                                                                      |
| Resend and Inngest                         | Initially free allowances | Verify actual account plans, quotas and job executions before expanding invites                               |

These are EUR reserves, not converted quotes or guaranteed bills. Published USD
prices, exchange rates, taxes, compute/history/transfer and existing domain/mailbox
charges can change the outcome. If a paid email/jobs plan becomes necessary,
reapprove the envelope rather than silently adding it.

[Vercel pricing](https://vercel.com/pricing) currently lists Pro at $20/month.
[Hobby](https://vercel.com/docs/plans/hobby) is limited to non-commercial personal
use; confirm eligibility for this beta and its commercial intent before relying
on Hobby for launch. [Neon pricing](https://neon.com/pricing) lists Launch compute
at $0.106/CU-hour plus storage. [Resend pricing](https://resend.com/pricing) lists
a 100/day Free sending limit. [Inngest pricing](https://www.inngest.com/pricing)
distinguishes function runs from billable executions/steps; the 9,390 monthly
scheduled runs in source are not the entire usage forecast. Recheck actual
account quotas rather than treating generic pricing as an account audit.

Keep existing unrestricted list/wish counts for the measured small-beta proposal;
do not add arbitrary content limits without evidence. Reconsider on measured
storage/transfer growth or capacity-budget breaches. Existing upload, pagination,
rate and worker-batch limits continue to apply.

## Local verification

- ESLint, Stylelint, Prettier, TypeScript and **208 unit tests** passed.
- **292 isolated integration tests** passed, including aggregate queue reporting,
  completed/deferred work and unchanged data after reads.
- The final candidate build passed with TLS normalization and alert registration.
  No public UI or route was added.
- The final fictional recovery drill restored **26 tables** and both the original
  image and its responsive variant. Table/migration digests, constraint metadata,
  selected constraint enforcement and membership/reservation state passed.
- CLI smoke checks on `wishlist_test` returned exit 2 for deliberately retained
  media-failure fixtures and exit 1 for a mismatched port, as documented. No
  hosted write was run. The final follow-up also ran the read-only hosted status
  command (all zero) and restored the encrypted archive locally as detailed above.
- No migration or package dependency was added. Three package scripts expose
  on-demand status, real encrypted backup/verification and the fictional drill.
  `OPERATIONS_ALERT_EMAIL` is the single optional new server-only setting; no
  production environment value was changed.
- After hosted PostgreSQL 18 was identified, the local drill was rerun on 18.6;
  all 26 tables, constraint checks and both media files passed again. The TLS
  normalization has separate regression coverage and uses the same explicit
  parameter that passed the hosted read-only checks.

The fictional drill evidence is ignored at `.local/operations/recovery-KPK0yF/verification.json`;
its fixture restore/verification took approximately 1.21 seconds. This tiny local
fixture does not establish hosted recovery time. Hosted capture, status and local
mail acceptance evidence are ignored under `.local/operations/`. Console logs and private provider
metadata stay outside Git. Changes remain uncommitted and undeployed.

## Preview infrastructure — deferred by owner

On 29 October the owner chose to proceed without a separate permanent Preview
database/store. The read-only Vercel deployment listing returned **zero READY,
BUILDING or QUEUED Preview deployments**, with no next page. Evidence is ignored
at `.local/operations/2026-10-29/preview-deployment-review.json`.

The accepted workflow is local development/isolated tests, then reviewed production
deployment. **Permanent Preview separation is not a Step 6 release gate.** Shared
configuration remains documented; no provider setting or credential scope was
changed, and future Preview creation has not been disabled. Revisit resource
isolation before using Preview for testing. A real backup restore still needs an
isolated disposable target; it does not require maintaining a Preview database.

## Remaining gates, owner and next action

| Gate              | Owner                                        | Next concrete action                                                                                                                                       |
| ----------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSL configuration | Service owner with agent verification        | Review and deploy the tested URL-normalization candidate, then confirm runtime connectivity and absence of the warning                                     |
| Backup custody    | Service owner                                | Real export/offline restore passed; copy the accepted archive off-device, keep the key separately, adopt cadence/retention and confirm Neon history window |
| Alerts            | Service owner with agent verification        | Deploy optional handler/configuration, confirm Inngest sync and provider rules/quotas, then authorize and verify one controlled hosted notification test   |
| Support handover  | Service owner                                | Approve one controlled inbound test and reply; verify sender/reply routing and adopt a response target                                                     |
| Policy/retention  | Service owner and appropriate legal reviewer | Review [the EN/FI draft](public-policy-draft.md), decide archives/billing/backup retention and publish reviewed copy                                       |
| Cost              | Service owner                                | Approve/revise the proposed envelope and rollout size; confirm current plans, remaining allowances and reset dates                                         |

The operator name/country and support owner are resolved. No other pending gate
becomes passed through documentation alone. Step 5 field/Neon observations and
the previously accepted manual guest-expiry/device/email-client checks continue
alongside this work. Step 7 live billing remains separate.
