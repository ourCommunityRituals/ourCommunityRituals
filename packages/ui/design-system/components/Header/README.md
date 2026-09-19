# Header

The sticky top chrome: the screen's one `h1` at 22px/700, and optionally a live indicator.

**Use it on** every organizer and attendee screen. `.page-header` is the centred variant for public pages, with room for a subtitle.

## Rules

- **One `h1` per screen**, and it names where you are — "Maple Street Fair", not "Details".
- Sticky positioning uses `top: env(safe-area-inset-top, 0px)`, never `0`, so it clears a phone's status bar.
- This is one of only two places in the system with a backdrop blur (`color-mix(--bg 90%)` plus `blur(12px)`). Do not introduce a third.
- The live indicator always carries a word — LIVE or OFFLINE — never a bare coloured dot. Live is teal, because red-versus-green is never a semantic pair here.

## The consumer provides

`title`, and `live` only when the screen has a live/offline state. Omitting `live` renders no indicator at all, which is correct for screens where the distinction is meaningless.

## Props

`title` · `live` (boolean | undefined)
