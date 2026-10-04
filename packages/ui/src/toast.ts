/**
 * @ocr/ui - the toast service (OSE-1564).
 *
 * One way to say "that worked", "that failed" and "heads up", on every surface.
 * Three kinds, each told apart by icon and shape as well as colour, each with a
 * visually hidden spoken label:
 *
 *   success  checkmark in a circle   "Success"  disappears after 10 s
 *   failure  cross in a circle       "Error"    stays until dismissed; an arrow
 *                                               opens the details, a button
 *                                               copies them
 *   neutral  info "i" in a circle    "Note"     disappears after 10 s
 *
 * WHAT THIS MODULE EXPORTS
 *   toastScript   the browser runtime, one self-contained script (window.ocrToast)
 *   toastStyles   its CSS; already part of componentStyles, so /ui.css carries it
 *   serveToastJs  a Worker route helper that serves the script (ETag revalidation)
 *
 * A spoke serves the script from its own origin and loads it with
 * <script src="/ui-toast.js" defer>. That is a same-origin external script, so a
 * strict CSP (script-src 'self' + nonces) needs no change. The script is plain DOM
 * building: createElement / createElementNS / textContent only. No innerHTML, no
 * inline handlers, no inline style, no eval; the CSS carries every presentation
 * rule. tests/toast.test.ts holds those properties.
 *
 * WHY A STRING AND NOT A FUNCTION OR A .js FILE
 *   The package ships TypeScript source with no build step (see index.ts), and a
 *   Worker cannot read a file at runtime. Stringifying a compiled function breaks
 *   under minifiers, so the runtime is authored once, here, as a string, and the
 *   tests run exactly that string in a DOM.
 *
 * SECURITY MODEL (Dr of Security, OSE-1564)
 *   - The copy block is an ALLOWLIST: code, request reference, time, action. The
 *     runtime reads those four properties by name from the details object and
 *     never iterates it, so an extra field (a token, a cookie, a response body)
 *     cannot reach the page or the clipboard.
 *   - code and reference must look like ids (letters, digits, _ . : -, short, not a
 *     JWT); the action and every message pass through sanitize(); time is always a
 *     real timestamp.
 *   - sanitize() removes stack frames, SQL and SQLite/D1 error codes, bearer tokens,
 *     JWTs, key=value secrets, emails, URLs with a query or fragment, and long
 *     opaque strings. If nothing readable is left it shows a plain sentence.
 *   - Server text is inserted as text, never as markup.
 *   - Nothing is tracked or sent anywhere. No cookies, no storage.
 */

/** The three kinds. */
export type OcrToastKind = 'success' | 'failure' | 'neutral';

/** The only fields a failure's details can carry (and its copy block lists). */
export interface OcrToastDetails {
  /** A stable error code, e.g. INVALID_TRANSITION. */
  code?: string;
  /** The X-Request-Id of the failed request. */
  requestId?: string;
  /** When it happened (Date, ms or ISO string). Defaults to now. */
  time?: Date | number | string;
  /** What was being attempted, in a few plain words ("Saving the event"). */
  action?: string;
}

export interface OcrToastOptions {
  /** Milliseconds before a success/neutral toast goes (1000-120000). Default 10000. 0 keeps it. Ignored for failure. */
  duration?: number;
  /** One optional action, e.g. { label: 'Turn off', onClick }. Runs, then the toast goes. */
  action?: { label: string; onClick: (handle: OcrToastHandle) => void };
  /** Failure only. */
  details?: OcrToastDetails;
}

export interface OcrToastHandle {
  dismiss(): void;
  readonly element: HTMLElement | null;
}

export interface OcrToastApi {
  success(message: unknown, options?: OcrToastOptions): OcrToastHandle;
  failure(message: unknown, options?: OcrToastOptions): OcrToastHandle;
  neutral(message: unknown, options?: OcrToastOptions): OcrToastHandle;
  dismissAll(): void;
  /** The same cleaning every message gets, for callers that want to show text elsewhere. */
  sanitize(input: unknown): string;
  /** Build failure details from a fetch Response (X-Request-Id) and its parsed JSON body (code). */
  detailsFrom(response: unknown, body: unknown, action?: string): OcrToastDetails;
  /** Opt in: uncaught errors and unhandled rejections show a plain failure toast. Returns an uninstall function. */
  installGlobalHandlers(): () => void;
  readonly version: string;
}

