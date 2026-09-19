# EmptyState

Title, reason, next step. The component that guarantees no screen in this product is a dead end.

**Use it** for every empty list, every filtered result with no matches, every not-yet-started state.

## Rules

- **Three parts, always:** what is here (title), why it is empty (reason), and what to do about it (a single primary action). An empty state with no action is a dead end, and dead ends are where non-confident users stop.
- The action is one Button. Not two.
- The reason is specific. "You have not made an event yet" beats "Nothing to show".
- The glyph is one emoji at 2.5rem, `aria-hidden`. It is decoration; the words carry the meaning.
- Title is 20px/700, body 16px in `--text-muted` at a max of 34 characters per line.
- A filtered-empty state says what the filter is and offers to clear it — never leave someone stuck behind a filter they forgot they set.

## The consumer provides

`title`, `message`, and an `action` of `{ label, href }`.

## Props

`icon` · `title` · `message` · `action`
