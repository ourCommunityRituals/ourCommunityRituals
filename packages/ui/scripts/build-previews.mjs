#!/usr/bin/env node
/**
 * build-previews — generate the design system's component previews from partials.ts.
 *
 * The previews used to be React: each one mounted `window.OurSharedEvents.<Comp>` from a
 * 60KB prebuilt bundle, with react and react-dom pulled from a CDN. That was wrong twice
 * over — the FE is native JS, and the bundle was an external artifact with no build script
 * here, so what the previews showed was never verifiably what the product renders.
 *
 * Now each preview is static HTML emitted by `partials.ts` — the same renderer the product
 * uses. No framework, no bundle, no CDN, and no way for a preview to drift from the real
 * output, because it IS the real output.
 *
 * Write:  node scripts/build-previews.mjs
 * Check:  node scripts/build-previews.mjs --check   (diffs, exits 1 on drift, writes nothing)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from '../src/partials.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DS = resolve(here, '../design-system/components');

/** Each preview: the dsCard marker, and the markup partials.ts produces. */
const PREVIEWS = {
  Button: {
    group: 'Actions', height: 240,
    subtitle: 'Primary, secondary and danger — 18px label, 56px primary',
    html: [
      P.button({ label: 'Make the poster', variant: 'primary' }),
      P.button({ label: 'Save for later', variant: 'secondary' }),
      P.button({ label: 'Take it down', variant: 'danger' }),
      P.button({ label: 'Send the invite', variant: 'primary', block: true }),
    ].join('\n'),
  },
  Card: {
    group: 'Surfaces', height: 200,
    subtitle: 'Surface container — 8px radius, 1px border, no shadow',
    html: [
      P.card({ title: 'Maple Street Fair', sub: 'Sat 14 Sep · 6pm · Maple & 3rd' }),
      P.card({ title: 'Corridor reach', sub: 'Corridor-level, never person-level' }),
    ].join('\n'),
  },
  Header: {
    group: 'Navigation', height: 200,
    subtitle: "Sticky header with the screen's one h1 and a live indicator",
    html: [
      P.header({ title: 'Maple Street Fair', live: true }),
      P.header({ title: 'Harbour Night Market', live: false }),
      P.header({ title: 'Your events' }),
    ].join('\n'),
  },
  BottomNav: {
    group: 'Navigation', height: 160,
    subtitle: 'Fixed thumb-zone nav — every glyph carries its word',
    html: P.bottomNav([
      { href: '/events', label: 'Events', icon: '📅', active: true },
      { href: '/map', label: 'Map', icon: '🗺️' },
      { href: '/posters', label: 'Posters', icon: '🖼️' },
      { href: '/reports', label: 'Reports', icon: '📊' },
    ]).replace('position:fixed', 'position:static'),
  },
  FormInput: {
    group: 'Forms', height: 300,
    subtitle: 'Label, hint, error — 16px, and the error is never the smallest text',
    html: [
      P.formInput({ id: 'name', label: 'What is the event called?', placeholder: 'Maple Street Fair',
        required: true, hint: 'This is the name people will see on the poster.' }),
      P.formInput({ id: 'email', label: 'Your email', type: 'email', value: 'hello@maplefair',
        error: 'That email is missing its ending — try hello@maplefair.org' }),
    ].join('\n'),
  },
  Textarea: {
    group: 'Forms', height: 260,
    subtitle: 'Multi-line, same label/hint/error contract as FormInput',
    html: P.textarea({ id: 'desc', label: 'What should people know?', rows: 4,
      placeholder: 'Doors at 6, music at 7. Bring a chair.',
      hint: 'This shows on the poster under the event name.' }),
  },
  FormSelect: {
    group: 'Forms', height: 240,
    subtitle: 'Native select, ordered by likelihood and pre-filled',
    html: P.formSelect({ id: 'kind', label: 'What kind of event is it?',
      hint: 'Pick the closest — it sets the poster category colour.',
      options: [
        { value: 'fair', label: 'Street fair', selected: true },
        { value: 'market', label: 'Night market' },
        { value: 'music', label: 'Live music' },
        { value: 'food', label: 'Food drive' },
      ] }),
  },
  Checkbox: {
    group: 'Forms', height: 220,
    subtitle: 'Whole row is the target, 48px tall',
    html: [
      P.checkbox({ id: 'notify', label: 'Email me when someone scans a poster.', checked: true }),
      P.checkbox({ id: 'listed', label: 'List this event on the neighbourhood map.' }),
    ].join('\n'),
  },
  RadioGroup: {
    group: 'Forms', height: 260,
    subtitle: 'Two to four options, all visible, likely answer pre-selected',
    html: P.radioGroup({ name: 'when', legend: 'When is it?', options: [
      { value: 'sat', label: 'This Saturday, 14 September', checked: true },
      { value: 'next', label: 'Next Saturday, 21 September' },
      { value: 'pick', label: 'Pick another date' },
    ] }),
  },
  FormGroup: {
    group: 'Forms', height: 260,
    subtitle: 'Related controls bound into one set',
    html: P.formGroup({ legend: 'Tell people how to reach you', required: true,
      body: [
        P.checkbox({ id: 'g1', label: 'Show my email on the event page.', checked: true }),
        P.checkbox({ id: 'g2', label: 'Show a phone number.' }),
      ].join('\n') }),
  },
  Loading: {
    group: 'Feedback', height: 180,
    subtitle: 'Spinner plus words — never a bare spinner',
    html: P.loading('Making your poster…'),
  },
  EmptyState: {
    group: 'Feedback', height: 300,
    subtitle: 'Title, reason, next step — no screen dead-ends',
    html: P.emptyState({ icon: '📅', title: 'No events yet',
      message: 'When you make your first event, it will show up here with its poster and short links.',
      action: { label: 'Make your first event', href: '/admin/new' } }),
  },
  AccessDenied: {
    group: 'Feedback', height: 280,
    subtitle: 'Gates read as directions, never as errors',
    html: P.accessDenied({ what: 'The organizer dashboard' }),
  },
};

let drift = 0;
for (const [name, spec] of Object.entries(PREVIEWS)) {
  const marker = `<!-- @dsCard group="${spec.group}" height=${spec.height} subtitle="${spec.subtitle}" -->`;
  const out =
    `${marker}\n` +
    `<!-- GENERATED from src/partials.ts by scripts/build-previews.mjs — do not edit.\n` +
    `     This is the product's own renderer output, not a re-creation of it. -->\n` +
    `<div style="padding:24px;display:flex;flex-direction:column;gap:16px">\n${spec.html}\n</div>\n`;
  const path = resolve(DS, name, 'preview.html');
  if (process.argv.includes('--check')) {
    const onDisk = existsSync(path) ? readFileSync(path, 'utf8') : '';
    if (onDisk !== out) { console.error(`  drift: ${name}/preview.html`); drift++; }
  } else {
    writeFileSync(path, out);
    console.log(`  wrote ${name}/preview.html`);
  }
}

if (process.argv.includes('--check')) {
  if (drift) {
    console.error(`\n${drift} preview(s) differ from partials.ts output.`);
    console.error('Regenerate: pnpm --filter @ocr/ui build-previews');
    process.exit(1);
  }
  console.log('check OK — every preview matches partials.ts output.');
}
