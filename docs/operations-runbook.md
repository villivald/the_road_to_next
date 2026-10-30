# Wishlist operations runbook

Reviewed 30 October 2026. Owner: **Service owner, Finland**. Support and incident
contact: **support@wishlist.fi**, handled by the owner (owner-confirmed). No secondary
responder is appointed. This is an owner-operated beta, without a 24/7 response SLA.

Step 6 implementation includes on-demand status, a fictional recovery drill,
encrypted manual backup with an offline verified restore, and an opt-in final-job
failure alert. Off-device backup/key custody, deployed alert delivery and final
policies remain open. Permanent Preview infrastructure is deferred by the owner;
see [the evidence and decisions](operations-readiness-2026-10-29.md).

## Environments and ownership

| Service                    | Purpose and confirmed target                                                        | Operational owner / evidence                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Vercel                     | `wishlist.fi`, the linked Vercel team, repository root, Node 24                     | Service owner; linked-project inspection on 29 October                                                                  |
| Neon                       | PostgreSQL; existing runtime uses a pooled connection, migrations use `DIRECT_URL`  | Service owner is the accountable app owner; provider account access, plan and recovery window need console confirmation |
| Vercel Blob                | Private original images and responsive variants                                     | Service owner; `arn1`, private; hosted-object archive and offline checksum restore passed on 30 October                 |
| Resend                     | Transactional account, invitation and group messages                                | Service owner; earlier hosted delivery evidence, current sending-domain settings need recheck                           |
| Inngest                    | Email/billing recovery, immediate events, media/auth maintenance and failure alerts | Service owner; five existing jobs plus one opt-in alert handler; deployed Cloud configuration/delivery need recheck     |
| Paddle                     | Sandbox subscription lifecycle only                                                 | Service owner; live API use is rejected in code; live activation belongs to Step 7                                      |
| Cloudflare Turnstile       | Signup/recovery/resend abuse protection                                             | Service owner; production variable names are configured; keys must match allowed domains                                |
| Domain and inbound support | `wishlist.fi`, `support@wishlist.fi`                                                | Service owner; inbound receipt passed on 20 October; owner reconfirmed handling on 29 October                           |

Confirmed production deployment: `dpl_4amH8C2euXwKtc5fzp4w3bnXBrhN`, READY,
Git commit `32721ba8dfb9b37538dcdbdce048b0259b24b57b`, branch `main`.
This is a dated observation, not a permanent deployment identifier.

| Environment       | Database / media / delivery boundary                                                                                                                                                                |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local development | `wishlist_dev`, port 55432; local media and Mailpit; `.env.local` overrides `.env`                                                                                                                  |
| Automated tests   | `wishlist_test`, port 55433, schema `wishlist`; test-only media/inbox and provider fixtures                                                                                                         |
| Recovery drill    | A new disposable PostgreSQL container, two fixture databases, local fixture media; no hosted providers                                                                                              |
| Production        | Hosted Neon and private Blob, real transactional delivery, Inngest Cloud, Paddle sandbox                                                                                                            |
| Vercel Preview    | **Not approved as staging.** The default database entry and Blob store are shared with Production, with no branch-specific database override listed. Preview also has separate Inngest key entries. |

The owner chose to defer a permanent Preview database/store on 29 October.
The current workflow is local development and isolated local tests, followed by
reviewed production deployment. Vercel listed no READY, BUILDING or QUEUED Preview
deployments at the review time. Separate Preview infrastructure is not required
to close Step 6 under this workflow. Future automatic or manual Preview creation
has not been disabled by this decision; do not use shared-resource previews for
experiments, migrations, cleanup or recovery. Revisit isolation before adopting
Preview as a testing workflow. Backup restoration still requires a disposable,
isolated target, which need not be a permanent Preview environment.

Before enabling staging, assign a separate Neon branch/database, private Blob store,
Inngest environment and test-only email recipients. Keep Paddle sandbox isolated
from future live billing. Check every Preview branch override and integration
mapping; the presence of separately named keys is not proof of separate resources.
Do not test restores, outages or cleanup on an unverified Preview deployment.

Local `.env` contains hosted credentials. Loading `.env.local` does not remove
unshadowed keys inherited from `.env` or the process. Never run maintenance merely
because the current app is local. Keep exports, private URLs and credentials out
of Git and chat; verify the host, port, database, schema and provider before acting.

## Connection security

The approved read-only follow-up verified TLS 1.3, trusted certificates and
hostname checks on the stored pooled/direct Neon connection copy, plus rejection
of a deliberately wrong hostname. Prisma migration status passed with explicit
`verify-full`. Current sensitive Vercel URL values could not be extracted, so
this is a connection test using the existing private copy rather than an exact
export of deployed settings. Details and limits are in the readiness report.

