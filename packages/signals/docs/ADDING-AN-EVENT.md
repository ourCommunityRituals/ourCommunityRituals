# Adding an event

1. **Name it.** Lower case dotted words, at most four parts: `scan.not_counted`,
   `vote.set.finalized`. The name says what happened, not where.
2. **Write its doc line.** One sentence on what it means and when it is
   written. The registry refuses an event without one.
3. **Declare its fields.** Pick the narrowest kind that fits:

| You want to record | Kind | Example |
| --- | --- | --- |
| One of a known set of outcomes | `enum` | `reason: { kind: 'enum', values: ['rate_limited', 'closed'] }` |
| A bounded whole number | `int` | `attempt: { kind: 'int', min: 1, max: 5 }` |
| How long something took | `ms` | `wall_ms: { kind: 'ms' }` |
| A yes or no | `bool` | `cached: { kind: 'bool' }` |
| An HTTP status | `status` | `status: { kind: 'status' }` |
| How many THINGS (rows, queries, retries) | `count` | `d1_rows_read: { kind: 'count' }` |
| How many PEOPLE, or things people did | `people_count` | `scanners: { kind: 'people_count' }` |
| Another route, as a pattern | `op` | `upstream: { kind: 'op' }` |
| A machine code from a library | `code` | `d1_code: { kind: 'code' }` |

4. **Do not declare** `ts`, `level`, `event`, `service`, `env`, `release`,
   `op`, `trace_id`, `span_id`, `client`, `event_type`, `region`, `synthetic`,
   `error_class` or `error`. Signals sets those; the registry refuses them.
5. **Never** add a field for an IP, a user agent, a cookie, an anonymous id, a
   token, an email, a name, a phone, an address, a URL, a query or anything a
   person typed. There is no kind that would accept one.
6. **Log it** with `log.log('scan.not_counted', { reason: 'rate_limited' })`,
   or `log.error(name, err, fields)` for a failure.
7. **Check drops in tests.** `log.stats()` counts every dropped field by
   reason. A test that writes an event should expect zero drops.

## Example registry

```ts
export const OSE_EVENTS = {
  'scan.not_counted': {
    doc: 'A scan was refused before it was counted.',
    fields: { reason: { kind: 'enum', values: ['rate_limited', 'vote_code_changed', 'poster_hour_cap'] } },
  },
  'lifecycle.complete': {
    doc: 'The nightly data lifecycle run finished.',
    fields: {
      registrations_deleted: { kind: 'count' },
      surveys_scrubbed: { kind: 'count' },
      wall_ms: { kind: 'ms' },
    },
  },
} as const satisfies EventRegistry;
```
