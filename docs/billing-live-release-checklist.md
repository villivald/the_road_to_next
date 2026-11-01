# Live billing release checklist

Prepared 31 October; updated 1 November 2026. Owner: **Service owner**. This is the Step 7 release
worksheet, not authorization to migrate, deploy or take a payment. The complete
handover handbook remains deferred.

## Current checkpoint

| Item                              | Evidence / decision                                                                                                                     |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Local implementation commit       | `123d396`; includes the reviewed follow-up fixes, committed by the owner without pushing                                                |
| Review follow-up                  | Badge/queued-guide environment filtering and paused/restricted checkout UI are deployed                                                 |
| Production                        | Owner-only live checkout: `dpl_Hy2FigjVj8mye4EVyEfjNSpgudaT`, READY; verified 1 November                                                |
| Public policies                   | Approved EN/FI Terms, Privacy and Refunds pages remain public                                                                           |
| Paddle domain / default link      | `wishlist.fi` approved; Apple Pay verified; `https://wishlist.fi/en/account/checkout` configured                                        |
| Paddle onboarding                 | Live MCP recheck 31 October: `completed`; both `account_setup` and `automated_review` completed                                         |
| Live notification                 | Existing `ntfset_01m67c29qfzqy7vsnq2ks4awy5`, active, platform events, `/api/paddle/live/webhook`                                       |
| Controlled tester                 | Existing verified owner account is configured privately in the Production allowlist                                                     |
| Backup custody                    | Owner confirmed the existing backup ready and checked on 1 November; a fresh capture was explicitly waived for this direct release      |
| Maintenance window / charged test | Owner explicitly skipped maintenance for this release; owner payment, cancellation and approved EUR 2 refund/access revocation verified |

The reviewed commit has been deployed by CLI; no Git push was made. The production
schema is now compatible with `123d396`. See the [initial deployment](billing-live-deployment-2026-11-01.md) and
[current owner-only checkout](billing-live-owner-checkout-2026-11-01.md).

## Configuration to apply at cutover

Production now matches the controlled-acceptance column, following the owner’s
explicit approval. The public-sales column remains a future release decision.

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

**Executed release exception, 1 November:** the owner confirmed the existing
backup ready and checked and explicitly requested proceeding without maintenance
or a fresh capture. The direct production migration/deployment is complete.
The preparation guidance below remains the normal procedure for future releases;
it is not evidence that a fresh capture occurred in this one.

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

Provider approval, the follow-up commit and the direct production migration/deployment
are complete. The owner explicitly waived the maintenance/fresh-capture portions
of the sequence below for this release. The application has subsequently advanced to owner-only checkout, and the live
notification is active. Genuine unpaid draft delivery and processing passed;
the owner’s EUR 2 payment and matching Premium grant also passed. Renewal cancellation also passed. The EUR 2 refund is approved and its grant is revoked; all 16 related events
are processed. The local presentation/re-subscription follow-up is tested and ready for review;
opening sales remains a separate decision. See the records above.
The earlier verification-support email is no longer needed for the resolved issue.

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

## Controlled acceptance

The controlled test is **one monthly EUR 2 subscription, cancellation of
renewal, then a full refund request**. The owner completed the payment on
1 November; the provider, local payment/grant and all 13 live events were verified.
Renewal cancellation was subsequently verified, including its 1 December end date
and continued paid access. The full-amount EUR 2 refund is now approved; the payment is marked refunded and
its grant revoked, with all 16 related events processed. The earlier pending
request correctly preserved access. Public sales remain restricted; tester selection does not authorize
financial mutations by the release tooling.
Confirm the actual checkout total, payer and refund method immediately before
any financial operation. Annual pricing can be checked against the API and
checkout without adding a second charged purchase.

| Check                   | Expected result / evidence                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tester boundary         | Signed-out and other accounts cannot start/resume checkout; owner can. Existing subscription management/recovery still works.                                                                                                           |
| Checkout                | Approved real domain; live token/customer; EUR 2 monthly, tax included, clear renewal terms; no sandbox notice.                                                                                                                         |
| Draft delivery          | Passed 1 November: first-attempt HTTP 200 for `transaction.created`, one live event processed, zero payment rows or payment-backed grants; see owner-only evidence.                                                                     |
| Paid transaction        | Passed 1 November: EUR 2 captured, active monthly subscription, one linked payment/grant with matching 1 November–1 December dates, all 13 events processed and one guide marked sent. Browser success alone is insufficient.           |
| Duplicates and recovery | Repeated notification/reconciliation does not create a second payment, grant or Premium guide. Inspect provider logs and durable state; do not deliberately break production.                                                           |
| Portal and cancellation | Passed 1 November: owner used the portal; cancellation is scheduled for 1 December, next billing date is null in Paddle and app, the update event is processed, and the existing paid grant remains active.                             |
| Full refund             | Passed 1 November: EUR 2 refund approved, cumulative amount covers the full payment, update event processed and payment-backed grant revoked. Pending approval had correctly preserved access. A refund does not itself cancel renewal. |
| Other access            | Existing manual/promo grants keep their original dates and remain independent. If the owner has promo access, validate revocation of the payment-backed grant rather than expecting the entire account to become Free.                  |
| Public sales            | Only after approval and all acceptance results: remove tester restriction intentionally, keep checkout enabled, verify EN/FI and monitor jobs/webhooks/access.                                                                          |

Keep payment/customer IDs, private portal URLs and raw provider/customer data in
ignored evidence only. Do not delete financial history to make the account look
unused. Real subscription renewal remains covered by sandbox lifecycle tests
until an actual live renewal occurs; do not claim it was exercised immediately.

References checked 31 October:
[Paddle go-live checklist](https://developer.paddle.com/build/go-live-checklist/),
[Vercel Build Output routing](https://vercel.com/docs/build-output-api/configuration#routes),
[Vercel request headers](https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for).