// ---------------------------------------------------------------------------
// Styles. Tokens only; the block is part of componentStyles (see styles.ts).
// ---------------------------------------------------------------------------

export const toastStyles = `
/* Toast (OSE-1564). Success and failure are solid fills of the locked status tokens
   with --on-accent text (AA in both themes, held by brandContrastPairs); neutral is a
   panel with a strong edge. The icon, not the colour, says which is which. */
.ocr-toast-region{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));left:8px;right:8px;z-index:1000;display:flex;flex-direction:column;gap:8px;pointer-events:none}
@media(min-width:640px){.ocr-toast-region{left:auto;right:16px;width:min(420px,calc(100vw - 32px))}}
.ocr-toast-live{display:flex;flex-direction:column;gap:8px}
.ocr-toast{pointer-events:auto;display:grid;grid-template-columns:auto minmax(0,1fr) auto;column-gap:12px;row-gap:8px;align-items:start;padding:12px;border:2px solid var(--border-strong);border-radius:var(--radius);background:var(--surface);color:var(--text);font-family:var(--font);font-size:1rem;line-height:1.4;animation:ocr-toast-in .15s ease-out}
.ocr-toast--success{background:var(--success);border-color:var(--success);color:var(--on-accent)}
.ocr-toast--failure{background:var(--danger);border-color:var(--danger);color:var(--on-accent)}
.ocr-toast--neutral{background:var(--surface);border-color:var(--border-strong);color:var(--text)}
@keyframes ocr-toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.ocr-toast-icon{display:flex;align-items:center;min-height:44px}
.ocr-toast-icon svg{display:block;width:28px;height:28px}
.ocr-toast-icon circle{fill:var(--on-accent)}
.ocr-toast-icon path{fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.ocr-toast--success .ocr-toast-icon path{stroke:var(--success)}
.ocr-toast--failure .ocr-toast-icon path{stroke:var(--danger)}
.ocr-toast--neutral .ocr-toast-icon circle{fill:none;stroke:var(--text);stroke-width:2}
.ocr-toast--neutral .ocr-toast-icon path{stroke:var(--text)}
.ocr-toast-body{display:flex;flex-direction:column;gap:8px;min-width:0}
.ocr-toast-msg{margin:0;padding-top:10px;overflow-wrap:anywhere}
.ocr-toast-actions{display:flex;flex-wrap:wrap;gap:8px}
.ocr-toast-btn{min-height:44px;min-width:44px;padding:8px 14px;border:2px solid currentColor;border-radius:var(--radius-sm);background:transparent;color:inherit;font:inherit;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:6px}
.ocr-toast-btn:hover{text-decoration:underline}
.ocr-toast-dismiss{min-height:44px;min-width:44px;width:44px;padding:0;border:0;border-radius:var(--radius-sm);background:transparent;color:inherit;font:inherit;font-size:1.5rem;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}
.ocr-toast-btn:focus-visible,.ocr-toast-dismiss:focus-visible{outline:2px solid currentColor;outline-offset:2px}
.ocr-toast-chevron{display:inline-block;transition:transform .15s}
.ocr-toast-more[aria-expanded="true"] .ocr-toast-chevron{transform:rotate(90deg)}
.ocr-toast-details{grid-column:1/-1;display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);background:var(--surface);color:var(--text)}
.ocr-toast-details-text{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.875rem;user-select:text}
.ocr-toast-details .ocr-toast-btn{align-self:flex-start}
.ocr-toast-copied{font-size:.875rem}
.ocr-toast-copy-buffer{position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none}
.ocr-sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
@media(prefers-reduced-motion:reduce){.ocr-toast{animation:none}.ocr-toast-chevron{transition:none}}
@media print{.ocr-toast-region{display:none}}
`.trim();

// ---------------------------------------------------------------------------
// The browser runtime. Authored as a string (see the header); evaluated as-is by
// tests/toast.test.ts. ES2017, no dependencies, idempotent.
// ---------------------------------------------------------------------------

