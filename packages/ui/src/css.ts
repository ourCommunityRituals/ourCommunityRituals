import { rootBlock } from './tokens';
import { componentStyles } from './styles';

/**
 * The entire shared stylesheet: canonical tokens + component vocabulary.
 * This one string replaces the ~4,300 lines of inline <style> that were
 * copy-pasted across nine WKRP templates and OSE's pages.ts.
 */
export const ocrStylesheet = `${rootBlock()}\n\n${componentStyles}\n`;

/**
 * Serve the stylesheet from a stable route (e.g. GET /ui.css) in any
 * Cloudflare Worker. Templates then use <link rel="stylesheet" href="/ui.css">
 * instead of an inline <style> block. Long cache: the content is versioned
 * by the package, so bump the package to bust it.
 */
export function serveCss(): Response {
  return new Response(ocrStylesheet, {
    headers: {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}

/** Inline form, for contexts that build a full document as one string. */
export function styleTag(): string {
  return `<style>${ocrStylesheet}</style>`;
}
