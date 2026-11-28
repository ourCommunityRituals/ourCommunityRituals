# Correlation (level 5)

Two read-side tools. They add no data: they read what levels 1 to 4 wrote.

## One request, end to end: `correlate(lines)`

Give it log lines and span lines (from any OCR Worker). It returns a map of
`trace_id` to a trace view:

- `roots`: the span tree. Each span holds its children and the log lines that
  were written with its `span_id`, oldest first. A span from another Worker
  hangs under the span that called it, because `inject()` carried the parent.
- `loose_logs`: log lines of the trace whose span is not in the set.
- `services`, `span_count`, `log_count`, `ms` (the longest root span) and
  `outcome` (the worst one: error, then timeout, then cancelled, then ok; an
  error-level log line counts as an error).

Lines with no `trace_id`, or one that is not 32 hex characters, are skipped.

## Any number, any cut: `rollup(rows, by, opts)`

`rows` are metric totals as Analytics Engine returns them (already weighted by
`_sample_interval`), each with its labels and, for the tier join, the start of
its time bucket in `at`. `by` is any list of view dimensions: `service`,
`client`, `event_type`, `region`, `op`, and `tier`.

- **Tier is joined here, never written.** `tierAt(plans, client, at)` reads
  the plan in force when the row was counted, so a brand that moved from
  Local to Anchor in June shows under Local before and Anchor after. A client
  with no plan on record shows as `unknown`, never a guess. Names shown are
  Local, Anchor and Enterprise (codes `free`, `mid`, `enterprise`).
- **People are floored after summing.** With `people: true`, rows marked
  `synthetic: 'true'` are dropped first, then each group's total goes through
  `floorPeople()`: under 5 is withheld (`value: null, suppressed: true`), the
  rest rounds down to a multiple of 5.
- A missing label groups as `none`.

One limit to know: each group is floored on its own. Showing a total next to
its parts can let someone subtract their way to a withheld number. Views that
show both should floor the total from the floored parts, as OSE's
`floorTotalOfParts` does.

## The console

The console Worker that shows these (by service, client, tier, event type and
region, with a trace view) is the next step, and its own pull request.
