# Toast service

One way for a surface to say "that worked", "that failed" and "heads up" (OSE-1564).
It is the result of an action; field-level validation stays inline beside the field.

| Kind | Look | Spoken label | Behaviour |
|------|------|--------------|-----------|
| `success` | green fill, checkmark in a white circle | "Success" | goes after 10 s |
| `failure` | red fill, red cross in a white circle | "Error" | stays until dismissed; an arrow opens the details; a button copies them |
| `neutral` | grey panel, info "i" in a circle | "Note" | goes after 10 s |

The icon and shape carry the meaning, so colour-blind readers can tell the three apart
without the colour. Each toast also starts with a visually hidden word that a screen reader
speaks.

## Wiring it into a spoke

The component is a stylesheet block plus one browser script. The styles are already in
`/ui.css` (`componentStyles`). Serve the script from the spoke's own origin and load it:

```ts
// Worker router, next to the /ui.css route
import { serveToastJs } from '@ocr/ui';
if (url.pathname === '/ui-toast.js') return serveToastJs(request); // ETag + 304, no-cache
```

```html
<script src="/ui-toast.js" defer></script>
```

It is a same-origin external script, so a CSP of `script-src 'self'` (or nonces) needs no
change. Nothing inline: no inline handlers, no inline style, no `eval`. Pages that load the
script have `window.ocrToast`. Without it a page simply has no toasts, and nothing else
changes.

## Using it

```js
ocrToast.success('Event saved');
ocrToast.neutral('The map is on for this event', {
  action: { label: 'Turn off', onClick: () => turnMapOff() },   // one optional action
});
ocrToast.failure('Could not save the event', {
  details: { code: 'INVALID_TRANSITION', requestId, action: 'Saving the event' },
});
```

Build the details of a failed request from the response (reads `X-Request-Id`) and its
parsed JSON body (reads `code`):

```js
const res = await fetch('/api/v2/admin/events/e1', { method: 'PUT', body });
if (!res.ok) {
  const body = await res.json().catch(() => null);
  ocrToast.failure('Could not save the event', { details: ocrToast.detailsFrom(res, body, 'Saving the event') });
}
```

### Options

| Option | Applies to | Meaning |
|--------|-----------|---------|
| `duration` | success, neutral | ms before it goes. 1000 to 120000, default 10000, `0` keeps it. Ignored for failure. |
| `action` | all | `{ label, onClick }`. One button. Runs the handler, then the toast goes. A missing function or label means no button. |
| `details` | failure | `{ code, requestId, time, action }`. Anything else on the object is ignored. |

`toast.*` returns `{ dismiss(), element }`. `ocrToast.dismissAll()` clears everything.

### Behaviour

- **Timing.** The timer pauses while the toast is hovered or holds keyboard focus, and resumes
  with the time that was left. Showing the same note again restarts its clock instead of stacking.
- **Stack.** At most three. A fourth makes room by removing the oldest note or success first;
  failures are kept unless all three are failures, then the oldest goes. An identical failure
  (same text, code, reference) that is already showing is not shown twice.
- **Focus.** A toast never takes focus. If focus is inside a toast when it goes (Escape,
  dismiss, or its action), focus returns to where it was before.
- **Escape** dismisses the toast that has focus.
- **Live regions.** Two are created at load: `assertive` for failures, `polite` for the rest.
- **Placement.** Fixed at the top of the screen, below the notch (`safe-area-inset-top`), full
  width on a phone and a 420px column at 640px and up. It sits at the top so it never covers a
  bottom action or the bottom navigation. The region lets clicks through to the page; only
  the toasts take them. Hidden in print.
- **Motion.** A 150 ms fade-in; none under `prefers-reduced-motion`.
- **Targets.** Dismiss, Details, Copy details and the action are at least 44 by 44.

### Failure details and the copy button

The Details arrow opens a block, and Copy details puts exactly that block on the clipboard
as plain text:

```
Error code: INVALID_TRANSITION
Request reference: req-7f3a9c21
Time: 2026-10-04T12:00:00.000Z
Action: Saving the event
```

A field the caller did not supply reads `not available`; nothing is invented. The request
reference is the `X-Request-Id` the Worker sent, which is what the Logs screen (OSE-1526)
is to be searched by. The clipboard goes through `navigator.clipboard`, with a hidden-textarea
`execCommand('copy')` fallback; if both are refused the toast says so and the block stays
selectable on screen.

### Uncaught errors (opt in)

```js
ocrToast.installGlobalHandlers();   // returns an uninstall function
```

An uncaught error or unhandled rejection shows a plain failure ("Something went wrong on this
page. Please try again.") with code `CLIENT_ERROR` or `UNHANDLED_REJECTION`, or the error's own
`code` / `requestId` if it carries ones shaped like ids. The raw error text is never shown. A
bare cross-origin `Script error.` is ignored. Nothing is installed unless you call it.

## Security notes

- **The copy block is an allowlist.** The script reads `code`, `requestId`, `time` and
  `action` from the details object by name and never iterates it. A token, cookie, signed link,
  email or request body handed over by mistake cannot reach the page or the clipboard
  (`tests/toast.test.ts`, with a seeded secret).
- `code` and `requestId` must look like ids (letters, digits, `_ . : -`, short, not a JWT);
  `time` is always a real timestamp; `action` and every message go through `ocrToast.sanitize()`.
- **sanitize()** removes stack frames, SQL and SQLite/D1 error codes, bearer tokens, JWTs,
  `key=value` secrets (token, password, cookie, signature ...), emails, URLs with a query or
  fragment (and relative links with a query), and long opaque strings; text is capped at 280
  characters, and if nothing readable is left a plain sentence is shown.
- Server text is inserted with `textContent`, never as markup. The script uses
  `createElement` / `createElementNS` only.
- No cookies, no storage, nothing sent anywhere, no per-user tracking. If a spoke counts
  failures, count by error code per day.
- Sanitising is a safety net, not a licence: do not pass secrets in a message to begin with.

## Colours

No new colour. Success is `--success`, failure is `--danger`, both with `--on-accent` text;
neutral is `--surface` with a `--border-strong` edge and `--text`. `--on-accent` on `--success`
joins the pairs in `brandContrastPairs()` (it already covered `--danger`), so `pnpm ui:contrast`
holds the pair in both themes for the base palette and every registered brand.

## Tests

- `tests/toast.test.ts`: the shipped script, run in jsdom with a manual fake clock (render per
  kind, 10 s dismissal, pause on hover and focus, details open, exact copy text, Escape, stack
  cap, sanitising, seeded-secret allowlist, global handlers, CSP-safety of the script, ETag).
- `tests/toast-styles.test.ts`: tokens only, contrast in both themes, 44px targets, reduced
  motion, placement.

Not here: a Playwright / axe run. The hub has no browser-test harness for the shared UI in CI
(`e2e/` needs a deployed `BASE_URL`), so the real-browser checks (Chromium and WebKit, axe in
both themes, clipboard permission) belong to the spoke that adopts it, in its phone audit.
