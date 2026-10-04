/**
 * OSE-1564 — the toast service. Behaviour tests.
 *
 * The client script is the shipped artefact (`toastScript`), so it is evaluated
 * in a real DOM (jsdom) exactly as a spoke serves it. Timers are a manual fake
 * clock installed as the window's setTimeout/clearTimeout/Date.now, so timing is
 * exact and nothing sleeps.
 */
import { describe, it, expect, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { toastScript, serveToastJs } from '../src/toast';

/* eslint-disable @typescript-eslint/no-explicit-any */

class Clock {
  t = 0;
  private next = 1;
  private q = new Map<number, { at: number; fn: () => void }>();
  set = (fn: () => void, ms: number): number => {
    const id = this.next++;
    this.q.set(id, { at: this.t + (ms || 0), fn });
    return id;
  };
  clear = (id: number): void => {
    this.q.delete(id);
  };
  advance(ms: number): void {
    const target = this.t + ms;
    for (;;) {
      let best: [number, { at: number; fn: () => void }] | undefined;
      for (const e of this.q.entries()) if (e[1].at <= target && (!best || e[1].at < best[1].at)) best = e;
      if (!best) break;
      this.q.delete(best[0]);
      this.t = best[1].at;
      best[1].fn();
    }
    this.t = target;
  }
  get pending(): number {
    return this.q.size;
  }
}

function boot(opts: { clipboard?: 'ok' | 'none' | 'reject' } = {}) {
  const dom = new JSDOM(
    '<!doctype html><html><body><button id="primary">Save</button></body></html>',
    { runScripts: 'outside-only', url: 'https://ose.test/admin', pretendToBeVisual: true },
  );
  const w = dom.window as any;
  const clock = new Clock();
  w.setTimeout = clock.set;
  w.clearTimeout = clock.clear;
  w.Date.now = () => clock.t;
  const writeText = vi.fn(() => (opts.clipboard === 'reject' ? Promise.reject(new Error('denied')) : Promise.resolve()));
  if (opts.clipboard !== 'none') {
    Object.defineProperty(w.navigator, 'clipboard', { value: { writeText }, configurable: true });
  }
  const execCommand = vi.fn(() => true);
  w.document.execCommand = execCommand;
  w.eval(toastScript);
  const doc = w.document as Document;
  return { w, doc, toast: w.ocrToast, clock, writeText, execCommand };
}

const all = (doc: Document) => Array.from(doc.querySelectorAll('.ocr-toast'));
const flush = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
const FULL = {
  code: 'INVALID_TRANSITION',
  requestId: 'req-7f3a9c21',
  time: '2026-10-04T12:00:00.000Z',
  action: 'Saving the event',
};

describe('the script ships as one self-contained, idempotent global', () => {
  it('defines window.ocrToast with the three kinds', () => {
    const { toast } = boot();
    expect(typeof toast.success).toBe('function');
    expect(typeof toast.failure).toBe('function');
    expect(typeof toast.neutral).toBe('function');
    expect(typeof toast.installGlobalHandlers).toBe('function');
  });

  it('evaluating it twice keeps one instance and one region', () => {
    const { w, doc, toast } = boot();
    const first = w.ocrToast;
    w.eval(toastScript);
    expect(w.ocrToast).toBe(first);
    toast.neutral('hello');
    expect(doc.querySelectorAll('[data-ocr-toast-region]')).toHaveLength(1);
  });
});

describe('each kind has an icon, a shape and a spoken label', () => {
  const cases = [
    ['success', 'Success', 'check', 'polite'],
    ['failure', 'Error', 'cross', 'assertive'],
    ['neutral', 'Note', 'info', 'polite'],
  ] as const;

  for (const [kind, label, icon, live] of cases) {
    it(`${kind}: icon ${icon}, hidden word "${label}", ${live} live region`, () => {
      const { doc, toast } = boot();
      toast[kind]('Event saved');
      const el = doc.querySelector(`.ocr-toast--${kind}`) as HTMLElement;
      expect(el, `${kind} toast rendered`).toBeTruthy();
      expect(el.querySelector('svg')?.getAttribute('data-icon')).toBe(icon);
      const sr = el.querySelector('.ocr-sr-only');
      expect(sr?.textContent).toContain(label);
      expect(el.querySelector('.ocr-toast-msg')?.textContent).toContain('Event saved');
      expect(el.closest('[aria-live]')?.getAttribute('aria-live')).toBe(live);
    });
  }

  it('the three kinds differ by icon, not only by colour', () => {
    const { doc, toast } = boot();
    toast.success('a');
    toast.neutral('b');
    toast.failure('c');
    const icons = Array.from(doc.querySelectorAll('.ocr-toast svg')).map((s) => s.getAttribute('data-icon'));
    expect(new Set(icons).size).toBe(3);
  });

  it('the icon is decoration: hidden from assistive technology', () => {
    const { doc, toast } = boot();
    toast.success('Saved');
    expect(doc.querySelector('.ocr-toast-icon')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('a toast never takes focus', () => {
    const { w, doc, toast } = boot();
    (doc.getElementById('primary') as HTMLElement).focus();
    toast.failure('Nope', { details: FULL });
    toast.success('Yes');
    expect(w.document.activeElement?.id).toBe('primary');
  });

  it('server text is inserted as text, never as markup', () => {
    const { doc, toast } = boot();
    toast.failure('<img src=x onerror="window.pwned=1"><b>bold</b>');
    expect(doc.querySelector('.ocr-toast img')).toBeNull();
    expect(doc.querySelector('.ocr-toast b')).toBeNull();
    expect(doc.querySelector('.ocr-toast-msg')?.textContent).toContain('<b>bold</b>');
    expect((doc.defaultView as any).pwned).toBeUndefined();
  });
});

describe('timing', () => {
  it('neutral disappears by itself after 10 seconds, not before', () => {
    const { doc, toast, clock } = boot();
    toast.neutral('Heads up');
    clock.advance(9_999);
    expect(all(doc)).toHaveLength(1);
    clock.advance(1);
    expect(all(doc)).toHaveLength(0);
  });

  it('success disappears by itself after 10 seconds (PO default)', () => {
    const { doc, toast, clock } = boot();
    toast.success('Saved');
    clock.advance(9_999);
    expect(all(doc)).toHaveLength(1);
    clock.advance(1);
    expect(all(doc)).toHaveLength(0);
  });

  it('the duration is configurable', () => {
    const { doc, toast, clock } = boot();
    toast.neutral('Quick', { duration: 3000 });
    clock.advance(3000);
    expect(all(doc)).toHaveLength(0);
  });

  it('a failure stays until dismissed, whatever duration is asked for', () => {
    const { doc, toast, clock } = boot();
    toast.failure('Could not save', { duration: 1000 });
    clock.advance(10 * 60_000);
    expect(all(doc)).toHaveLength(1);
  });

  it('the timer pauses while hovered and resumes with the time that was left', () => {
    const { w, doc, toast, clock } = boot();
    toast.neutral('Read me');
    const el = doc.querySelector('.ocr-toast') as HTMLElement;
    clock.advance(5000);
    el.dispatchEvent(new w.MouseEvent('mouseenter'));
    clock.advance(120_000);
    expect(all(doc)).toHaveLength(1);
    el.dispatchEvent(new w.MouseEvent('mouseleave'));
    clock.advance(4_999);
    expect(all(doc)).toHaveLength(1);
    clock.advance(1);
    expect(all(doc)).toHaveLength(0);
  });

  it('the timer pauses while keyboard focus is inside the toast', () => {
    const { doc, toast, clock } = boot();
    toast.neutral('Read me');
    const dismiss = doc.querySelector('.ocr-toast-dismiss') as HTMLElement;
    dismiss.focus();
    clock.advance(60_000);
    expect(all(doc)).toHaveLength(1);
    dismiss.blur();
    clock.advance(10_000);
    expect(all(doc)).toHaveLength(0);
  });

  it('hover and focus together: leaving only one keeps it paused', () => {
    const { w, doc, toast, clock } = boot();
    toast.neutral('Read me');
    const el = doc.querySelector('.ocr-toast') as HTMLElement;
    const dismiss = doc.querySelector('.ocr-toast-dismiss') as HTMLElement;
    el.dispatchEvent(new w.MouseEvent('mouseenter'));
    dismiss.focus();
    el.dispatchEvent(new w.MouseEvent('mouseleave'));
    clock.advance(60_000);
    expect(all(doc)).toHaveLength(1);
    dismiss.blur();
    clock.advance(10_000);
    expect(all(doc)).toHaveLength(0);
  });

  it('dismissing clears the timer (no stray callbacks)', () => {
    const { toast, clock } = boot();
    const h = toast.neutral('Bye');
    h.dismiss();
    expect(clock.pending).toBe(0);
  });
});

describe('failure details', () => {
  it('opens from an arrow button: collapsed first, expanded after a click', () => {
    const { doc, toast } = boot();
    toast.failure('Could not save the event', { details: FULL });
    const more = doc.querySelector('.ocr-toast-more') as HTMLButtonElement;
    const panel = doc.querySelector('.ocr-toast-details') as HTMLElement;
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(panel.hidden).toBe(true);
    expect(more.getAttribute('aria-controls')).toBe(panel.id);
    more.click();
    expect(more.getAttribute('aria-expanded')).toBe('true');
    expect(panel.hidden).toBe(false);
    more.click();
    expect(panel.hidden).toBe(true);
  });

  it('shows the error code, request reference, time and action', () => {
    const { doc, toast } = boot();
    toast.failure('Could not save the event', { details: FULL });
    const text = doc.querySelector('.ocr-toast-details-text')?.textContent ?? '';
    expect(text).toContain('INVALID_TRANSITION');
    expect(text).toContain('req-7f3a9c21');
    expect(text).toContain('2026-10-04T12:00:00.000Z');
    expect(text).toContain('Saving the event');
  });

  it('copy puts exactly the details block on the clipboard, as plain text', async () => {
    const { doc, toast, writeText } = boot();
    toast.failure('Could not save the event', { details: FULL });
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText).toHaveBeenCalledWith(
      [
        'Error code: INVALID_TRANSITION',
        'Request reference: req-7f3a9c21',
        'Time: 2026-10-04T12:00:00.000Z',
        'Action: Saving the event',
      ].join('\n'),
    );
    expect(doc.querySelector('.ocr-toast-copied')?.textContent).toMatch(/copied/i);
  });

  it('what is copied is what is shown', async () => {
    const { doc, toast, writeText } = boot();
    toast.failure('x', { details: FULL });
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    const shown = doc.querySelector('.ocr-toast-details-text')?.textContent;
    expect((writeText.mock.calls[0] as unknown[])[0]).toBe(shown);
  });

  it('a missing field is stated, not invented', () => {
    const { doc, toast } = boot();
    toast.failure('Could not save', { details: { code: 'E_X' } });
    const text = doc.querySelector('.ocr-toast-details-text')?.textContent ?? '';
    expect(text).toContain('Error code: E_X');
    expect(text).toContain('Request reference: not available');
    expect(text).toContain('Action: not available');
    expect(text).toMatch(/Time: \d{4}-\d{2}-\d{2}T/);
  });

  it('falls back to a hidden-textarea copy when the clipboard API is missing', async () => {
    const { doc, toast, execCommand } = boot({ clipboard: 'none' });
    toast.failure('x', { details: FULL });
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(doc.querySelector('textarea.ocr-toast-copy-buffer')).toBeNull();
    expect(doc.querySelector('.ocr-toast-copied')?.textContent).toMatch(/copied/i);
  });

  it('says so when copying is refused, and points at the selectable text', async () => {
    const { doc, toast, execCommand } = boot({ clipboard: 'reject' });
    execCommand.mockReturnValue(false);
    toast.failure('x', { details: FULL });
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    expect(doc.querySelector('.ocr-toast-copied')?.textContent).toMatch(/could not copy/i);
  });

  it('only a failure carries details', () => {
    const { doc, toast } = boot();
    toast.success('Saved', { details: FULL });
    toast.neutral('Note', { details: FULL });
    expect(doc.querySelector('.ocr-toast-details')).toBeNull();
    expect(doc.querySelector('.ocr-toast-more')).toBeNull();
  });
});

describe('details never carry anything sensitive (Dr of Security)', () => {
  const SECRET = 'S3CR3T-hunter2-abcdef0123456789';
  const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.c2lnbmF0dXJlLXZhbHVl';
  const EMAIL = 'founder@example.com';

  function seeded() {
    return {
      // Fields an app might hand over by accident: none is in the allowlist.
      details: {
        ...FULL,
        token: SECRET,
        authorization: `Bearer ${SECRET}`,
        cookie: `session=${SECRET}`,
        signedLink: `https://ose.test/sponsor?t=${SECRET}`,
        body: JSON.stringify({ email: EMAIL, token: SECRET }),
        response: { token: SECRET, email: EMAIL },
        stack: `Error: boom\n    at handler (/app/src/x.ts:10:5)`,
      },
      response: { token: SECRET },
      token: SECRET,
    } as any;
  }

  it('fields outside the allowlist never reach the page or the clipboard', async () => {
    const { doc, toast, writeText } = boot();
    toast.failure('Could not save', seeded());
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    const page = doc.body.textContent ?? '';
    const copied = String((writeText.mock.calls[0] as unknown[])[0]);
    for (const hay of [page, copied, doc.body.innerHTML]) {
      expect(hay).not.toContain(SECRET);
      expect(hay).not.toContain(EMAIL);
      expect(hay).not.toContain('/app/src/x.ts');
    }
  });

  it('a secret inside the message, the action or the code is stripped as well', async () => {
    const { doc, toast, writeText } = boot();
    toast.failure(`Failed for ${EMAIL} via https://ose.test/sponsor?t=${SECRET} token=${SECRET} ${JWT}`, {
      details: {
        code: `Bearer ${SECRET}`,
        requestId: JWT,
        action: `Opening https://ose.test/sponsor?t=${SECRET} as ${EMAIL}`,
      },
    });
    (doc.querySelector('.ocr-toast-copy') as HTMLButtonElement).click();
    await flush();
    const copied = String((writeText.mock.calls[0] as unknown[])[0]);
    for (const hay of [doc.body.innerHTML, copied]) {
      expect(hay).not.toContain(SECRET);
      expect(hay).not.toContain(EMAIL);
      expect(hay).not.toContain('eyJhbGci');
    }
  });

  it('time from the caller is accepted only as a real timestamp', () => {
    const { doc, toast } = boot();
    toast.failure('x', { details: { ...FULL, time: `<script>${SECRET}</script>` } as any });
    const text = doc.querySelector('.ocr-toast-details-text')?.textContent ?? '';
    expect(text).not.toContain(SECRET);
    expect(text).toMatch(/Time: \d{4}-\d{2}-\d{2}T/);
  });
});

describe('sanitising what is shown', () => {
  const GENERIC = 'Something went wrong. Please try again.';
  const shown = (input: unknown) => {
    const { toast } = boot();
    return toast.sanitize(input) as string;
  };

  it('leaves an ordinary sentence alone', () => {
    expect(shown('The event could not be saved.')).toBe('The event could not be saved.');
  });

  it.each([
    ['stack frames', 'Failed\n    at run (/app/src/a.ts:1:2)\n    at next (node:internal/x:3:4)', 'at run'],
    ['SQL', 'D1_ERROR: SELECT * FROM events WHERE id = 1', 'SELECT'],
    ['SQLite codes', 'SQLITE_CONSTRAINT: UNIQUE constraint failed: events.id', 'SQLITE'],
    ['a bearer token', 'Denied: Authorization Bearer abcdef0123456789abcdef', 'abcdef0123456789'],
    ['a JWT', 'Bad token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln', 'eyJ'],
    ['an email address', 'No account for pat@example.com', 'pat@example.com'],
    ['a URL with a query string', 'See https://ose.test/sponsor?t=abc123 now', 't=abc123'],
    ['a relative link with a query', 'Open /sponsor?t=abc123 again', 't=abc123'],
    ['a key=value secret', 'Rejected password=hunter2 for the user', 'hunter2'],
    ['a long opaque id', 'Key 0123456789abcdef0123456789abcdef0123 is bad', '0123456789abcdef0123456789abcdef'],
  ])('strips %s', (_name, input, mustGo) => {
    const out = shown(input);
    expect(out).not.toContain(mustGo);
    expect(out.length).toBeGreaterThan(0);
  });

  it('falls back to a plain sentence when nothing readable is left', () => {
    expect(shown('SELECT * FROM users')).toBe(GENERIC);
    expect(shown('')).toBe(GENERIC);
    expect(shown(null)).toBe(GENERIC);
  });

  it('reads the message of an Error but never its stack', () => {
    const e = new Error('Disk is full');
    e.stack = 'Error: Disk is full\n    at x (/srv/app.js:1:1)';
    const out = shown(e);
    expect(out).toBe('Disk is full');
  });

  it('caps the length', () => {
    const long = shown('word '.repeat(200));
    expect(long.length).toBeLessThanOrEqual(280);
    expect(long.endsWith('...')).toBe(true);
  });

  it('the failure toast shows the sanitised text', () => {
    const { doc, toast } = boot();
    toast.failure('No account for pat@example.com');
    expect(doc.querySelector('.ocr-toast-msg')?.textContent).not.toContain('pat@example.com');
  });
});

describe('one optional action', () => {
  it('renders one button, runs the handler, then dismisses', () => {
    const { doc, toast } = boot();
    const onClick = vi.fn();
    toast.neutral('Map was switched on', { action: { label: 'Turn off', onClick } });
    const buttons = doc.querySelectorAll('.ocr-toast-action');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.textContent).toBe('Turn off');
    (buttons[0] as HTMLButtonElement).click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(all(doc)).toHaveLength(0);
  });

  it('an action without a function or label is ignored', () => {
    const { doc, toast } = boot();
    toast.neutral('x', { action: { label: 'Go' } } as any);
    toast.neutral('y', { action: { onClick: () => undefined } } as any);
    expect(doc.querySelector('.ocr-toast-action')).toBeNull();
  });

  it('a throwing handler still dismisses and does not break the page', () => {
    const { w, doc, toast } = boot();
    w.console.error = vi.fn(); // the runtime reports the handler's error to the console; keep the run quiet
    toast.neutral('x', {
      action: {
        label: 'Go',
        onClick: () => {
          throw new Error('boom');
        },
      },
    });
    expect(() => (doc.querySelector('.ocr-toast-action') as HTMLButtonElement).click()).not.toThrow();
    expect(all(doc)).toHaveLength(0);
  });
});

describe('dismissing', () => {
  it('has a dismiss button with an accessible name', () => {
    const { doc, toast } = boot();
    toast.failure('x');
    const b = doc.querySelector('.ocr-toast-dismiss') as HTMLButtonElement;
    expect(b.getAttribute('aria-label')).toBe('Dismiss');
    b.click();
    expect(all(doc)).toHaveLength(0);
  });

  it('Escape dismisses the focused toast and returns focus to where it was', () => {
    const { w, doc, toast } = boot();
    const primary = doc.getElementById('primary') as HTMLElement;
    primary.focus();
    toast.failure('x', { details: FULL });
    (doc.querySelector('.ocr-toast-more') as HTMLElement).focus();
    (doc.querySelector('.ocr-toast-more') as HTMLElement).dispatchEvent(
      new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(all(doc)).toHaveLength(0);
    expect(doc.activeElement?.id).toBe('primary');
  });

  it('Escape elsewhere does not dismiss a toast that is not focused', () => {
    const { w, doc, toast } = boot();
    toast.failure('x');
    doc.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(all(doc)).toHaveLength(1);
  });

  it('dismissAll clears everything', () => {
    const { doc, toast } = boot();
    toast.failure('a');
    toast.success('b');
    toast.dismissAll();
    expect(all(doc)).toHaveLength(0);
  });
});

describe('stacking', () => {
  it('shows at most three; the oldest goes first', () => {
    const { doc, toast } = boot();
    for (const n of ['one', 'two', 'three', 'four']) toast.neutral(n);
    const msgs = Array.from(doc.querySelectorAll('.ocr-toast-msg')).map((m) => m.textContent ?? '');
    expect(msgs).toHaveLength(3);
    expect(msgs.join('|')).not.toContain('one');
    expect(msgs.join('|')).toContain('four');
  });

  it('keeps a failure over a note when it has to drop one', () => {
    const { doc, toast } = boot();
    toast.failure('fail-a');
    toast.neutral('note-b');
    toast.failure('fail-c');
    toast.success('ok-d');
    const msgs = Array.from(doc.querySelectorAll('.ocr-toast-msg')).map((m) => m.textContent ?? '');
    expect(msgs).toHaveLength(3);
    expect(msgs.join('|')).toContain('fail-a');
    expect(msgs.join('|')).toContain('fail-c');
    expect(msgs.join('|')).not.toContain('note-b');
  });

  it('with three failures showing, the oldest failure makes room', () => {
    const { doc, toast } = boot();
    for (const n of ['first failure', 'second failure', 'third failure', 'fourth failure']) toast.failure(n);
    const msgs = Array.from(doc.querySelectorAll('.ocr-toast-msg')).map((m) => m.textContent ?? '');
    expect(msgs).toHaveLength(3);
    expect(msgs.join('|')).not.toContain('first failure');
    expect(msgs.join('|')).toContain('fourth failure');
  });

  it('the same failure twice shows once', () => {
    const { doc, toast } = boot();
    toast.failure('Could not save', { details: FULL });
    toast.failure('Could not save', { details: FULL });
    expect(all(doc)).toHaveLength(1);
  });

  it('showing the same note again restarts its clock instead of stacking', () => {
    const { doc, toast, clock } = boot();
    toast.neutral('Saved draft');
    clock.advance(8000);
    toast.neutral('Saved draft');
    expect(all(doc)).toHaveLength(1);
    clock.advance(8000);
    expect(all(doc)).toHaveLength(1);
    clock.advance(2000);
    expect(all(doc)).toHaveLength(0);
  });
});

describe('global handlers are opt-in', () => {
  const errorEvent = (w: any, err: unknown) => w.dispatchEvent(new w.ErrorEvent('error', { message: 'x', error: err }));
  const rejection = (w: any, reason: unknown) => {
    const ev = new w.Event('unhandledrejection');
    ev.reason = reason;
    w.dispatchEvent(ev);
  };

  it('nothing is installed until installGlobalHandlers() is called', () => {
    const { w, doc } = boot();
    errorEvent(w, new Error('boom'));
    rejection(w, new Error('boom'));
    expect(all(doc)).toHaveLength(0);
  });

  it('an uncaught error becomes a plain failure toast, never the raw text', () => {
    const { w, doc, toast } = boot();
    toast.installGlobalHandlers();
    errorEvent(w, new Error('SELECT secret FROM users WHERE token=S3CR3T'));
    const el = doc.querySelector('.ocr-toast--failure') as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.textContent).not.toMatch(/SELECT|S3CR3T/);
    expect(doc.querySelector('.ocr-toast-details-text')?.textContent).toContain('CLIENT_ERROR');
  });

  it('a rejected promise becomes a plain failure toast', () => {
    const { w, doc, toast } = boot();
    toast.installGlobalHandlers();
    rejection(w, { message: 'user pat@example.com not found', code: 'NOT_FOUND', requestId: 'req-1' });
    const text = doc.querySelector('.ocr-toast')?.textContent ?? '';
    expect(text).not.toContain('pat@example.com');
    expect(doc.querySelector('.ocr-toast-details-text')?.textContent).toContain('NOT_FOUND');
    expect(doc.querySelector('.ocr-toast-details-text')?.textContent).toContain('req-1');
  });

  it('installing twice does not double the toasts, and uninstall stops them', () => {
    const { w, doc, toast } = boot();
    const off = toast.installGlobalHandlers();
    toast.installGlobalHandlers();
    errorEvent(w, new Error('a'));
    expect(all(doc)).toHaveLength(1);
    off();
    toast.dismissAll();
    errorEvent(w, new Error('b'));
    expect(all(doc)).toHaveLength(0);
  });

  it('a bare cross-origin "Script error." is ignored', () => {
    const { w, doc, toast } = boot();
    toast.installGlobalHandlers();
    w.dispatchEvent(new w.ErrorEvent('error', { message: 'Script error.' }));
    expect(all(doc)).toHaveLength(0);
  });
});

describe('detailsFrom: building the details of a failed request', () => {
  it('reads X-Request-Id from the response and the code from the parsed body', () => {
    const { toast } = boot();
    const response = { headers: { get: (n: string) => (n.toLowerCase() === 'x-request-id' ? 'req-abc123' : null) } };
    expect(toast.detailsFrom(response, { ok: false, code: 'FORBIDDEN', token: 'x' }, 'Saving')).toEqual({
      code: 'FORBIDDEN',
      requestId: 'req-abc123',
      action: 'Saving',
    });
  });

  it('copes with a missing response, a missing header and a non-object body', () => {
    const { toast } = boot();
    expect(toast.detailsFrom(null, 'oops', 'Saving')).toEqual({ action: 'Saving' });
    expect(toast.detailsFrom({ headers: { get: () => null } }, undefined, '')).toEqual({});
  });

  it('refuses a header or code that is not shaped like an id', () => {
    const { toast } = boot();
    const response = { headers: { get: () => 'Bearer abc def' } };
    expect(toast.detailsFrom(response, { code: 'has spaces and <b>' }, 'Saving')).toEqual({ action: 'Saving' });
  });
});

describe('the served script (CSP)', () => {
  it('is plain DOM building: no markup strings, handlers, styles or eval', () => {
    const banned: [string, RegExp][] = [
      ['innerHTML', /innerHTML/],
      ['outerHTML', /outerHTML/],
      ['insertAdjacentHTML', /insertAdjacentHTML/],
      ['document.write', /document\.write/],
      ['eval', /\beval\s*\(/],
      ['new Function', /new\s+Function/],
      ['inline handler attribute', /setAttribute\(\s*['"]on/i],
      ['style attribute', /setAttribute\(\s*['"]style/i],
      ['.style.', /\.style\./],
      ['cssText', /cssText/],
      ['javascript: URL', /javascript:/i],
    ];
    for (const [name, re] of banned) expect(re.test(toastScript), `script must not use ${name}`).toBe(false);
  });

  it('carries no colour literal of its own', () => {
    expect(/#[0-9a-fA-F]{3,8}\b/.test(toastScript.replace(/&#\d+;/g, ''))).toBe(false);
    expect(/\brgba?\(|\bhsla?\(/.test(toastScript)).toBe(false);
  });

  it('serveToastJs sends JavaScript, revalidates by ETag and answers 304', async () => {
    const res = serveToastJs();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    expect(await res.text()).toBe(toastScript);
    const again = serveToastJs(new Request('https://ose.test/ui-toast.js', { headers: { 'if-none-match': etag as string } }));
    expect(again.status).toBe(304);
    expect(await again.text()).toBe('');
  });
});
