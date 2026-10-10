# English and Finnish

The App Router uses `next-intl` for `/en/...` and `/fi/...` pages. Route identifiers stay the same in both languages. API, media, webhook, and job endpoints are unchanged; old page links redirect to a localized page.

The URL selects the current language. Unprefixed visits use the explicit language cookie, then the signed-in account preference, then a supported browser language, with English as the fallback. The header switcher saves the preference and preserves the path, query, and fragment. It asks before discarding an edited form.

## Text and formatting

- Add application text to both `src/i18n/messages/en.json` and `fi.json`. English source messages are typed catalog keys. Use `useText()` in components or `await getText()` in async server components.
- Use whole sentences and named interpolation values. Use `t.plural()` when wording changes with the count; both catalogs must have matching keys and parameters.
- User-written names, titles, descriptions, bios, and image descriptions are never translated. Keep the Wishlist and Premium names.
- Use stable codes in `message-codes.ts` for action feedback. Keep codes unchanged when presentation text changes. Unexpected internal/provider errors must use a safe generic message.
- Use locale-aware `Link`, navigation, redirects, and revalidation from `src/i18n`. Guest anchors use `localizedPath()` and full navigation to preserve their privacy controls.
- Format prices with `formatWishPrice(..., locale)` and dates with `LocalTime`. The selected language controls formatting; dates use the viewer's timezone after hydration and a UTC server fallback.

| English           | Finnish             |
| ----------------- | ------------------- |
| wish              | toive               |
| wishlist / list   | toivelista / lista  |
| reservation       | varaus              |
| available         | vapaana             |
| reserved          | varattuna           |
| Anyone can view   | Kaikkien nähtävissä |
| Restricted access | Rajattu näkyvyys    |
| hidden            | piilotettu          |
| admin / member    | ylläpitäjä / jäsen  |
| guest link        | vieraslinkki        |

## Emails and checkout

Verification and recovery emails use the account's language. Invitations save the recipient's preference, or the sender's language for an unknown recipient, when queued. Retries keep that language and localize the destination URL.

Paddle currently has no Finnish checkout locale. Finnish billing pages explain that its payment window opens in English; checkout returns to the selected app language. Real checkout and portal behavior must be verified on the deployed sandbox.

## Check changes

Run `npm run check`, `npm run test:integration`, and `npm run test:e2e` sequentially. Catalog tests check keys and interpolation; browser tests cover language switching, preferences, legacy links, Finnish account/list/wish/recovery/reservation journeys, guest protections, and 320px accessibility in both themes. Review Finnish wording alongside English when changing sensitive access, deletion, or billing guidance.
