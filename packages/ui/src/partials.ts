/**
 * @ocr/ui — Shared HTML partials
 *
 * Small functions that return HTML strings — the same shape both workers
 * already produce, so adoption is drop-in. All user-supplied text is escaped.
 * The headline addition is emptyState()/accessDenied(): every gate now shows
 * a title, a reason, and a next step instead of a bare refusal.
 */
import { esc, escUrl } from './esc';

export interface NavItem {
  href: string;
  label: string;
  /** Inline SVG string, or a single emoji/character. */
  icon: string;
  active?: boolean;
}

/** Sticky top header with title and optional live badge. */
export function header(opts: { title: string; live?: boolean }): string {
  const badge = opts.live === undefined
    ? ''
    : `<span class="live-indicator ${opts.live ? 'on' : 'off'}">${opts.live ? 'Live' : 'Offline'}</span>`;
  return `<header class="header"><h1>${esc(opts.title)}</h1>${badge}</header>`;
}

/** Fixed bottom navigation. */
export function bottomNav(items: NavItem[]): string {
  const links = items.map(
    (i) =>
      `<a class="nav-item${i.active ? ' active' : ''}" href="${escUrl(i.href)}">${i.icon}<span>${esc(i.label)}</span></a>`
  );
  return `<nav class="bottom-nav">${links.join('')}</nav>`;
}

export interface ButtonOpts {
  label: string;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  block?: boolean;
  disabled?: boolean;
  onclick?: string;
}

export function button(o: ButtonOpts): string {
  const cls = `btn btn-${o.variant ?? 'primary'}${o.block ? ' btn-block' : ''}`;
  if (o.href) {
    return `<a class="${cls}" href="${escUrl(o.href)}">${esc(o.label)}</a>`;
  }
  const dis = o.disabled ? ' disabled' : '';
  const click = o.onclick ? ` onclick="${esc(o.onclick)}"` : '';
  return `<button class="${cls}"${dis}${click}>${esc(o.label)}</button>`;
}

export function card(inner: { title?: string; sub?: string; body?: string }): string {
  const title = inner.title ? `<div class="item-name">${esc(inner.title)}</div>` : '';
  const sub = inner.sub ? `<div class="item-sub">${esc(inner.sub)}</div>` : '';
  const body = inner.body ?? '';
  return `<div class="card">${title}${sub}${body}</div>`;
}

export function loading(label = 'Loading…'): string {
  return `<div class="loading"><div class="spinner"></div><div class="item-sub">${esc(label)}</div></div>`;
}

export interface EmptyStateOpts {
  icon?: string;
  title: string;
  message: string;
  action?: { label: string; href: string };
}

/**
 * The missing component. Any "nothing here yet" or "you can't see this"
 * screen renders through this so it always offers a way forward.
 */
export function emptyState(o: EmptyStateOpts): string {
  const icon = o.icon ? `<div class="es-icon">${o.icon}</div>` : '';
  const action = o.action
    ? button({ label: o.action.label, href: o.action.href, variant: 'primary' })
    : '';
  return `<div class="empty-state">${icon}<h3>${esc(o.title)}</h3><p>${esc(o.message)}</p>${action}</div>`;
}

/**
 * Access-denied built on emptyState — replaces the bare "access denied".
 * Defaults give a non-DJ visitor an on-ramp instead of a wall.
 */
export function accessDenied(o?: { what?: string; action?: { label: string; href: string } }): string {
  return emptyState({
    icon: '🎧',
    title: o?.what ? `${o.what} is DJ-only` : 'This area is for DJs',
    message: 'Want in? Connect your account to start building sets and get on the air.',
    action: o?.action ?? { label: 'Get started', href: '/connect' },
  });
}

export interface PageOpts {
  title: string;
  body: string;
  /** Path to the shared stylesheet route, default /ui.css */
  cssHref?: string;
  live?: boolean;
  nav?: NavItem[];
}

/** Full HTML document shell wiring in the shared stylesheet exactly once. */
export function page(o: PageOpts): string {
  const nav = o.nav ? bottomNav(o.nav) : '';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${esc(o.title)}</title>
<link rel="stylesheet" href="${escUrl(o.cssHref ?? '/ui.css')}">
</head>
<body>
${header({ title: o.title, live: o.live })}
<main class="content">${o.body}</main>
${nav}
</body>
</html>`;
}