The local candidate normalizes Neon `sslmode=require` to `verify-full` in memory
for both runtime and Prisma CLI configuration. It preserves other parameters and
explicit compatibility settings. Review and deploy the candidate, then verify
runtime connectivity and that the old alias warning is absent. No environment
edit or migration is required for this fix. The candidate is not yet deployed.

## Routine checks and escalation

During the invited beta, the owner checks provider dashboards once each working day
and after a deployment. This cadence is proposed until alert delivery is verified.
Use provider uptime/error signals for frequent monitoring; frequent SQL health
polling can prevent Neon suspension. Do not keep an auto-refreshing DB browser open.

The on-demand status command performs a read-only, repeatable-read transaction,
with statement/transaction timeouts. It prints counts and the confirmed DB target,
never recipients, titles, private links or payment identifiers. For local development:

```sh
npm run operations:status -- --host 127.0.0.1 --port 55432 --database wishlist_dev --schema public
```

For another database, supply its independently confirmed target with all four flags
and the existing authorized `DATABASE_URL`. Process values win over `.env.local`
and `.env`. The command refuses a mismatch before connecting. Exit 0 means no
listed backlog signal, 2 means investigate, 1 means configuration/query failure.
It does not establish provider availability, inbox receipt, spend or job execution.

| Signal                                    | Initial investigation threshold                                                                              | Response                                                                                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Account emails or active list invitations | Due time more than 30 minutes late, or terminal delivery failure                                             | Inspect Inngest run and Resend delivery; preserve idempotency state                            |
| Billing events                            | Unprocessed and due more than 30 minutes ago                                                                 | Inspect signed event and reconciliation; never grant access from a payload alone               |
| Billing accounts                          | At least three failed synchronizations                                                                       | Inspect provider state, leases and cancellation retries                                        |
| Deleted account                           | Non-canceled provider subscription after 30 minutes                                                          | Prioritize cancellation reconciliation; do not delete the billing recovery record              |
| Detached media                            | More than two hours past cleanup due time, or at least three failures                                        | Inspect storage permission/retry result; never delete rows before all object paths are removed |
| Inngest schedules                         | No successful quarter-hour job for 30 minutes, hourly cleanup for two hours, daily auth cleanup for 26 hours | Confirm Cloud app/environment, deployment sync and signing keys                                |
| Web/app errors                            | Repeated 5xx, sign-in outage, private access leak or lost data                                               | Incident procedure below; privacy incidents are urgent                                         |

Future-due retries, completed/canceled work and expired invitations are excluded
from the relevant backlog signals. A clear report does not mean there are no
future retries. See [schedules and worker limits](background-jobs.md) and
[performance budgets](performance-and-capacity.md).

Do not blindly reset terminal email failures: ambiguous sends are capped before
Resend's idempotency window expires. Do not run mutating `billing:sync`, delivery,
cleanup or backfill commands as health checks. They perform real work on their
configured target.

### Final background-job failure alerts

Set the server-only production variable `OPERATIONS_ALERT_EMAIL=support@wishlist.fi`
to opt in, then deploy and confirm Inngest app sync includes
`operations-failure-alert`. Existing email provider/sender settings are reused;
there is no extra provider, cron job or database polling. Unset the variable to
disable sending. Do not enable local `MAILPIT_URL` or `INNGEST_DEV` in production.

The handler listens for `inngest/function.failed`, filters to this app's five
existing job IDs, and sends only the job label and opaque failed-run ID. It omits
the original event, error message/stack, customer email and private links.
Its own failures and other apps' jobs are excluded. A durable step, three retries
and a stable Resend idempotency key handle transient sends. A per-job start limit
admits at most one alert every four hours; further events in that interval are
discarded, not deferred. This deliberately limits incident email volume.

This is **not** comprehensive provider monitoring: recipient failures returned as
worker results, silent/missed schedules, pending queues, spend and an unavailable
mail provider still need dashboard/status checks. Inspect Inngest directly if
the alert handler or its email provider fails. Vercel's current default rule
automatically subscribes owners/project admins, but delivery was not tested.

After deployment, inspect the registered trigger/filter/rate limit and arrange
one authorized controlled notification test. Verify receipt, subject/run ID and
sender/reply routing; do not deliberately break a production job. Local Mailpit
acceptance does not prove Inngest Cloud or Resend delivery.

