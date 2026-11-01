# Live billing release checklist

Prepared 31 October 2026. Owner: **Service owner**. This is the Step 7 release
worksheet, not authorization to migrate, deploy or take a payment. The complete
handover handbook remains deferred.

## Current checkpoint

| Item                              | Evidence / decision                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Local implementation commit       | `4ef8a24`; committed by the owner without pushing                                                                                          |
| Review follow-up                  | Environment filtering for public Premium badges and queued Premium guides; paused/restricted checkout UI; changes remain uncommitted       |
| Production                        | Policy-only deployment `dpl_crr3BoXzzfDd1ivc6dvdxkmZgatv`, READY, rechecked 31 October                                                     |
| Public policies                   | Approved EN/FI Terms, Privacy and Refunds pages published; billing remains sandbox                                                         |
| Paddle domain / default link      | `wishlist.fi` approved; Apple Pay verified; `https://wishlist.fi/en/account/checkout` configured                                           |
| Paddle onboarding                 | Live MCP recheck 31 October: `completed`; both `account_setup` and `automated_review` completed                                            |
| Live notification                 | Existing `ntfset_01m67c29qfzqy7vsnq2ks4awy5`, inactive, platform events, `/api/paddle/live/webhook`                                        |
| Controlled tester                 | Owner selected the existing verified Wishlist account; resolve its exact app user ID privately before configuring the allowlist            |
| Backup custody                    | Latest accepted archive is present and its encrypted-file SHA-256 matches; owner confirmed off-device copy/key custody is not yet complete |
| Maintenance window / charged test | Not selected or authorized; agree these at the release decision                                                                            |

The owner can make a local follow-up commit after reviewing the fixes. Keep it
local: pushing can trigger automatic deployment before the schema is compatible.
Record the final clean commit SHA and recheck the reviewed file hashes at cutover.

## Configuration to apply at cutover

These are future production settings, not a request to change hosted variables now.

| Setting                                                     | Initial live candidate                          | Controlled acceptance | Public sales                                            |
| ----------------------------------------------------------- | ----------------------------------------------- | --------------------- | ------------------------------------------------------- |
| `PADDLE_ENVIRONMENT`                                        | `live`                                          | `live`                | `live`                                                  |
| `PADDLE_CHECKOUT_ENABLED`                                   | `0`                                             | `1`                   | `1`                                                     |
| `PADDLE_CHECKOUT_TESTER_IDS`                                | Exact owner app user ID                         | Same nonempty ID      | Remove only after acceptance and approval to open sales |
| Primary API key, client token, webhook secret and price IDs | Matching live values from the private candidate | Same                  | Same                                                    |
| `PADDLE_SANDBOX_*`                                          | All five original sandbox values retained       | Same                  | Same                                                    |
| `OPERATOR_LEGAL_NAME`                                       | Preserve the already published production value | Same                  | Same                                                    |

The tester value is the internal Wishlist user ID, not an email, username or
Paddle customer ID. Never substitute an empty string: that removes the restriction.
Keep these values server-side. The app sends only its client token and the verified
Paddle customer ID to Paddle.js. Do not replace the whole production environment
with a private local file; preserve unrelated database, media, mail and job settings.

The live catalogue mapping is in [the rollout record](billing-live-rollout.md).
No new product, price, token or notification destination is needed.

## Backup custody before migration

Paddle approval is now confirmed. If the coordinated release is next, prioritize
copying its **fresh verified cutover backup** off-device and storing that key
separately. The older capture below remains a useful recovery checkpoint;
copying it first is optional and does not replace the fresh capture. There is no
need to perform two off-device handoffs solely to follow the earlier preparation
instructions. Fresh off-device/key custody must be completed before migration.

The verified capture is
`2026-10-30T04-45-28.845Z-52f6fb0d`, under ignored
`.local/operations/manual-backups/`. Copy its **`wishlist.tar.gpg` and
`verification.json`** to restricted storage off this Mac. Store its matching
passphrase from `.local/operations/backup-keys/` separately, for example in a
password manager. Do not put the key beside the archive or in Git/chat.

Compare the copied archive's SHA-256 with `archiveSha256` in `verification.json`,
and confirm the separately stored key can be retrieved. A copy on the same Mac
does not complete the off-device action. Record completion privately; it remains
pending until the owner confirms it. Delete local and off-device copies at the
approved 30-day maximum and delete expired keys once their archives are removed.

This older capture is a recoverability checkpoint. Take and verify a **fresh**
database/media backup after quiescing writes and before the actual migration.
Use the guarded command in [the operations runbook](operations-runbook.md), after
independently reconfirming the direct database target and private Blob store.
No fresh backup or source database access was performed during this review.

## Maintenance and deployment sequence

Provider approval is satisfied. The remaining local follow-up commit and owner
backup-custody action are still pending; production has not switched to live.
The earlier verification-support email is no longer needed for this resolved issue.

The migration removes the old account uniqueness constraints. A checkout pause
alone cannot make old application code compatible, and the old deployment does
not implement the new checkout-pause flag. Use a short maintenance window.

