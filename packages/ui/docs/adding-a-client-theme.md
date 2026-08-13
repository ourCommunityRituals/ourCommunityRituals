# Adding a client theme (the "new client in days" path)

OSE-654. Card structure and flow are fixed; **colour is a swappable theme layer.**
A client theme is **one object** that re-maps semantic *role* tokens — you never
touch structure, components, or the UEC category colours.

## The model (three tiers)

1. **Primitives** (`--ocr-blue-600`, …) — raw hex, never used by components.
2. **Semantic roles** (`--surface`, `--card`, `--text`, `--text-primary/secondary/muted`,
   `--border`, `--accent`, `--success`, `--warn`, `--info`, `--danger`/`--error`, `--live`) —
   **what components consume.** Never hard-code hex in a component; use a role.
3. **Brand themes** (`[data-brand="acme"]`) — a client override that re-maps Tier 2.

## Add a theme in three steps

### 1. Register the theme (`src/tokens.ts` → `brandThemes`)

A theme needs **both a dark and a light value** for each role it overrides. A single
flat value would clear WCAG AA in one mode and fail in the other (dark backgrounds
want a lighter accent; light backgrounds want a darker one).

```ts
export const brandThemes: Record<string, BrandTheme> = {
  acme: {
    dark:  { '--accent': '#A78BFA', '--accent-hover': '#C4B5FD', '--info': '#A78BFA' },
    light: { '--accent': '#6D28D9', '--accent-hover': '#5B21B6', '--info': '#6D28D9' },
  },
  // yourclient: { dark: { … }, light: { … } },
};
```

Override **only** the roles that differ — everything else inherits the OCR base.

### 2. Verify contrast

Every overridden colour must clear its floor against the mode's background
(`#0F1824` dark, `#F4F7FC` light): **4.5:1** for text roles, **3:1** for
interactive/large (accent, info). The test suite enforces this:

```
npx vitest run tests/theme-swap.test.ts
```

Add your theme to that spec's assertions (mirror the `acme` cases).

### 3. Activate it

`brandBlocks()` is already included in `ocrStylesheet`, so a registered theme
ships automatically. Turn it on by putting one attribute on `<html>`:

```html
<html data-brand="acme"> … </html>
```

That's the whole swap. Every card, button, and status colour re-paints; **no
structural or component change**, and the switch can be driven per-request
(e.g. from the event's `brand_id`).

## Rules

- **Never** override a `--uec-*` token. UEC category colours are theme-invariant —
  hue carries meaning (green = access). The suite fails any theme that touches them.
- **Never** hard-code hex in a component or template — consume a role token, so a
  future client theme reaches it for free.
- Keep dark/light values in step; the contrast test is the gate.
