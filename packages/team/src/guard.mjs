// Guardrails for one agent run (OCR-249). The owner's thread limits, as code:
// - budget: warn at the budget, stop at twice the budget;
// - three tries: after 3 failed tries at the same thing, stop; no fourth;
// - spend: stop at the spend cap (takes effect once API runs are approved);
// - turns: stop at the turn limit;
// - irreversible actions: denied by the tool manifest's deny list, for every role.
// A run calls checkRun before each step and stops when `stop` is true.

import { commandAllowed } from './tools.mjs';

export const MAX_TRIES = 3;
export const STOP_AT_BUDGET_TIMES = 2;

/**
 * @param {object} s
 * @param {number} [s.budgetMinutes] the rough budget written at the start
 * @param {number} [s.elapsedMinutes]
 * @param {Record<string, number>} [s.failedTries] failed tries per thing (a test, a check, a command)
 * @param {number} [s.spentUsd]
 * @param {number} [s.capUsd]
 * @param {number} [s.turns]
 * @param {number} [s.maxTurns]
 * @returns {{stop: boolean, warn: string[], reasons: string[]}}
 */
export function checkRun(s) {
  const reasons = [];
  const warn = [];
  const budget = s.budgetMinutes;
  const elapsed = s.elapsedMinutes ?? 0;
  if (budget > 0) {
    if (elapsed >= STOP_AT_BUDGET_TIMES * budget) {
      reasons.push(`at ${elapsed} min, twice the ${budget} min budget: stop and report done and left`);
    } else if (elapsed >= budget) {
      warn.push(`past the ${budget} min budget`);
    }
  }
  for (const [what, n] of Object.entries(s.failedTries ?? {})) {
    if (n >= MAX_TRIES) reasons.push(`${n} failed tries at ${what}: stop, report the error and the next idea`);
  }
  if (s.capUsd !== undefined && s.capUsd !== null && (s.spentUsd ?? 0) >= s.capUsd) {
    reasons.push(`spent $${s.spentUsd ?? 0} of a $${s.capUsd} cap`);
  }
  if (s.maxTurns > 0 && (s.turns ?? 0) >= s.maxTurns) reasons.push(`${s.turns} turns, limit ${s.maxTurns}`);
  return { stop: reasons.length > 0, warn, reasons };
}

/** The guard for one command: the manifest's deny list and the role's allow list. */
export function guardCommand(manifest, role, command) {
  return commandAllowed(manifest, role, command);
}
