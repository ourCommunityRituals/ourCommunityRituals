# AccessDenied

The gate. A thin wrapper over EmptyState that keeps every organizer-only boundary phrased the same way.

**Use it** wherever a signed-out or non-organizer visitor lands on an organizer surface.

## Rules

- **A gate is not an error.** Nobody did anything wrong by arriving here. The tone is "this part is for organizers", never "access denied" or "forbidden".
- The default message offers the route in: "Want in? Ask the event organizer for an invite link." Because OSE sponsorship is invite-anchored, that really is the next step.
- Never show a raw status code. There is no 403 in this product's vocabulary.
- Do not reveal whether the thing behind the gate exists.
- Keep the primary action pointing somewhere real — the connect flow, not the sign-in page they just came from.

## Props

`what` · `icon` · `message` · `action`
