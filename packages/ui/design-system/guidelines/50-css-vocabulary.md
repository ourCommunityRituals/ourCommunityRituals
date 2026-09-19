# The CSS class vocabulary

`components/bundle.css` ships more than the thirteen React components. Most of the product's surfaces are built from classes directly, and this is the inventory. Everything references tokens; nothing hard-codes a colour, radius or size.

## When to use a class instead of a component

`partials.ts` covers the thirteen components that carry props. Everything else — chips, bars, stat tiles, the QR frame, map cells — is presentational and ships as classes, because a component that only sets a `className` earns nothing. Use the class directly and keep the markup semantic.

## Layout and chrome

| Class | What |
|---|---|
| `.header` `.page-header` | Sticky top chrome. The only blur in the system: `color-mix(--bg 90%, transparent)` plus `backdrop-filter: blur(12px)` |
| `.content` `.content-wrap` | Page body. Bottom padding clears the fixed nav (`--content-bottom`) |
| `.section` `.section-title` | The page's one rhythm — 24px between blocks, a 14px uppercase title above each |
| `.bottom-nav` `.nav-item` | Fixed mobile nav. Respects `env(safe-area-inset-bottom)` |
| `.brand` | The uppercase accent label that stands in for a logo |
| `.footer-cta` | Bottom link band |

## Controls

| Class | What |
|---|---|
| `.btn` `.btn-primary` `.btn-secondary` `.btn-danger` `.btn-block` | Primary reads `--on-accent` on an `--accent` fill, 18px/700 |
| `.btn-link` | Text-only action. Still 48px tall |
| `.input` `.search-bar` `.sort-select` | 16px text, `--border-strong` edge |
| `.toggle` `.toggle-track` `.toggle-row` | Track is `--border-strong` when off, `--accent` when on |
| `.filter-chip` | Pill. Active state is hue **and** an outline |
| `.view-btn` `.view-toggle` | Small square controls, still 48px |
| `.drop-zone` `.file-input` `.file-name` | Upload target, 2px dashed `--border-strong` |
| `.range-group` | Slider row with a visible numeric value |

## Surfaces and data

| Class | What |
|---|---|
| `.card` | `--surface`, 1px `--border`, 8px radius, 16px padding. No shadow |
| `.list-item` `.list-name` `.list-sub` `.list-count` | Row with a 48px minimum height |
| `.stats-row` `.stat-card` `.stat-value` `.stat-label` | Value is 28px in `--accent-text` |
| `.bar-chart` `.bar-row` `.bar-track` `.bar-fill` `.bar-count` | Horizontal bars. Fill is `--accent`, count is always printed |
| `.preview-count` | A single large derived number |
| `.meta-badge` `.user-badge` `.source-badge` `.genre-tag` | Small pills |

## Status and feedback

| Class | What |
|---|---|
| `.live-indicator.on` / `.off` | Pulsing pill. Always carries the word LIVE or OFFLINE |
| `.live-badge` | The display and public-page variant |
| `.error-banner` | Page-level error. `--error` text and border on a 10% tint |
| `.form-hint` `.form-error` `.required-mark` | 15px hint, 16px error, both reserve their space so nothing shifts |
| `.loading` `.spinner` `.loading-text` | Spinner honours `prefers-reduced-motion` |
| `.empty-state` `.es-icon` | Title, reason, next step. No screen dead-ends |
| `.access-denied` `.not-found` `.offline-msg` | Gated and missing states, same three-part shape |

## Event surfaces

| Class | What |
|---|---|
| `.qr-frame` | Always real white, both themes. Sized from `--display-ppmm` on a panel |
| `.qr-placeholder` | The pre-generation slot |
| `.display-card` | Venue display card, 360px capped, 480px above 768px |
| `.cta` `.cta-sub` | The across-the-room call to action |
| `.sponsor-slot` `.sponsor-name` | Same size, same spots — the covenant rendered |
| `.hex-map` `.hex-cell` `.hex-cell-empty` `.hex-cell-selected` `.hex-legend` | H3 corridor map. Empty cells are stroke-only; filled cells carry hue and glyph |
| `.profile-header` `.profile-avatar` | Organizer identity |

## Rules that apply to all of them

- Never hard-code a colour, radius, font size or tap height. If a value is missing, add a token.
- Never use `--border` alone to mark something interactive — that is `--border-strong`.
- Never put AAA-critical text on `--surface-hover`.
- Every interactive class already carries `min-height: var(--tap-min)`. Do not override it downward.
- Focus is `:focus-visible` only, 3px `--focus-ring`, offset 2.
- `@media (prefers-reduced-motion: reduce)` disables every animation and transition in the sheet. Do not reintroduce one outside that guard.
