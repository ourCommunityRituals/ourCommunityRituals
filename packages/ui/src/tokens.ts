/**
 * @ocr/ui — Canonical design tokens
 *
 * Extracted from the nine ourWKRP templates, which each carried their own
 * near-identical :root block. Two kinds of drift were found and resolved here:
 *
 *   1. Alert colours: dashboard used --live #ff4136, connect used --error #e74c3c.
 *      Rather than collapse them, they are now TWO deliberate semantic tokens:
 *        --live   = status "on air / happening now"  (#ff4136)
 *        --danger = destructive action / error        (#e74c3c)
 *   2. Radius / hover tokens were present in some files, absent in others.
 *      They are now always defined, plus --radius-pill and --tap-min added
 *      to encode the pill shapes and 48px tap targets the CSS already used.
 *
 * This is the single source of truth. No template should declare :root again —
 * see guardNoLocalTokens() in ./contract.ts, wired as a CI check.
 */

export const tokens = {
  '--bg': '#0a0a0a',
  '--surface': '#141414',
  '--surface-hover': '#1a1a1a',
  '--border': '#2a2a2a',
  '--text': '#f0f0f0',
  '--text-muted': '#888888',
  '--accent': '#D4954B',
  '--accent-hover': '#E8A849',
  '--live': '#ff4136',
  '--danger': '#e74c3c',
  '--radius': '12px',
  '--radius-sm': '8px',
  '--radius-pill': '20px',
  '--tap-min': '48px',
  '--font': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
} as const;

export type TokenName = keyof typeof tokens;

/** Render the tokens as a `:root { ... }` CSS block. */
export function rootBlock(): string {
  const lines = Object.entries(tokens).map(([k, v]) => `  ${k}: ${v};`);
  return `:root {\n${lines.join('\n')}\n}`;
}
