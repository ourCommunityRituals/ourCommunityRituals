# Pre-maps, rotating displays and live mobile

A site map is not only a wayfinding tool for the day. It has a life before the event and a different one during it, and the three surfaces — poster, display, phone — each do a different job in each phase.

| Phase | Poster / pre-map | Venue display | Phone |
|---|---|---|---|
| **Before** | Browse every kiosk's public page, plan the visit | Counts down, shows who is coming | Save the ones you want |
| **During** | — | Rotates each kiosk's page | Live data and promotions |
| **After** | — | SharedReport | SharedReport |

## The pre-map

Before the event, the site map is a **catalogue**. Every stall, room or stop already has a public page, and the map is the index into them — reachable from the poster's QR, from a link, or from the area map.

- Each kiosk's page exists before the event. That is what makes the pre-map worth building: browsing thirty stall pages the night before is the single best thing this product can offer a market-goer.
- Points on a pre-map carry the stall's sub-category hue and glyph, exactly as on the day.
- A pre-map's routes are the ones that make sense before: *see the details*, *chip in*, *who's backing this*. Not *check in*. `MapDetail` renders what it is given; the caller filters by phase.
- **Let people carry it.** Someone who browsed at home should arrive with their shortlist. Saving is the one piece of state worth keeping, and it should work without an account — a saved list belongs to the device, not to a login.

## The rotating display

The venue display cycles through each kiosk's page. Two rules, and the first one is not negotiable.

**A rotating display must never rotate a QR.** Someone lining up their phone will lose the code mid-scan through no action of their own — the same failure as a shared touch map, but automatic. Two safe patterns:

1. **Stable code, rotating content.** The QR points at the market index for the whole cycle and never changes. Content rotates behind it. Simplest, and right for most installations.
2. **Rotation pauses on touch.** Per-stall codes are allowed only if any touch stops the cycle and holds for at least 20 seconds, with a visible indicator of the remaining time.

Never a third option. A per-stall code on an unpausable cycle is a broken scan by design.

**Pausing is also a conformance requirement.** WCAG 2.2.2 requires a pause, stop or hide mechanism for content that moves or auto-updates for more than five seconds. A rotating display is exactly that, so the pause is owed regardless of the scanning problem.

### How long each panel stays up

Signage defaults of eight to ten seconds are far too fast here. Budget three seconds for someone to notice the panel changed, reading time at roughly 100 words per minute — deliberately slower than silent reading, because this is unfamiliar content glanced at from across a room — and two seconds to act on it.

```
dwell = 3s + (words / 100 x 60)s + 2s
```

| Panel | Dwell |
|---|---|
| 15 words | **14s** |
| 30 words | **23s** |
| 50 words | **35s** |

Which produces the real constraint: **rotation is ambient, not a browsing mechanism.** Twenty stalls at 23 seconds is a seven-and-a-half-minute cycle, and nobody waits for their stall to come round. Past about eight panels, rotation stops being a way to find anything. The map is the browsing mechanism; the rotation is what the screen does when nobody is touching it.

So the display's resting state is the site map, not the carousel. Rotation is the screensaver.

### Fairness applies to time, not just space

The covenant says *same size, same spots for every sponsor*. On a rotating display, size and position are joined by **duration and frequency**, and the same rule has to reach them:

- Every kiosk panel gets the same dwell. A vendor cannot buy a longer slot.
- Every kiosk appears the same number of times per cycle. Order rotates between cycles so the same stall is not always first.
- A promotion is a line inside a kiosk's own panel, never an extra panel. Otherwise buying a promotion buys extra airtime, which is exactly what the covenant forbids.
- The same-size rule is literal: promotion lines use one type style, not whatever a vendor supplies.

This is worth stating loudly because a rotating display is the easiest place in the whole product to quietly break the covenant, and the break would be invisible to everyone except the vendor who paid.

## Live on the phone

During the event the phone is the only personal surface, and the only one that should carry anything time-sensitive.

- **Live data is what changed**, not what is scheduled — sold out, running late, moved indoors, last hour. If it did not change, it does not belong in the live view.
- Announce changes with `role="status"`, never a modal. A dialog that appears over someone mid-task is disorienting for any reader and disproportionately so for the audience this system is built for.
- **Never move content under a finger.** A live update inserts below what is already on screen, or waits behind a "2 updates — show them" button. Silent reflow is how people lose their place and leave.
- Promotions are labelled as such, sit within their kiosk's block, and are subject to the same fairness rules as the display. A promotion is never an interstitial and never an interruption.
- The live view must degrade to the cached pre-map without ceremony. Market connectivity is unreliable, and a map that needs a signal to draw is worth nothing on the day. Show the stale timestamp plainly — "Last updated 11:40" — rather than a spinner that never resolves.
