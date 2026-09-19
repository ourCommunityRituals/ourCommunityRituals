# Card

The system's one container: `--surface`, a 1px `--border`, 8px radius and 16px of padding. There are no shadows anywhere in this system, so a card is defined entirely by its edge and its radius.

**Use it when** a group of facts belongs together and can be acted on as a unit. If the card is not interactive, it does not need to be a card — a `.section` with a title is usually quieter and reads better.

## Rules

- **Hover draws an outline, not a tint.** Lifting `--surface` to `--surface-hover` is a 1.18:1 change — invisible — and there is no hover on a phone at all. `.card:hover` sets a `--border-strong` outline instead.
- One idea per card. If it needs a scrollbar, it is a page.
- Padding is 16px, raised from `@ocr/ui`'s 14px so the larger type is not crowded against the edge.
- A card that is a link or a button must be a real `<a>` or `<button>`, not a `div` with a handler.

## The consumer provides

`title` and `sub` for the standard two-line head, or arbitrary `children`. When all three are given the children are separated by 12px.

## Props

`title` · `sub` · `children` · `className`
