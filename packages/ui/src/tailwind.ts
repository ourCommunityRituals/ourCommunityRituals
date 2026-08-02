/**
 * @ocr/ui — Tailwind CSS preset for Phase 3 React surfaces.
 *
 * Import this preset in any React app's tailwind.config.ts to inherit
 * the full OCR token vocabulary as Tailwind utility classes. The preset
 * maps every Tier 2 semantic token to a CSS custom property reference so
 * the same light/dark theme logic (prefers-color-scheme + data-theme="…")
 * that governs the Worker surfaces governs React components too — one
 * token, one value, zero drift.
 *
 * Usage (tailwind.config.ts in the React app):
 *
 *   import { ocrTailwindPreset } from '@ocr/ui/tailwind'
 *   export default {
 *     presets: [ocrTailwindPreset],
 *     content: ['./src/**\/*.{ts,tsx}'],
 *   }
 *
 * The React app must also load the @ocr/ui stylesheet so the custom
 * properties are declared:
 *
 *   import '@ocr/ui/css'   // or link /ui.css from the Worker
 *
 * Generated utility class examples:
 *   bg-bg          → background-color: var(--bg)
 *   text-text       → color: var(--text)
 *   text-accent     → color: var(--accent)
 *   border-border   → border-color: var(--border)
 *   bg-surface      → background-color: var(--surface)
 *   text-text-muted → color: var(--text-muted)
 *   bg-live         → background-color: var(--live)
 *   bg-danger       → background-color: var(--danger)
 *   rounded-DEFAULT → border-radius: var(--radius)      (12px)
 *   rounded-sm      → border-radius: var(--radius-sm)   (8px)
 *   rounded-pill    → border-radius: var(--radius-pill) (20px)
 *   min-h-tap       → min-height: var(--tap-min)        (48px — WCAG tap target)
 *   font-sans       → font-family: var(--font)
 */

// Using Record<string, unknown> to avoid a hard devDependency on tailwindcss types.
// Callers who have tailwindcss installed can cast: `ocrTailwindPreset as Config['presets'][0]`
export const ocrTailwindPreset: Record<string, unknown> = {
  theme: {
    extend: {
      colors: {
        bg:             'var(--bg)',
        surface:        'var(--surface)',
        border:         'var(--border)',
        text:           'var(--text)',
        'text-muted':   'var(--text-muted)',
        accent:         'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        live:           'var(--live)',
        'live-hover':   'var(--live-hover)',
        'surface-hover':'var(--surface-hover)',
        danger:         'var(--danger)',
        'danger-hover': 'var(--danger-hover)',
        error:          'var(--error)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        pill:    'var(--radius-pill)',
      },
      fontFamily: {
        sans: ['var(--font)', 'system-ui', 'sans-serif'],
      },
      minHeight: {
        tap: 'var(--tap-min)',
      },
      minWidth: {
        tap: 'var(--tap-min)',
      },
    },
  },
};
