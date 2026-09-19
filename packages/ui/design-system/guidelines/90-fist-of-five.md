# Fist of Five — the hybrid proof

*Designed, not built* (hybrid design brief §10 and the build-status legend). This is the
first hybrid voting surface intended for launch, and it is the sharpest test the design
system faces: **both poles run at once on the same night.**

> Persistent teams — wrestling-style stables — compete monthly on a shared playlist. The room
> votes by QR: one tap, +1 for the now-playing song, anonymous. Votes roll up to the team.
> The winner holds **the belt**. Season standings run across monthly cards. A second
> open-challenge belt — **Triple A**, Anyone Anywhere Anytime, 1v1 — keeps it live between
> cards on mobile-link voting. Results surface through the SharedReport, which is aggregate
> by nature.

## Why it is the proof

*"The night carries both poles at once: competing teams identified, voting room anonymous."*

`OCR_VISION.md` names the mechanism: **the auth token is the choice boundary** — the
Fist-of-Five choice-token model. The named roster and the anonymous aggregate must be a
**structurally impossible join**, not a policy promise. A named identity can never be
recovered from an anonymous aggregate.

For the design system that is not an abstraction. It is a rule about what any vote surface
may put on screen at the same time.

## The rules a vote surface must hold

**One tap. Nothing else.** Canon: *"a vote is one tap; a scan is the only gesture."* No
confirm step, no rating widget, no multi-select. A vote is `+1` for whatever is playing now.

**Never render a voter.** A vote surface may show the team, the song, the tally and the belt.
It may never show who voted, a voter count that could be narrowed to a person, or anything
joinable back to a named roster. If a screen would need a voter identity to render, the
screen is wrong.

**State the anonymity in situ, in canon words.** "We count the room, never the person." Not
a privacy link, not a footnote — the sentence, on the surface, where the tap happens.

**Below the count floor, hold the number.** A tally under the floor renders *held* — muted,
with its reason in words — never as a small number. A small number is a re-identification
surface. See `05-brain-canon.md`, structure encodes truth.

**The team is named; the vote is not.** Team identity uses the named side's treatment
(`[data-brand="ow"]`, amber-on-black). The voting surface stays on the anonymous side's
chrome. Do not blend them into one visual field — the visual separation is doing real work.

## Surfaces

| Surface | What it is | Encoding |
|---|---|---|
| **Vote tap** | The one-tap +1, reached by QR. `--tap-min-primary` (56px), `--uec-live-ui` | solid = counted |
| **Now playing** | What the tap applies to. `.now-playing` from the OW vocabulary | — |
| **Tally** | Aggregate only. Held below the floor | solid counted / held suppressed |
| **Belt** | Who holds it now | solid |
| **Standings** | Season across monthly cards | solid counted, dashed for cards not yet played |
| **Triple A** | 1v1 open challenge, mobile-link voting between cards | dashed until a challenge is live |

## The generalization

*"Generalizes to battle-of-the-bands or audience-choice one-act series by changing the
taxonomy row, not the engine."*

This is also the answer for ourAirwaves. The flag verticals — art, sports, community service,
spoken word, science, academics and whatever comes next — are **taxonomy rows**, not a second
colour axis. They must not be hue-encoded: the set is open-ended, and the hue budget is
already spent on the ten UEC categories. A vertical is carried by its word and by the
solid/dashed/held form, exactly as a tourney format is.

## What this system still owes

There is no `Vote`, `Tally`, `Belt` or `Standings` component here yet, and the classes below
are the vocabulary only. Building them is the right first target for adoption, because they
exercise both poles at once and they are what is intended to launch.
