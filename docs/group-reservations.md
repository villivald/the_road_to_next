# Group reservations

Verified Free and Premium accounts can reserve a wish together. This extends the
existing reservation; a wish still has only one active reservation. There is no
chat, payment collection, or contribution tracking.

## User flow

1. Open an available wish, expand **Reserve with others**, confirm identity
   sharing, and choose **Start group reservation**. An existing personal
   reservation can be converted in the same way. The organizer reserves immediately.
2. Type at least two characters in **Name or username**. Results appear as you
   type, with names, usernames, and public avatars (initials otherwise). Select a
   person, then choose **Invite**. Arrow keys, Enter, and Escape work in the picker.
   Search returns at most ten verified public profiles or eligible list members,
   never email addresses or the entire registered-user directory.
3. The recipient opens **My reservations → Group invitations → Review invitation**.
   They can decline, or explicitly agree to share their name and username and accept.
   An email also links to the invitation. The organizer receives an email when the
   person accepts; declines do not trigger an organizer email.
4. Accepted participants find the gift in **My reservations** and use **Manage group
   reservation** to see the group. Pending recipients see the inviter, wish summary,
   and accepted group size, but not the other participants or protected wish media.
5. Participants can leave. The organizer can cancel invitations, remove participants,
   transfer coordination to an accepted participant, or cancel the reservation for
   everyone. Transfer keeps the previous organizer as a participant and cancels
   pending invitations; the previous organizer can then leave.

The limit is ten people including the organizer and unexpired pending invitations.
Invitations expire after seven days. Each person can be invited once per reservation;
expired, declined, removed, and withdrawn invitations are not restored. A separate
organizer/recipient limit permits at most three invitations per day across different
reservations. A recipient can receive at most ten new group invitations per hour
across organizers. Other mutation, search, and source limits also apply.

## Privacy and lifecycle

- Every read and mutation rechecks verified identity and independent access to a
  published, unarchived list and visible, unfulfilled wish. A group invitation never
  creates list membership or grants private-list access. Its group's reservation is
  the only reserved-wish visibility exception.
- Accepted participants can access their reserved wish and its protected image.
  Normal Browse and list catalogues continue to hide reserved wishes. List admins
  retain their existing management access, but receive no group roster unless they
  explicitly join. Personal invitees, including invited admins, see the inviter in
  their scoped invitation view. Organizer consent covers invitees as well as accepted
  members; other participants are disclosed to the group only after acceptance.
- Favorites remain independent. A saved wish appears while the participant can
  access it, disappears after access loss, and returns when the underlying access
  policy permits. Joining, leaving, or canceling does not create or delete bookmarks.
- Disabling reservations preserves existing accepted participants and allows
  departure/cancellation/transfer, but blocks new groups, invitations, and acceptance.
- Private-access loss permanently removes affected people. If the organizer loses
  access or deletes their account, the earliest eligible accepted participant becomes
  organizer. If no successor exists, the reservation ends. Pending invitations are
  canceled on a coordinator change. Account deletion also removes the person's own
  group memberships and invitations; its review token covers group changes.
- Hiding, fulfillment, unpublishing, archival, cancellation, or administrative
  revocation ends the reservation and closes accepted/pending participation. Content
  deletion cascades. Reopening or restoring access never resurrects ended groups.
- User/list locks serialize writes. Group mutations share the account-deletion
  advisory gate and acquire user locks in sorted order before the parent-list lock.
  Capacity is checked under that lock. Rate-limit writes inside the mutation reuse
  its database connection. Database triggers cover lifecycle changes and deletion
  cascades; the existing partial unique index still enforces one active reservation.

## Interface decisions

The feature uses the existing Reservations destination; it adds no top-menu item.
My reservations retains priority and omits favorite buttons. Empty invitations use
one compact row, and individual/group cards share aligned action footers. The group
creation disclosure uses a compact icon/chevron header and top-aligned consent text.

The people picker debounces searches, ignores stale responses, supports keyboard
selection, and requires an explicit invitation action. Only existing public-profile
avatars are returned; eligible private members use initials. This does not widen
media access. Names appear on their own line; a secondary @username is shown only
when it differs from the display name. Layouts and feedback support EN/FI,
light/dark mode, and enlarged text.

