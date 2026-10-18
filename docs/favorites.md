# Private favorites

Favorites are available to verified accounts on both Free and Premium. Use the
heart on a list, wish, or person to save/remove it in one click. The mobile heart shortcut, full navigation,
and signed-in footer link to Favorites, with Lists, Wishes, and People categories.
Each category shows up to 20 currently accessible items per page, most recently
saved first. Saving an existing favorite does not change its order.

Lists and wishes have controls in Browse, list/wish detail views, and the relevant
personal/shared views. My reservations omits the heart and shows wish priority.
People can be saved from Browse → People; their favorite card links to their
public lists. Saving a person sends no
notification and creates no follow relationship or public count.

Browse and Favorites reuse the same list, wish, and people cards. Favorites show
available-wish counts, reservation availability, priority, product/copy links, and
management actions where permitted. Public list visibility is not repeated;
private/draft lists keep their access label. Unavailable or reserved wishes never
receive an actionable reserve shortcut.

## Privacy and lifecycle

- Favorites belong only to the saving account. Actor identity comes from the
  verified session; submitted user IDs are ignored.
- Saving requires current normal app access. Bookmarks never grant membership,
  guest access, or permanent access, and store no title/image/content snapshot.
- Every Favorites query filters through the current list/wish access policies.
  Wishes reserved by someone else disappear for ordinary viewers; admins and
  the actual reserver retain only their existing rights. Reserver identities
  are never included in favorite results.
- Saving and reserving are independent. Reserving a saved wish keeps it in both
  Favorites and My reservations, marked "Reserved by you" in Favorites. Canceling
  removes only the reservation; the saved wish remains and becomes reservable
  again when current list/wish settings permit. Removing its favorite never cancels
  an active reservation. There is no automatic save when reserving an unsaved wish.
- People appear only while they satisfy existing public-owner discovery rules.
  There is no new registered-user directory or email search.
- Losing access hides an item without disclosing a placeholder, title, image,
  or hidden-item count. The bookmark can appear again if access later returns.
- Removing a favorite is idempotent and affects only the caller's records.
  Deleting an account or target cascades the associated bookmarks.
- Guest views remain read-only and do not display favorites controls. Guest-link
  rights are never used by the favorites service.

The heart has a pressed state and pending indicator, retains keyboard operation,
and reports translated success/error feedback. Favorites categories expose a
live count of visible results to announce removals. English and Finnish use the
same permissions and workflows.

## Data and rollout

Migration `20261018000100_favorites` adds `FavoriteList`, `FavoriteWish`, and
`FavoritePerson`, with foreign keys, unique account/target pairs, and indexes for
account/date pagination. Existing tables and content are preserved.

Card state is fetched in a batch for the visible page. Writes use explicit
save/remove states, shared source/account rate limits, account locking, and the
existing parent-list lock when saving list/wish targets. Server actions refresh
both locales' relevant routes.

The migration has been applied to the verified local development database. The
test runner applies it separately to the isolated test schema. Before a later
hosted rollout, verify the intended target and run `npm run db:migrate` before
deploying code that queries these tables. Local migration does not update Neon.

## Verification commands

```sh
npm run check
npm run test:integration
npm run test:e2e
```

Database/browser suites use isolated fixtures and run sequentially. Favorites
integration coverage checks private access, reservation visibility, lifecycle
changes, current content, idempotence/concurrency, session identity, deletion,
and pagination. Browser journeys cover all three categories, detail navigation,
stale saves, reservation changes, signed-out access, Finnish keyboard use,
dark/narrow/enlarged layouts, and automated accessibility.

On 18 October, ESLint, Stylelint, Prettier, TypeScript, production builds,
132 unit tests, and 209 integration tests passed. The complete browser run passed
222 of 226 desktop/mobile cases, including all 14 Favorites cases. Four failures
came from three existing scenarios assuming mobile navigation stayed visible.
After adapting those tests to the dropdown, all six affected desktop/mobile cases
passed on rerun. No application changes were needed for those failures.

English desktop cards and mobile navigation, plus Finnish 320px/200% dark layouts,
were visually inspected. Coverage includes saved-wish reservation/cancellation,
priority without a heart on My reservations, menu keyboard/Escape behavior, route
changes, reflow, and automated accessibility. The full-run report and screenshots
are retained locally under `/private/tmp/wishlist-refinements-full-run/`;
`test-results/` and `playwright-report/` contain the focused rerun.

The subsequent mobile-navigation refinement passed code checks, the production
build, and all 120 affected desktop/mobile browser cases, including all 14 Favorites
cases. Four shortcuts stay visible beside Menu; translated captions adapt to actual
space and text size. Full accessible names, current-section indicators, and the
full labeled menu remain available. English/Finnish light/dark screenshots at
normal widths and 320px/200% text were inspected. Local review screenshots are in
`img/mobile-navigation-review/`; current `test-results/` and `playwright-report/`
contain this 120-case run.

Native screen-reader and Safari/Firefox/device acceptance remain release QA.
Before trying the feature in an already-running development session, restart
`npm run dev` so its Prisma client includes the new models. Open `/en/favorites`
or `/fi/favorites`, or use Favorites in the main navigation.

Group reservations are the next separate checkpoint after favorites review and
commit. They are not part of this migration or feature.
