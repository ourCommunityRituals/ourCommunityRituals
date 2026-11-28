// Event triggers (OCR-252): which roles wake for which event.
//
// Prepared and switched off. The workflow that calls this
// (.github/workflows/team-events.yml) runs only when the repository variable
// TEAM_EVENTS_ON is 'true', and has no step that calls a model yet. Turning it
// on waits for the owner's Claude Console federation setup and spend approval.
//
// Events: a PR opened or marked ready, CI finished red, a staging deploy
// finished, a Linear story moved (arrives later as repository_dispatch).

export const EVENTS = {
  pr_opened: { roles: ['product-owner', 'tester'], why: 'check the change against the vision and its test plan' },
  ci_red: { roles: ['sre'], why: 'name the root job, set aside cascades' },
  staging_deployed: { roles: ['integrator', 'front-end'], why: 'walk the surfaces on staging' },
  linear_moved: { roles: ['product-owner'], why: 'keep Linear matched to main' },
};

// Extra roles by the paths a PR touches. First match per rule; all rules apply.
export const PATH_ROLES = [
  { re: /(migrations|\/handlers\/|router\.ts$)/, role: 'back-end' },
  { re: /(forms|pii|count-floor|report|data-edges|privacy)/i, role: 'data-scientist' },
  { re: /(\.css$|\/tokens\/|design-system|\/templates\/|\.html$)/, role: 'designer' },
  { re: /(ocr-docs-brain|\/adr\/|cross-repo|OCR_VISION)/, role: 'architect' },
  { re: /^\.github\/workflows\//, role: 'sre' },
];

/**
 * Map a GitHub event to the team event it is, or null.
 * @param {string} name   github.event_name
 * @param {object} payload github.event
 */
export function classify(name, payload = {}) {
  if (name === 'pull_request') {
    if (payload.pull_request?.draft) return null;
    return ['opened', 'ready_for_review', 'reopened'].includes(payload.action) ? 'pr_opened' : null;
  }
  if (name === 'workflow_run') {
    const run = payload.workflow_run ?? {};
    if (payload.action !== 'completed') return null;
    if (run.conclusion === 'failure' && run.head_branch === 'main') return 'ci_red';
    if (run.conclusion === 'success' && /staging/i.test(run.name ?? '')) return 'staging_deployed';
    return null;
  }
  if (name === 'repository_dispatch' && payload.action === 'linear-story-moved') return 'linear_moved';
  if (name === 'workflow_dispatch') {
    const e = payload.inputs?.event;
    return typeof e === 'string' && Object.hasOwn(EVENTS, e) ? e : null;
  }
  return null;
}

/** The roles to wake, deduplicated, base roles first. */
export function route(event, paths = []) {
  const base = EVENTS[event];
  if (!base) return [];
  const roles = [...base.roles];
  if (event === 'pr_opened') {
    for (const { re, role } of PATH_ROLES) {
      if (paths.some((p) => re.test(p)) && !roles.includes(role)) roles.push(role);
    }
  }
  return roles;
}