export const toastScript: string = String.raw`(function (root) {
  'use strict';
  if (!root || root.ocrToast) return;
  var doc = root.document;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MAX_STACK = 3;
  var DEFAULT_MS = 10000;
  var MIN_MS = 1000;
  var MAX_MS = 120000;
  var MAX_MSG = 280;
  var MAX_ACTION = 120;
  var NA = 'not available';
  var GENERIC = 'Something went wrong. Please try again.';
  var GENERIC_PAGE = 'Something went wrong on this page. Please try again.';
  var KINDS = {
    success: { word: 'Success', live: 'polite', icon: 'check', d: 'M7 12.5l3.2 3.2L17 8.8' },
    failure: { word: 'Error', live: 'assertive', icon: 'cross', d: 'M8.5 8.5l7 7M15.5 8.5l-7 7' },
    neutral: { word: 'Note', live: 'polite', icon: 'info', d: 'M12 10.5v6.5M12 7v0.01' }
  };

  var list = [];
  var region = null;
  var lanes = {};
  var lastOutside = null;
  var uid = 0;
  var handlers = null;

  function now() { return root.Date.now(); }
  function later(fn, ms) { return root.setTimeout(fn, ms); }
  function cancel(id) { root.clearTimeout(id); }

  // ---- cleaning -----------------------------------------------------------
  var RE_STACK_LINE = /^\s*at\s+\S+/;
  var RE_FILE_LINE = /\S+\.(?:js|mjs|cjs|jsx|ts|tsx):\d+(?::\d+)?\)?\s*$/;
  var RE_SQL = /\b(?:SELECT\b[\s\S]*\bFROM\b|INSERT\s+INTO\b|UPDATE\s+\w+\s+SET\b|DELETE\s+FROM\b|DROP\s+TABLE\b|ALTER\s+TABLE\b|CREATE\s+TABLE\b|SQLITE_[A-Z_]+|D1_ERROR|UNIQUE constraint failed|no such (?:table|column))/i;
  var RE_JWT = /\beyJ[\w-]{5,}\.[\w-]{5,}(?:\.[\w-]*)?/g;
  var RE_BEARER = /\b(?:Bearer|Basic)\s+[\w.~+\/=-]{6,}/gi;
  var RE_PREFIXED_KEY = /\b(?:sk|pk|rk|ghp|gho|ghs|xox[abprs])[-_][A-Za-z0-9_-]{8,}/g;
  var RE_SECRET_PAIR = /\b(?:access[_-]?token|id[_-]?token|refresh[_-]?token|token|api[_-]?key|apikey|secret|password|passwd|pwd|authorization|session(?:[_-]?id)?|cookie|signature)\s*[=:]\s*[^\s&;,"']+/gi;
  var RE_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"')]+/gi;
  var RE_REL_LINK = /(^|[\s(])\/[^\s?#)]*[?#][^\s)]*/g;
  var RE_EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var RE_OPAQUE = /\b[A-Za-z0-9_-]{32,}\b/g;
  var RE_ID = /^[A-Za-z0-9_.:-]+$/;

  function sanitize(input) {
    var s = '';
    if (typeof input === 'string') s = input;
    else if (input && typeof input.message === 'string') s = input.message;
    else if (typeof input === 'number' || typeof input === 'boolean') s = String(input);
    s = s.split(/\r?\n/).filter(function (line) {
      return !RE_STACK_LINE.test(line) && !RE_FILE_LINE.test(line);
    }).join(' ');
    if (RE_SQL.test(s)) return GENERIC;
    s = s.replace(RE_JWT, '')
      .replace(RE_BEARER, '')
      .replace(RE_PREFIXED_KEY, '[removed]')
      .replace(RE_SECRET_PAIR, '[removed]')
      .replace(RE_URL, function (u) { return /[?#@]/.test(u) ? '[link]' : u; })
      .replace(RE_REL_LINK, '$1[link]')
      .replace(RE_EMAIL, '[email]')
      .replace(RE_OPAQUE, '[removed]')
      .replace(/\s+/g, ' ')
      .replace(/^\s+|\s+$/g, '');
    var readable = s.replace(/\[(?:email|link|removed)\]/g, '').replace(/[^A-Za-z]/g, '');
    if (readable.length < 2) return GENERIC;
    if (s.length > MAX_MSG) s = s.slice(0, MAX_MSG - 3) + '...';
    return s;
  }

  function cleanId(v, max) {
    if (typeof v !== 'string' || v.length < 1 || v.length > max) return '';
    if (!RE_ID.test(v)) return '';
    if (v.indexOf('eyJ') !== -1) return '';
    return v;
  }

  function cleanAction(v) {
    if (typeof v !== 'string' || !v.replace(/\s+/g, '')) return '';
    var s = sanitize(v);
    if (s === GENERIC && v !== GENERIC) return '';
    return s.length > MAX_ACTION ? s.slice(0, MAX_ACTION) : s;
  }

  function cleanTime(v) {
    var d = null;
    if (v !== undefined && v !== null) {
      if (Object.prototype.toString.call(v) === '[object Date]') d = v;
      else if (typeof v === 'number' || typeof v === 'string') d = new root.Date(v);
    }
    if (!d || isNaN(d.getTime())) d = new root.Date();
    return d.toISOString();
  }

  // The allowlist: these four properties are read by name. Nothing is iterated.
  function normalizeDetails(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    return {
      code: cleanId(r.code, 48),
      requestId: cleanId(r.requestId, 64),
      time: cleanTime(r.time),
      action: cleanAction(r.action)
    };
  }

  function detailsText(d) {
    return [
      'Error code: ' + (d.code || NA),
      'Request reference: ' + (d.requestId || NA),
      'Time: ' + d.time,
      'Action: ' + (d.action || NA)
    ].join('\n');
  }

  function detailsFrom(response, body, action) {
    var out = {};
    var code = body && typeof body === 'object' ? cleanId(body.code, 48) : '';
    var ref = '';
    try {
      if (response && response.headers && typeof response.headers.get === 'function') {
        ref = cleanId(response.headers.get('x-request-id'), 64);
      }
    } catch (e) { ref = ''; }
    var act = cleanAction(action);
    if (code) out.code = code;
    if (ref) out.requestId = ref;
    if (act) out.action = act;
    return out;
  }

  // ---- DOM ----------------------------------------------------------------
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function button(cls, label) {
    var b = el('button', cls, label);
    b.type = 'button';
    return b;
  }

  function ensureRegion() {
    if (region && region.isConnected) return region;
    if (!doc || !doc.body) return null;
    region = el('div', 'ocr-toast-region');
    region.setAttribute('data-ocr-toast-region', '');
    // Both live regions exist before any toast does, so the first message is announced.
    ['assertive', 'polite'].forEach(function (mode) {
      var lane = el('div', 'ocr-toast-live');
      lane.setAttribute('aria-live', mode);
      lane.setAttribute('aria-atomic', 'false');
      lane.setAttribute('data-live', mode);
      region.appendChild(lane);
      lanes[mode] = lane;
    });
    doc.body.appendChild(region);
    return region;
  }

  function makeIcon(kind) {
    var k = KINDS[kind];
    var wrap = el('span', 'ocr-toast-icon');
    wrap.setAttribute('aria-hidden', 'true');
    var svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('data-icon', k.icon);
    var c = doc.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', '12');
    c.setAttribute('cy', '12');
    c.setAttribute('r', '11');
    var p = doc.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', k.d);
    svg.appendChild(c);
    svg.appendChild(p);
    wrap.appendChild(svg);
    return wrap;
  }

  function legacyCopy(text) {
    var prev = doc.activeElement;
    var ta = null;
    try {
      ta = el('textarea', 'ocr-toast-copy-buffer');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.setAttribute('aria-hidden', 'true');
      ta.tabIndex = -1;
      doc.body.appendChild(ta);
      ta.select();
      return typeof doc.execCommand === 'function' && doc.execCommand('copy') === true;
    } catch (e) {
      return false;
    } finally {
      if (ta && ta.parentNode) ta.parentNode.removeChild(ta);
      if (prev && typeof prev.focus === 'function') { try { prev.focus(); } catch (e2) { /* ignore */ } }
    }
  }

  function copyText(text) {
    var nav = root.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      try {
        return nav.clipboard.writeText(text).then(
          function () { return true; },
          function () { return legacyCopy(text); }
        );
      } catch (e) { /* fall through to the legacy path */ }
    }
    return root.Promise.resolve(legacyCopy(text));
  }

  // ---- timers -------------------------------------------------------------
  function arm(t) {
    if (!t.timed || t.gone || t.hovered || t.focused || t.timer !== null) return;
    t.startedAt = now();
    t.timer = later(function () { t.timer = null; dismiss(t); }, t.remaining);
  }

  function pause(t) {
    if (t.timer === null) return;
    cancel(t.timer);
    t.timer = null;
    t.remaining = Math.max(0, t.remaining - (now() - t.startedAt));
  }

  function restart(t) {
    if (t.timer !== null) { cancel(t.timer); t.timer = null; }
    t.remaining = t.duration;
    arm(t);
  }

  // ---- lifecycle ----------------------------------------------------------
  function restoreFocus() {
    var target = lastOutside;
    if (target && target.isConnected && typeof target.focus === 'function') {
      try { target.focus(); } catch (e) { /* ignore */ }
    }
  }

  function dismiss(t) {
    if (t.gone) return;
    t.gone = true;
    if (t.timer !== null) { cancel(t.timer); t.timer = null; }
    if (t.copyTimer !== null) { cancel(t.copyTimer); t.copyTimer = null; }
    var idx = list.indexOf(t);
    if (idx !== -1) list.splice(idx, 1);
    var hadFocus = t.el.contains(doc.activeElement);
    if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
    if (hadFocus) restoreFocus();
  }

  function evict() {
    var victim = null;
    for (var i = 0; i < list.length; i++) {
      if (list[i].kind !== 'failure') { victim = list[i]; break; }
    }
    dismiss(victim || list[0]);
  }

  function normalizeDuration(d) {
    if (d === undefined || d === null) return DEFAULT_MS;
    if (typeof d !== 'number' || !isFinite(d)) return DEFAULT_MS;
    if (d <= 0) return 0;
    return Math.min(MAX_MS, Math.max(MIN_MS, d));
  }

  function normalizeAction(a) {
    if (!a || typeof a !== 'object' || typeof a.onClick !== 'function' || typeof a.label !== 'string') return null;
    var label = sanitize(a.label);
    if (!a.label.replace(/\s+/g, '') || (label === GENERIC && a.label !== GENERIC)) return null;
    return { label: label.length > 40 ? label.slice(0, 40) : label, onClick: a.onClick };
  }

  function show(kind, message, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var text = sanitize(message);
    var det = kind === 'failure' ? normalizeDetails(opts.details) : null;
    var act = normalizeAction(opts.action);
    var duration = kind === 'failure' ? 0 : normalizeDuration(opts.duration);
    var key = [kind, text, det ? det.code : '', det ? det.requestId : '', act ? act.label : ''].join('|');

    for (var i = 0; i < list.length; i++) {
      if (list[i].key === key) {
        if (list[i].timed) restart(list[i]);
        return list[i].handle;
      }
    }
    if (!ensureRegion()) return { dismiss: function () {}, element: null };
    while (list.length >= MAX_STACK) evict();

    var t = {
      key: key, kind: kind, el: null, handle: null,
      duration: duration, remaining: duration, timed: duration > 0,
      timer: null, startedAt: 0, hovered: false, focused: false, gone: false, copyTimer: null
    };
    var word = KINDS[kind].word;
    var node = el('div', 'ocr-toast ocr-toast--' + kind);
    node.setAttribute('data-ocr-toast', kind);
    t.el = node;

    node.appendChild(makeIcon(kind));

    var body = el('div', 'ocr-toast-body');
    var msg = el('p', 'ocr-toast-msg');
    msg.appendChild(el('span', 'ocr-sr-only', word + ': '));
    msg.appendChild(doc.createTextNode(text));
    body.appendChild(msg);

    var actions = el('div', 'ocr-toast-actions');
    if (act) {
      var ab = button('ocr-toast-btn ocr-toast-action', act.label);
      ab.addEventListener('click', function () {
        try { act.onClick(t.handle); } catch (e) { if (root.console) root.console.error(e); }
        dismiss(t);
      });
      actions.appendChild(ab);
    }

    var panel = null;
    if (det) {
      var panelId = 'ocr-toast-details-' + (++uid);
      var block = detailsText(det);
      var more = button('ocr-toast-btn ocr-toast-more');
      more.setAttribute('aria-expanded', 'false');
      more.setAttribute('aria-controls', panelId);
      more.appendChild(doc.createTextNode('Details'));
      more.appendChild(el('span', 'ocr-toast-chevron', '▸'));
      more.lastChild.setAttribute('aria-hidden', 'true');
      actions.appendChild(more);

      panel = el('div', 'ocr-toast-details');
      panel.id = panelId;
      panel.hidden = true;
      panel.appendChild(el('pre', 'ocr-toast-details-text', block));
      var copy = button('ocr-toast-btn ocr-toast-copy', 'Copy details');
      var status = el('span', 'ocr-toast-copied');
      status.setAttribute('role', 'status');
      copy.addEventListener('click', function () {
        copyText(block).then(function (ok) {
          status.textContent = ok ? 'Copied.' : 'Could not copy. Select the text above and copy it yourself.';
          if (t.copyTimer !== null) cancel(t.copyTimer);
          t.copyTimer = later(function () { t.copyTimer = null; status.textContent = ''; }, 4000);
        });
      });
      panel.appendChild(copy);
      panel.appendChild(status);

      more.addEventListener('click', function () {
        var open = more.getAttribute('aria-expanded') !== 'true';
        more.setAttribute('aria-expanded', open ? 'true' : 'false');
        panel.hidden = !open;
      });
    }
    if (actions.firstChild) body.appendChild(actions);
    node.appendChild(body);

    var close = button('ocr-toast-dismiss');
    close.setAttribute('aria-label', 'Dismiss');
    close.appendChild(el('span', '', '×'));
    close.lastChild.setAttribute('aria-hidden', 'true');
    close.addEventListener('click', function () { dismiss(t); });
    node.appendChild(close);

    if (panel) node.appendChild(panel);

    node.addEventListener('mouseenter', function () { t.hovered = true; pause(t); });
    node.addEventListener('mouseleave', function () { t.hovered = false; arm(t); });
    node.addEventListener('focusin', function () { t.focused = true; pause(t); });
    node.addEventListener('focusout', function (e) {
      if (e.relatedTarget && node.contains(e.relatedTarget)) return;
      t.focused = false;
      arm(t);
    });
    node.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        dismiss(t);
      }
    });

    t.handle = { dismiss: function () { dismiss(t); }, element: node };
    list.push(t);
    lanes[KINDS[kind].live].appendChild(node);
    arm(t);
    return t.handle;
  }

  function dismissAll() {
    list.slice().forEach(dismiss);
  }

  // ---- opt-in global handlers ----------------------------------------------
  function installGlobalHandlers() {
    if (handlers) return handlers.off;
    function codeOf(err, fallback) {
      var c = err && typeof err === 'object' ? cleanId(err.code, 48) : '';
      return c || fallback;
    }
    function refOf(err) {
      return err && typeof err === 'object' ? err.requestId : undefined;
    }
    function onError(ev) {
      if (!ev || (!ev.error && (!ev.message || ev.message === 'Script error.'))) return;
      show('failure', GENERIC_PAGE, { details: { code: codeOf(ev.error, 'CLIENT_ERROR'), requestId: refOf(ev.error) } });
    }
    function onRejection(ev) {
      var reason = ev ? ev.reason : undefined;
      show('failure', GENERIC_PAGE, { details: { code: codeOf(reason, 'UNHANDLED_REJECTION'), requestId: refOf(reason) } });
    }
    root.addEventListener('error', onError);
    root.addEventListener('unhandledrejection', onRejection);
    handlers = {
      off: function () {
        root.removeEventListener('error', onError);
        root.removeEventListener('unhandledrejection', onRejection);
        handlers = null;
      }
    };
    return handlers.off;
  }

  if (doc) {
    doc.addEventListener('focusin', function (e) {
      var target = e.target;
      if (target && !(region && region.contains(target))) lastOutside = target;
    });
    if (doc.body) ensureRegion();
    else doc.addEventListener('DOMContentLoaded', ensureRegion);
  }

  root.ocrToast = {
    success: function (message, options) { return show('success', message, options); },
    failure: function (message, options) { return show('failure', message, options); },
    neutral: function (message, options) { return show('neutral', message, options); },
    dismissAll: dismissAll,
    sanitize: sanitize,
    detailsFrom: detailsFrom,
    installGlobalHandlers: installGlobalHandlers,
    version: '1'
  };
})(window);
`;

// ---------------------------------------------------------------------------
// Serving
// ---------------------------------------------------------------------------

/** FNV-1a over the script: a stable validator that changes exactly when the script does. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const TOAST_ETAG = `"ocr-toast-${fnv1a(toastScript)}"`;

/**
 * Serve the runtime from a stable route (e.g. GET /ui-toast.js) in a Worker.
 * Revalidated by ETag on every load, like /ui.css in the spokes, so a hub pin bump
 * reaches browsers without waiting out a max-age. Pass the request to answer a
 * matching If-None-Match with a bodiless 304.
 *
 * @workerOnly - uses the Web `Response` API.
 */
export function serveToastJs(request?: Request): Response {
  const headers = {
    'content-type': 'text/javascript; charset=utf-8',
    'cache-control': 'no-cache',
    'x-content-type-options': 'nosniff',
    etag: TOAST_ETAG,
  };
  const inm = request?.headers.get('if-none-match');
  if (inm && inm.split(',').some((v) => v.trim().replace(/^W\//, '') === TOAST_ETAG)) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(toastScript, { headers });
}
