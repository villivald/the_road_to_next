# Wishlist visual design

The personal catalogue direction combines warm paper surfaces, expressive titles,
image-led collections, and clear functional controls. The yellow heart and existing
Alfa Slab One wordmark remain the brand anchors.

## Shared system

- `src/app/globals.css` defines light/dark colours, content width, gutters, and
  corner radius. Use these tokens instead of introducing page-specific colours.
- Fraunces is the locally hosted heading font; Manrope remains the body and control
  font. Font sources and licenses live in `src/assets/fonts/`.
- `src/components/shell.module.css` supplies page headings, navigation, forms,
  content columns, buttons, and reading layouts.
- `src/components/cards/` owns image frames, list stacks, typographic covers,
  ownership markers, statuses, and card actions.
- Marketing pages use a yellow introduction. Account, billing, and management
  screens use quieter paper panels. The botanical illustration is decorative;
  source and rights information lives beside the asset.

## Layout and interaction

Keep browsing cards in a regular grid with consistent image proportions and aligned
metadata/actions. Contain product images; rotate only decorative list-stack images.
Missing images use the actual wish/list title as a decorative cover, while the
normal linked title remains accessible.

The header separates account tools from primary navigation. Verified accounts have
four visible mobile shortcuts: Browse, Lists, Reservations, and Favorites. All use
their full localized accessible names, existing icons, and the current-section
underline. Short captions appear when all four fit; a ResizeObserver checks actual
label/target widths, including font loading, locale, resizing, and text enlargement.
When captions no longer fit, icons remain directly usable and a permanently labeled
Menu button exposes all five full navigation labels. Account remains available
through the avatar; Menu carries the current-section marker on account pages.

The full menu closes on route changes, Escape, or focus leaving the navigation;
Escape restores focus to its button. Its dropdown scrolls for enlarged text without
moving page content. Mobile targets stay at least 44px; desktop keeps the full
navigation. Keep avatar/sign-out and language/theme controls together when the
toolbar wraps; Sign out stays visible. Preserve Browse/My lists/My
reservations/Favorites context on detail pages.

The choice combines visible navigation with a full labeled fallback. Hidden-only
navigation adds a step for every destination; icon-only navigation makes unfamiliar
symbols harder to interpret. A bottom tab bar is another established pattern, but
this revision keeps navigation in the existing header rather than introducing a
second persistent bar. These are design judgments for Wishlist, informed by
[NN/g's hidden-navigation research](https://www.nngroup.com/articles/hamburger-menus/),
[icon-label guidance](https://www.nngroup.com/articles/icon-usability/), and
[Apple's tab-bar guidance](https://developer.apple.com/design/human-interface-guidelines/tab-bars).

Browse and Favorites share list, wish, and people card components, including counts,
priority stars, and permission-aware actions. Public lists omit redundant visibility
labels; private/draft favorites retain them to clarify who can open a copied link.
The one-click heart has an accessible pressed state and uses ink on yellow in both
themes. Favorites persist independently of reservations; My reservations shows
priority and cancellation, without a favorite control.

Wish details use image and information columns. Editors and Account use adjacent
panels when space allows and stack on smaller screens. Avoid nesting independent
forms. Keep labels, field help, confirmations, and destructive consequences visible.

Keep Search beside the search and sort fields, including when additional wish
filters are expanded. Required confirmation checkboxes enable their action buttons;
keep the explanation visible to avoid moving the form as users check or uncheck
them. Native and server validation remain required.

Explain image fallbacks alongside upload controls. Show common format/size guidance
up front and keep pixel limits in an expandable detail. Access copy must distinguish
list visibility, membership, admin permissions, and read-only guest links.

## States and accessibility

Use words with status icons: colour alone must never convey visibility, reservation,
Premium, or payment state. Green indicates positive feedback/reservation availability;
neutral panels provide information; red identifies errors or destructive actions.
Keep effective control targets at least 44px and retain visible focus indicators.

Loading previews must follow the corresponding real layout and hide decorative
content from assistive technology. Keep the previous page visible during reservation
navigation until its content is ready. Reserve image dimensions, support reduced
motion, and check 320px layouts with 200% text in both languages and themes.

This design changes presentation, not access or billing rules. Reuse the existing
permission-aware actions, reservation controls, checkout state handling, guest-link
restrictions, and translated messages when extending it.
