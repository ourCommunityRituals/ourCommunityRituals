# Loading

A spinner and a line of text, centred.

**Use it** only where something genuinely takes time. A spinner that flashes for 80ms is worse than no spinner.

## Rules

- **Always accompanied by words.** "Making your poster…", not a bare spinner. An unexplained spinner is the most anxiety-producing thing in an interface for someone who is not sure they did the right thing.
- Say what is happening, not that something is happening.
- `role="status"` with an `aria-label`, so a screen reader announces it without stealing focus.
- Under `prefers-reduced-motion` the spin stops and the ring stays visible.
- If the wait can exceed about ten seconds, show progress or a step count instead — "Step 2 of 3: adding your QR code."
- Never block the whole screen for a background save. Save quietly and say so afterwards.

## Props

`label`
