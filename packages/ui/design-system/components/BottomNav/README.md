# BottomNav

The fixed mobile navigation, in the thumb zone.

**Use it on** every organizer screen. Attendee pages are single-purpose and do not get one.

## Rules

- **A glyph never travels alone.** Every item carries its word at 13px/600 — raised from `@ocr/ui`'s 10.4px, which was unreadable for the 50–75 reader this product is built for.
- Items are 48px minimum and spaced by `--tap-gap`. Four or five items; six is too many to hit reliably.
- Padding includes `env(safe-area-inset-bottom)` so the bar clears a home indicator.
- The page's `.content` carries 104px of bottom padding (`--content-bottom`) so the nav never covers the last row. This is not optional on any screen with a nav.
- The active item uses `--accent-text` **and** `aria-current="page"`. Colour alone never marks state.
- Icons are single emoji or small inline SVG at 24px. There is no icon font in this system and one must not be added.

## The consumer provides

An `items` array of `{ href, label, icon, active }`. Exactly one item should be `active`.

## Props

`items`
