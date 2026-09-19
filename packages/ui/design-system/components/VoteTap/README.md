# VoteTap

The Fist of Five hybrid vote. One tap, `+1` for the now-playing song, anonymous, attributed
to a named team.

**Intentional addition.** Not part of `@ocr/ui`. See `guidelines/90-fist-of-five.md`.

## Why it is shaped this way

The night carries both poles at once: competing teams identified, voting room anonymous. The
auth token is the choice boundary — the named roster and the anonymous aggregate must be a
**structurally impossible join**, not a policy promise.

So the component **has no prop for a voter and cannot render one.** It takes the song, the
team, the tally and the belt. If a screen would need a voter identity to render, the screen
is wrong, and no prop here will help.

## Rules

- **One tap, no confirm.** Canon: *"a vote is one tap; a scan is the only gesture."* No
  rating widget, no multi-select, no are-you-sure. 56px (`--tap-min-primary`).
- **The promise sits where the tap happens**, in canon words, verbatim: "No account ·
  nothing stored. We count the room, never the person." Not a link, not a footnote.
- **Below the count floor the tally is HELD**, with its reason in words — never a small
  number, because a small number is a re-identification surface. The card takes `.is-held`;
  a counted card takes `.is-counted`. Structure encodes truth.
- **Voted state is a state, not a disappearance.** The button stays, reads "✓ Counted", and
  carries `aria-pressed`. Removing it would leave an older reader unsure the tap registered.
- **The team is named; the vote is not.** Team identity belongs in the named side's chrome
  (`[data-brand="ow"]`, amber-on-black). Do not blend the two visual fields — the separation
  is doing real work.

## Props

`nowPlaying` · `team` · `tally` · `floor` · `held` · `voted` · `onVote` · `belt` · `disabled`

There is deliberately no `voter`, `voterId`, `voters` or `voterCount` prop.
