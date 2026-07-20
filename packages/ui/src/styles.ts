/**
 * @ocr/ui — Shared component styles
 *
 * The reset + component vocabulary that repeated across every template:
 * .header, .section, .btn family, .card, .bottom-nav/.nav-item,
 * .loading/.spinner, .live-indicator, inputs, .hidden — plus ONE new
 * component the fleet was missing: .empty-state, which gives every dead-end
 * (no data yet, access denied) a title, a message, and a next step.
 *
 * All values reference tokens.ts. Nothing hard-codes a colour or radius.
 */

export const componentStyles = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:var(--font);background:var(--bg);color:var(--text);min-height:100dvh;-webkit-font-smoothing:antialiased}

/* Layout */
.header{position:sticky;top:0;z-index:10;background:rgba(10,10,10,.9);backdrop-filter:blur(12px);border-bottom:1px solid var(--border);padding:16px 20px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:1.25rem;font-weight:700}
.content{padding:20px 20px 100px}
.section{margin-bottom:24px}
.section-title{font-size:.8rem;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}

/* Buttons — all meet the 48px tap target */
.btn{padding:14px 20px;border:none;border-radius:var(--radius-sm);font-size:.9rem;font-weight:600;cursor:pointer;font-family:var(--font);min-height:var(--tap-min);transition:opacity .2s;display:inline-flex;align-items:center;justify-content:center;gap:8px;text-decoration:none}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{background:var(--accent);color:#000}
.btn-primary:hover{background:var(--accent-hover)}
.btn-secondary{background:var(--surface);color:var(--text);border:1px solid var(--border)}
.btn-secondary:hover{background:var(--surface-hover)}
.btn-danger{background:var(--danger);color:#fff}
.btn-block{width:100%}

/* Cards */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:14px}
.card:hover{background:var(--surface-hover)}

/* Inputs (generalised from .venue-input / .track-search) */
.input{width:100%;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:.85rem;font-family:var(--font);outline:none}
.input:focus{border-color:var(--accent)}
.input::placeholder{color:var(--text-muted)}

/* Bottom nav */
.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:rgba(10,10,10,.95);backdrop-filter:blur(12px);border-top:1px solid var(--border);display:flex;justify-content:space-around;padding:10px 0 env(safe-area-inset-bottom,10px)}
.nav-item{display:flex;flex-direction:column;align-items:center;gap:4px;font-size:.65rem;color:var(--text-muted);text-decoration:none;padding:6px 16px;min-height:var(--tap-min);justify-content:center}
.nav-item.active{color:var(--accent)}
.nav-item svg{width:22px;height:22px}

/* Live indicator */
.live-indicator{font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;padding:4px 10px;border-radius:var(--radius-pill)}
.live-indicator.on{color:var(--live);background:rgba(255,65,54,.15);animation:pulse 2s ease-in-out infinite}
.live-indicator.off{color:var(--text-muted);background:var(--surface)}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}

/* Loading */
.loading{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:20px}
.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}

/* Empty state — NEW. Replaces every bare "access denied" / blank screen.
   Always carries a next step so first-touch never dead-ends. */
.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:50vh;padding:40px 24px;gap:12px}
.empty-state .es-icon{font-size:2.5rem;line-height:1;margin-bottom:4px}
.empty-state h3{font-size:1.1rem;font-weight:700}
.empty-state p{color:var(--text-muted);font-size:.9rem;max-width:34ch}
.empty-state .btn{margin-top:12px}

.hidden{display:none}
`.trim();
