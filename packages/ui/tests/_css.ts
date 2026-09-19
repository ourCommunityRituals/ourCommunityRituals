/**
 * A brace-aware CSS rule reader for the test suite.
 *
 * A flat /([^{}]+)\{([^{}]*)\}/g regex looks like it works and silently stops being
 * correct at the first nested block: componentStyles contains @media and @keyframes,
 * and everything after the first one gets mis-paired. The first version of the tap-target
 * test "failed" on .btn, .list-item and .filter-chip — all of which declare the right
 * min-height. The parser was wrong, not the stylesheet. Shared so there is one reader.
 */
export interface Rule {
  selector: string;
  body: string;
}

export function parseRules(source: string): Rule[] {
  // Strip comments first. Without this a `/* Buttons ... */` above a rule is read as part
  // of that rule's selector, so `.btn` never matches and the test reports the CSS missing
  // when the parser is the thing at fault.
  const css = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out: Rule[] = [];
  let i = 0;

  const skipWs = () => {
    while (i < css.length && /\s/.test(css[i] as string)) i++;
  };

  const block = (): void => {
    while (i < css.length) {
      skipWs();
      if (i >= css.length || css[i] === '}') { i++; return; }

      // read the prelude up to '{' or ';'
      const start = i;
      while (i < css.length && css[i] !== '{' && css[i] !== '}' && css[i] !== ';') i++;
      const prelude = css.slice(start, i).trim().replace(/\s+/g, ' ');

      if (css[i] === ';') { i++; continue; }        // a bare at-statement, e.g. @import
      if (css[i] !== '{') { i++; continue; }
      i++;                                           // past '{'

      if (prelude.startsWith('@')) { block(); continue; }  // at-rule: recurse into it

      // a plain rule: its body runs to the matching '}' (declarations never nest)
      const bodyStart = i;
      let depth = 1;
      while (i < css.length && depth > 0) {
        if (css[i] === '{') depth++;
        else if (css[i] === '}') depth--;
        i++;
      }
      out.push({ selector: prelude, body: css.slice(bodyStart, i - 1) });
    }
  };

  block();
  return out;
}

/** Every rule whose selector list contains `sel` as a whole selector. */
export function rulesFor(css: string, sel: string): Rule[] {
  return parseRules(css).filter((r) =>
    r.selector.split(',').some((s) => s.trim() === sel),
  );
}