Group reads fetch sibling relations sequentially within the same repeatable-read
transaction. This retains a coherent permission snapshot and avoids the observed
[Prisma/pg concurrent-query warning](https://github.com/prisma/orm/issues/29407).

## Email notifications

Creating an invitation atomically queues an invitee email; accepting atomically
queues an organizer email. Both use the recipient's saved language and the shared
branded HTML/plain-text templates. The email identifies the inviter or new member
and links to the signed-in group page; wish details and the group roster are omitted.
Pending invitations remain available in My reservations even if email delivery fails.

After each transaction commits, an event triggers the existing
`deliver-account-emails` job for the saved notification. An aligned 15-minute
recovery schedule processes up to 20 due messages per batch. The existing Inngest
event key is required; see [background jobs](background-jobs.md). Retries keep an
identical payload and idempotency key; duplicate mutations
cannot queue duplicate notifications. Before delivery, the worker rechecks recipient
verification/address, invitation status/expiry, group state, both users' list access,
and current organizer identity. Stale messages are canceled and their bodies cleared.
Deleting a participant or recipient deletes the associated message records.

Run the local Inngest worker for automatic delivery, or `npm run emails:deliver` for
one due batch. Local Mailpit captures messages at <http://localhost:8025>.
No automatic backfill emails existing invitations. No emails are sent for declines,
removal, departure, or coordinator changes in this version.

## Migration and deployment

Apply `20261018000200_group_reservations`, followed by
`20261019000100_group_reservation_emails`. The first adds group participation and
lifecycle rules; the second scopes queued emails to a participant and event type.
Existing reservations remain individual. No new environment variables, provider setup, or hosted jobs are
required. Expiry is enforced at read/accept time rather than depending on a worker.

Favorites baseline: commit `e15d7c1`; its production migration was reported applied by
the project owner on 18 October 2026. This is not a fresh hosted deployment audit.

For each intended environment:

1. Confirm the database host/name and schema. Prisma uses `DIRECT_URL` when present;
   otherwise `DATABASE_URL`. Process variables override `.env.local`, then `.env`.
2. Run `npx prisma migrate status`, then `npm run db:migrate` for the reviewed migrations.
3. Deploy the matching code, or restart `npm run dev` locally after `npm run db:generate`.
4. Use two disposable verified accounts to create, invite, accept, leave, transfer,
   and cancel. Check private-list access and protected image denial before acceptance
   and after departure. Check Favorites persistence, Finnish, and mobile layouts.

Apply the migrations before dependent code and deploy the app and email worker together. Rolling code back does not undo the data
migration; retained group data must not be deleted as a rollback shortcut. Hosted
application/migration execution remains a separate release step.

## Verification

Use `npm run check`, then `npm run test:integration`, then `npm run test:e2e`.
Database/browser suites run sequentially against `wishlist_test` on port 55433;
never run fixtures against development or production data.

Integration coverage includes consent and spoofed identities, private access and
media, pending-roster privacy, duplicate invitations, expiry, capacity under
concurrency, organizer transfer/deletion, access loss, stale requests, and competing
individual/group reservations. Browser coverage exercises the full EN journey,
Favorites persistence, individual-to-group conversion, declining, FI keyboard
acceptance, narrow/enlarged-text layouts, themes, and automated accessibility.

### Local verification checkpoint — 19 October 2026

- ESLint, Stylelint, Prettier, TypeScript, and all 132 unit tests pass.
- All 257 isolated integration tests pass, including notification queueing, captured
  Mailpit delivery, acceptance, silent declines, stale-message suppression, retries,
  concurrent claims, recipient limits, and deletion/rollback behavior.
- The production build and 56 affected desktop/mobile browser checks pass. They cover
  group flows, distinct/duplicate names, account journeys, EN/FI, accessibility,
  dark mode, enlarged text, and localized email previews. Two additional email-preview
  checks verify the final headings at a true 320px mobile width and desktop width.
- The earlier full 236-case browser suite passed at the layout-review checkpoint;
  the notification change was verified with the affected suites above.
- Both group migrations are applied to local `wishlist_dev` on
  `127.0.0.1:55432/public` and isolated tests. The local app and Inngest worker are
  running; local delivery is captured by Mailpit. Production is unchanged.

Review images are in `img/group-reservation-review/`, including `group-email-*`
and `people-picker-*`. The affected browser report is in `playwright-report/` and
`test-results/`; final email previews are in `/private/tmp/group-email-preview-results/`.
Logs: `/private/tmp/group-notifications-browser-final.log`,
`/private/tmp/group-notifications-integration-final.log`,
`/private/tmp/group-notifications-check-complete.log`, and
`/private/tmp/group-email-previews.log`.

The feature is committed as `dc94221`; both group migrations were verified on
production during the 19–20 October hosted acceptance. The checks cover public group creation,
EN/FI invitation/acceptance emails, transfer, leaving, cancellation, protected
images, and Favorites. The verified sending domain now uses a separate scoped
production key. A fresh acceptance email from `support@wishlist.fi` arrived in
Gmail with SPF/DKIM/DMARC PASS and correct domain links. A fresh English invitation
also arrived in Tuta. Both used one delivery attempt.

Private-list acceptance also passes: an invited Free member created a group,
private-membership loss transferred coordination and revoked media/group access,
and restoring list membership did not restore group participation. All four
disposable groups are ended. The private owner fixture was later republished only
for the natural guest-expiry check, which the owner is checking manually.
Detailed per-run evidence stays in the Git-ignored `.local/` directory. Remaining
release QA includes native screen-reader, browser, device, and mail-client checks.
