# UI feedback

Routine confirmations use one temporary message. Errors and information the user
still needs stay available. Success does not move keyboard focus or insert a box
that pushes the page's controls apart.

| Message                                                                           | Behaviour                                                                                              |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Routine actions and saved forms                                                   | One eight-second toast. No duplicate inline box.                                                       |
| Redirect confirmations                                                            | One toast; consume only that outcome's query parameters so refresh/back does not replay it.            |
| One-time guest-link result and instructions                                       | Persistent content; never hide the link on a timer. Its inline confirmation can be dismissed manually. |
| Download/copy success inside a dialog or generated-link section                   | Short-lived local confirmation; keep errors inline.                                                    |
| Validation/action errors                                                          | Persistent inline feedback and error-summary focus. Never dismiss automatically.                       |
| Recovery/verification instructions, billing progress and current state indicators | Keep available while relevant; these are not routine flash messages.                                   |

## Coverage

The shared redirect component covers all fourteen outcomes: list creation, save
and deletion; wish creation, save and deletion; reservation cancellation; list
joining/leaving and role changes; member removal, invitation cancellation,
ownership transfer and guest-link revocation. Image upload/removal now use only
the shared toast. Sharing-card download and guest-link copy success clear after
eight seconds. The small catalogue copy hint already clears after three seconds.

`ActionFeedback` and `ActionForm` default to `successDisplay="toast"`. Opt into
`successDisplay="inline"` only for information that must remain nearby; guest-link
creation does this. `SuccessMessage` requires explicit `queryKeys`. It consumes
those keys through Next's native History API integration while preserving other
query parameters, the hash and normal navigation. No extra server request is made.
Without client enhancement, its server-rendered confirmation remains in
`<noscript>`; existing route streaming behaviour is unchanged.

## Timing and accessibility

- Eight seconds is an app choice, not a WCAG duration.
- Hover, keyboard focus and hidden tabs pause toast dismissal. Leaving these
  states gives a fresh eight seconds.
- Close/Escape dismiss the toast and return focus to the previous control, using
  the originating action or main content as a fallback. There is no success autofocus.
- One shared polite live region announces toast text. The visible toast also has
  `role="status"` with its own automatic announcement disabled to avoid repeats.
  Errors retain `role="alert"` and existing focus handling.
- Repeated identical confirmations are announced again. Navigation and a new form
  submission clear stale toasts. No animation is used.
- A temporary message must not be the only way to inspect an outcome or perform
  an action. Persistent visibility, membership and account state remain on page.

## Mobile layout

At narrow widths, favorite/copy actions sit beside the list title; visibility
stays directly below it; sharing-card and settings controls share one compact
row. Labels shorten visually while retaining their full accessible names. Large
text may wrap the primary controls into separate rows instead of clipping them.

Toasts respect safe-area insets, follow the visual viewport above an on-screen
keyboard and have a bounded, scrollable height. Their close control remains
visible and at least 44px. If a toast overlaps the focused page control, it moves
to the opposite edge of the viewport without moving focus. The desktop toolbar
layout is retained.

Hiding a list asks for browser-native confirmation on both the list page and in
settings: active reservations cannot be restored by showing the list again.
Canceling the confirmation sends no mutation. Showing a list remains one click.

## Verification

`e2e/mobile-feedback.spec.ts` checks all redirect outcomes in EN/FI, expiry,
refresh, preservation of unrelated URL parameters, uploaded covers, 320–740px
layouts, enlarged text, toast bounds and simulated keyboard resizing.
`e2e/feedback.spec.ts` covers timing, hover/focus/background pause, focus return,
persistent errors, repeated saves and clearing notifications during navigation.

No migration, environment change or dependency is needed.

References: [W3C status messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages),
[W3C timing adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html),
and [Next native History API](https://nextjs.org/docs/app/getting-started/linking-and-navigating#native-history-api).