1. Recheck Paddle onboarding is `completed`, approved checkout domains, the exact
   linked Vercel project, the final clean source commit and intended migration.
   Confirm the maintenance window and test method with the owner.
2. Prepare the application build and a temporary **static maintenance deployment**
   without changing the public alias. A local Build Output API artifact is under
   ignored `.local/billing-live/2026-10-30/maintenance/`. It contains only a
   bilingual HTML page and routing configuration: no functions, secrets, database
   connections or background workers. It has not been uploaded or deployed.
3. Verify that maintenance candidate on Vercel before promotion: EN/FI pages,
   form POSTs, `/api/inngest`, both Paddle webhook URLs and media/API paths must
   return maintenance/non-success responses without running application handlers.
   Verify `503`, `Retry-After`, `no-store` and no indexing on page responses.
   Local layout checks do not prove Vercel routing behavior.
4. Confirm Inngest's registered production serve URL. It must resolve through the
   controlled alias; pause any functions pinned to an old deployment URL. Confirm
   old deployment URLs cannot accept public application traffic. Keep automated
   pushes/deployments stopped. Promote maintenance, then drain in-flight app/job
   requests and verify no old billing writer remains before touching the schema.
   Do not delete queued events or re-register an empty Inngest app as cleanup.
5. Capture the fresh verified backup, complete off-device/key custody, confirm the
   database host/name/schema, and apply the reviewed migration through the direct
   connection. Check migration status and retained sandbox relationships. Do not
   use a reset/seed command or restore over the source.
6. Deploy the schema-compatible application with matching live settings,
   checkout paused and the nonempty tester restriction. Use a protected deployment
   URL to check it before promotion; no shared-resource Preview experiments.
   Promote it, verify public flows and policies, and confirm Inngest points to
   the compatible serve route. Resume paused jobs deliberately and inspect their
   recovery rather than assuming deployment proves job synchronization.
7. Activate the existing live notification destination after its canonical route
   is reachable. Preserve legacy sandbox recovery and destination settings.
   Verify an ordinary caller cannot bypass the source/signature checks. A rejected
   manual request alone does not establish positive Paddle delivery.
8. After approval for controlled acceptance, enable checkout for the owner alone.
   Starting one checkout creates a live draft transaction; use its platform event
   to verify hosted source acceptance, signature verification, durable receipt,
   matching environment and successful job reconciliation **before paying**.
   The unpaid transaction must grant no Premium access.

Do not start step 5 if traffic isolation or backup verification cannot be proved.
The temporary maintenance deployment can remain serving through a failed cutover.
After migration, recovery must use the compatible application or a forward fix;
the old policy-only build is not a safe rollback target. Do not restore an older
database over subsequent paid activity without reconciliation.

## Proposed controlled acceptance

The proposed financial test is **one monthly EUR 2 subscription, cancellation of
renewal, then a full refund request**. This is a proposal for the owner's review;
no payment, cancellation or refund is authorized by choosing a tester account.
Confirm the actual checkout total, payer and refund method immediately before
any financial operation. Annual pricing can be checked against the API and
checkout without adding a second charged purchase.

| Check                   | Expected result / evidence                                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tester boundary         | Signed-out and other accounts cannot start/resume checkout; owner can. Existing subscription management/recovery still works.                                                                                          |
| Checkout                | Approved real domain; live token/customer; EUR 2 monthly, tax included, clear renewal terms; no sandbox notice.                                                                                                        |
| Draft delivery          | Provider notification succeeds, one durable live event is reconciled; no entitlement from an unpaid transaction.                                                                                                       |
| Paid transaction        | One completed payment, one linked payment/grant; Premium dates match the provider billing period. Browser success alone is insufficient.                                                                               |
| Duplicates and recovery | Repeated notification/reconciliation does not create a second payment, grant or Premium guide. Inspect provider logs and durable state; do not deliberately break production.                                          |
| Portal and cancellation | Owner's portal opens; confirmed renewal cancellation is mirrored with its effective date; paid access continues until its end unless fully refunded.                                                                   |
| Full refund             | Request references the same transaction. Pending approval is not a refund success; wait for approved full adjustment and matching grant revocation. A refund does not itself cancel renewal.                           |
| Other access            | Existing manual/promo grants keep their original dates and remain independent. If the owner has promo access, validate revocation of the payment-backed grant rather than expecting the entire account to become Free. |
| Public sales            | Only after approval and all acceptance results: remove tester restriction intentionally, keep checkout enabled, verify EN/FI and monitor jobs/webhooks/access.                                                         |

Keep payment/customer IDs, private portal URLs and raw provider/customer data in
ignored evidence only. Do not delete financial history to make the account look
unused. Real subscription renewal remains covered by sandbox lifecycle tests
until an actual live renewal occurs; do not claim it was exercised immediately.

References checked 31 October:
[Paddle go-live checklist](https://developer.paddle.com/build/go-live-checklist/),
[Vercel Build Output routing](https://vercel.com/docs/build-output-api/configuration#routes),
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