[Inngest final-failure events](https://www.inngest.com/docs/reference/system-events/inngest-function-failed),
[rate-limit semantics](https://www.inngest.com/docs/durable-execution/flow-control/rate-limiting).

## Deployment and rollback

1. Review the diff, run `npm run check`, the isolated integration suite and the
   tests relevant to the change; build the candidate. Record its exact Git SHA.
2. Inspect the linked target with `vercel project inspect --non-interactive`.
   Confirm the intended database, media store and payment environment. Review
   migration files; this Step 6 tooling adds **no migration**.
3. For a schema change, take and verify a recoverable backup first. Use the
   independently confirmed direct URL for `npm run db:migrate`; never a test seed
   or `prisma migrate reset`. Prefer additive, backwards-compatible changes.
4. Deploy the reviewed candidate through the existing Git integration. Confirm
   READY, source SHA, domain aliases and function configuration. Smoke-test EN/FI,
   signed-out access, sign-in, protected media, email/jobs and sandbox billing as
   applicable. Do not create a charged live transaction as a smoke check.
5. On a code regression, inspect the last compatible deployment and its schema
   requirements. Use `vercel rollback <verified-deployment-url>` only after choosing
   the compatible target; recheck domains, keys, jobs and critical flows afterwards.
   Record incident time, affected SHA, rollback SHA and verification.

Code rollback does not reverse a database migration, object deletion, delivered
email or provider payment. Existing deployments may contain older environment
configuration. Inngest app synchronization and current secrets must agree with
the selected code. Roll forward with a corrective migration when that is safer
than restoring data. [Vercel rollback documentation](https://vercel.com/docs/deployments/rollback)

## Database and media recovery

Proposed beta objectives: restore service within **four hours**, with at most
**24 hours** of data loss for a daily independent backup. These are targets awaiting
approval, not an SLA or measured production cutover capability.
The actual Neon history window may be shorter; record it before promising recovery.

The database stores media paths and variant metadata, not image bytes. A database
backup alone cannot recover deleted Blob files. A Neon history restore does not
restore Blob, Inngest, Resend or Paddle state.

The owner chose encrypted manual Mac backups initially and will keep an off-device
copy. A real hosted DB/media archive passed an offline local restore on 30 October.
The owner must still confirm Neon's actual plan/history window and complete off-device
custody. Proposed cadence: daily backup and before risky migrations, seven daily
versions, restricted operator access, and keys stored separately in a password
manager. Cadence/retention are proposals, not an automated scheduler or expiry job.

### Repeat the encrypted manual backup

Docker and GPG must be available. The command reads only selected connection/storage
settings from explicitly named private files and requires independently confirmed
host, port, database, schema and Blob store. Use the direct Neon PostgreSQL 18
connection and `public` schema; do not paste passwords/tokens into shell arguments.
The database settings file needs `DIRECT_URL`; the media settings file needs
`BLOB_READ_WRITE_TOKEN` and `BLOB_STORE_ID`. They can be the same private file.

```sh
npm run operations:backup -- \
  --database-env "$BACKUP_DATABASE_SETTINGS_FILE" \
  --media-env "$BACKUP_MEDIA_SETTINGS_FILE" \
  --host "$CONFIRMED_DATABASE_HOST" --port 5432 \
  --database "$CONFIRMED_DATABASE_NAME" --schema public \
  --blob-store "$CONFIRMED_BLOB_STORE_ID"
```

Those shell variables are nonsecret file paths/target identifiers you set from
the independently confirmed configuration. On the operator's current Mac, the ignored
`.local/operations/manual-backup.sh` contains the confirmed arguments and can be
run with `sh .local/operations/manual-backup.sh`. Its settings files are existing
private copies, not a fresh Vercel secret export; refresh deliberately if rotated.

The tool exports a read-only, repeatable-read PostgreSQL snapshot with matching
`pg_dump`, downloads every ready attached original and its recorded variants,
and rejects missing objects. It writes an AES-256 GPG archive plus a verification
report under `.local/operations/manual-backups/<capture>/`; a random mode-600
passphrase file goes under the separate `.local/operations/backup-keys/` directory.
The plaintext dump/media and restored database use temporary Docker RAM filesystems.
The source password uses a temporary mode-600 container `PGPASSFILE`, never argv.

Before accepting the archive, the tool deletes its plaintext capture, disconnects
the container's network, decrypts the saved archive, restores into the disposable
database, and compares every public table's row count/content digest and all media
checksums. It removes the container afterwards. A failed or interrupted run without
successful `verification.json` is **not** an accepted backup. If forcibly killed,
check for a leftover `wishlist-hosted-recovery-*` container and remove only that
temporary container before retrying.

The initial tool intentionally stops above 128 MiB database size, 64 MiB captured
media, 1,000 objects, unsupported paths/version or its timeouts. Expand these
limits only after reviewing storage/memory needs. Media capture is not an atomic
snapshot across providers: a concurrent deletion makes capture fail; retry in a
quiet window. Unattached/deleting upload bytes are not archived. The tool does
not start application workers, send email, restore a hosted target or change source
rows. Restored application authorization and a full hosted cutover remain separate
recovery checks.

After a successful run:

1. Copy `wishlist.tar.gpg` and its `verification.json` to your chosen off-device
   destination. Compare the archive's `shasum -a 256` with `archiveSha256` in the
   report after copying.
2. Save the corresponding passphrase securely in your password manager, identified
   by backup ID. Keep it separate from the off-device archive; do not send or commit
   it. Losing it makes the archive unusable. Separate folders on the same Mac do
   not protect against losing the Mac.
3. Record destination/date and key custody privately. Retain the local working
   copy until the off-device archive and independent key access are verified.
   Apply the eventual approved retention policy manually; no expiry is automated.

The encrypted tar contains `database.dump`, a checksummed `manifest.json`, and
`media/images/`. Standard GPG/tar/PostgreSQL 18 tools can read it independently
of this repository; handle decryption in a restricted isolated recovery environment.

### Recovery and controlled cutover

1. Confirm a direct, read-only source connection and the intended DB. The checked
   hosted endpoint reports PostgreSQL 18.6; use PostgreSQL 18 or newer dump tools,
   and recheck the server version before each backup. Record source SHA,
   migration checksums, schema and a coordinated capture time.
2. Run `pg_dump` in custom format using secure connection configuration (for
   example `PGHOST`, `PGDATABASE`, `PGUSER` and a mode-600 `PGPASSFILE`). Never put
   passwords in shell command arguments. Keep the dump encrypted with restricted
   access; record its SHA-256 digest and capture completion time.
3. Archive private original media plus **every** `imageStoragePaths` variant.
   Record object path, byte count and SHA-256. Quiesce writes/cleanup or reconcile
   objects changed during capture; a dump and a later object list are not an
   atomic cross-provider snapshot. Do not publish private Blob URLs.
4. Restore into a new, isolated target with no production credentials, outbound
   email, Inngest triggers, public domain or webhook registration. Use
   `pg_restore --exit-on-error --no-owner --no-privileges` with the verified target.
   Keep it inaccessible to customers while validating rows, foreign keys,
   migrations, access rules, originals and variants against the manifest.
5. Verify a private list, admin membership, active reservation, guest-link expiry,
   media access denial and the required representative application flows. A
   restored dump contains old sessions/tokens and delivery/reconciliation state;
   invalidate restored access credentials and reconcile side effects before any
   controlled cutover. Do not replay queued emails or sandbox/live billing blindly.
6. Choose a cutover only after review of lost writes, deletion requests since the
   backup, provider billing state and object paths. Confirm configuration, run
   smoke checks, enable workers deliberately and observe recovery. Preserve the
   original target until the recovery is accepted; record data loss and timing.

Neon instant restore overwrites a branch's database state. Prefer recovery into
an isolated target for verification; never test it against the production branch.
Confirm the current supported branch/restore method and retained history in the
[Neon documentation](https://neon.com/docs/introduction/branch-restore).

Run the independent **fictional local drill** with Docker:

```sh
npm run operations:recovery-drill
```

It creates its own PostgreSQL 18 container, deploys the repository migrations,
seeds fictional private content, dumps it, changes the source and restores into
a second database. It compares all table contents (including migration records),
constraint metadata and selected constraint enforcement, private
membership/reservation state and original/variant media checksums, then
removes the container. Artifacts stay under ignored `.local/operations/recovery-*`.
It never loads `.env` or starts app/provider workers. This verifies the local
mechanics; it does not establish Neon point-in-time recovery or Blob recoverability.

## Incidents and support

The owner handles triage, recovery and customer updates. Record incident start/end in UTC,
source SHA, affected routes/services, privacy impact, actions and evidence without
customer contents. Prioritize access leaks, lost data and stuck subscription
cancellations. Pause affected writes/workers deliberately if they would worsen
damage. Preserve logs before retention expires and involve the provider for a
provider incident. Restore only after identifying the cause and target state.

Support uses `support@wishlist.fi`; no separate reply-to is currently configured,
so replies go to the message's From address. Confirm production From is
`Wishlist <support@wishlist.fi>`, SPF/DKIM/DMARC and a real inbound reply before
handover. Historical receipt is not a current delivery test. No new email was
sent in this checkpoint. Initial support goal: review on working days and
acknowledge within two working days; owner approval is pending.

For data requests, verify identity proportionately, record the request and review
the actual data/backup footprint. Account deletion retains some shared content
and detached billing records; do not promise total immediate erasure. Consult the
applicable policy and legal review before answering statutory deadlines, breach
notification or contested erasure questions.
