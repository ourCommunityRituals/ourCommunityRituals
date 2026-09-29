# Designing for the 50–75 reader

Anyone under 50 has had a phone their whole adult life and will find their way through almost anything we ship. The people who most need a community platform to work are the ones who did not grow up with one. This page is the operating manual for that reader. Everything in it also makes the product calmer for everyone else — that is the whole bet.

## Assume the mistake, then make it cheap

People in this bracket do not use software less carefully. They use it with **less confidence**, which is different: a wrong tap costs them more, because they are not sure they can get back. So the design target is not "prevent errors" — it is "make every error obviously recoverable in one step".

- **Undo beats confirm.** A confirmation dialog asks someone to predict a consequence they cannot picture yet. An undo lets them find out and step back. Destructive actions do the thing, then offer "Undone?" for 10 seconds. Reserve a true confirm for the genuinely irreversible — taking a live event down, deleting a sponsor.
- **Never validate while someone types.** An error that appears mid-word reads as "you are doing this wrong" to a hesitant typist and often makes them delete correct input. Validate on blur, and re-validate on submit.
- **Never move the page under a finger.** No content that expands above the scroll position, no layout shift when an error appears — reserve the error line's space from the start. Losing your place is the single most common way an older user abandons a form.
- **One decision per screen.** One primary action. If a screen has two equally weighted buttons, it has two screens in it.
- **No timeouts.** Nothing expires while someone is reading it. If a session must end, warn at 20 minutes with a one-tap extend.

## Do the thinking for them

The most respectful thing the product can do is arrive with an answer already filled in. Every default is a decision the person does not have to make — and a decision they cannot get wrong.

- **Derive, then show.** If the corridor follows from the venue address, set it and say so: "We set your corridor from the address — change it if that's wrong." Never present an empty field whose answer the system already knows.
- **Offer the likely answer, not the full range.** Dates offer "This Saturday · Next Saturday · Pick a date", in that order. A bare calendar grid is a competence test.
- **Pre-fill from last time.** The second event an organizer creates should start as a copy of the first.
- **Explain before, not after.** A `.form-hint` sits under the label before the field is touched — "Why we ask: it sets your corridor." A hint that only appears after failure is a reprimand.
- **Name the outcome on the button.** "Make the poster" tells someone what is about to happen. "Continue" tells them nothing and makes the next screen a surprise.

## Words

- Short sentences. One idea each. Plain words over precise ones where they conflict — "who's paying for this" beats "sponsorship attribution".
- Define a term the first time it appears on a screen, in the same sentence: "your corridor — the few blocks around your venue".
- Errors have three parts: what happened, why, what to do. "That email is missing its ending — try hello@maplefair.org."
- Never blame, never apologise, never use a code. There is no error number in this product.
- Read every string out loud. If it is not something you would say to a neighbour across a fence, rewrite it.

## The physical layer

These are set in `tokens.json` and are not negotiable per-screen.

| Rule | Token | Why |
|---|---|---|
| 48px minimum touch target | `--tap-min` | Above the WCAG 2.5.5 AAA floor of 44px |
| 56px for the primary action | `--tap-min-primary` | The one control we want hit first time |
| 12px clear space between targets | `--tap-gap` | Size alone does not stop mis-taps — adjacency does |
| 24px around destructive controls | — | And never beside a primary action |
| 16px body, controls and errors | `body` `input` `error` | Below 16px an input also triggers iOS zoom, which loses the reader their place |
| Nothing below 13px | `--text-min` (`nav-label` `status-pill` `brand`) | 10.4px nav labels were unreadable for this bracket. Gated by `tests/text-floor.test.ts` |
| All text at AA — 4.5:1 on every ground, 3:1 for control edges | every INK role | One floor for every product, brand and white-label page — AA everywhere, decided 2026-09-29 for uniformity. Contrast sensitivity is roughly halved by 60, a third by 75, so nothing ships below it: gated by `pnpm ui:contrast` and `tests/token-parity.test.ts` |
| 3px focus ring | `--focus-ring` | A 2px ring is the first thing a low-vision user loses |

**The whole label row is tappable** on every checkbox and radio — never just the 18px box.

## What this rules out

Worth stating plainly, because these are all things a modern UI reaches for by default:

- Hover-only affordances. There is no hover on a phone, and this system's hover is a `--border-strong` outline rather than a 1.18:1 tint precisely so it is visible when it does appear.
- Gesture-only actions — swipe to delete, long-press menus. Every action has a visible control.
- Icon-only buttons. A glyph never travels without its word.
- Placeholder text as a label. It vanishes exactly when the person needs it.
- Auto-advancing carousels, toasts that disappear before they are read, and anything that moves without being asked.
- Pinch-zoom as the only way to see the map. See `40-displays-and-qr.md`.
