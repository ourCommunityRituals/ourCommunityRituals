# Signals rules

Each rule names what enforces it. A rule with no test is a wish, so every rule
here has one.

## 1. Allowlisted fields only

Each event declares its fields and their kinds (`src/schema.ts`). A field the
event did not declare is dropped and counted as `undeclared`. A value that does
not fit its kind is dropped and counted under its reason.

Enforced by: `checkField()`, `tests/logger.test.ts` ("schema enforcement").

## 2. Never who

There is no free-text field kind. The kinds are `enum`, `int`, `ms`, `bool`,
`status`, `count`, `people_count`, `op` and `code`. A `code` is refused when it
looks like an id, a long number, an email, an IP or a token.

Context values are checked too:

| Slot | Accepted | Refused |
| --- | --- | --- |
| `op` | A route pattern, `GET /api/v2/events/:x` | Any raw path segment |
| `trace_id`, `span_id` | 32 and 16 lower hex | Anything else |
| `client` | A brand slug, `fernbrook-parks` | UUIDs, hex runs of 12 or more, 7 or more digits, emails |
| `event_type` | A catalog id, `etr-rec-bocce` | The same shapes as client; any id not in `eventTypes` when given |
| `region` | An OER corridor or metro id | The same shapes as client; any id not in `regions` when given |

Plan tier is never written. It is joined at view time from the brand's plan
history, which keeps OSE's scan path tier-blind (tier-equity covenant).

Enforced by: `tests/never-who.invariant.test.ts`, which feeds person-shaped
values (email, IPv4, IPv6, UUID, JWT, bearer value, cookie, phone, URL, name,
user agent) into every kind, every context slot and the error path, and fails
if any one reaches a written line.

## 3. People counts are floored

A `people_count` follows OSE's uniform floor (`lib/count-floor.ts`, OSE-665,
OSE-2151): under 5 is written as `null` with `<field>_suppressed: true`; from 5
up it is rounded down to a multiple of 5.

Enforced by: `tests/logger.test.ts` ("people counts follow the floor of 5").

## 4. Errors are scrubbed and short

`error()` writes `error_class` and `error`. A D1 error keeps its label only
(`D1_ERROR SQLITE_CONSTRAINT`), because the D1 client quotes row values in its
messages. Any other message is credential-masked, person-scrubbed and cut to
300 characters.

Enforced by: `tests/logger.test.ts` ("error()"), the invariant's error case.

## 5. Two redaction layers for anything else

`installConsoleRedaction()` wraps `console` so a line written by hand, while a
Worker moves onto `createLogger()`, still has credentials masked
(`redact/credentials.ts`, from OSE) and personal keys and shapes masked
(`redact/personal.ts`, OW's key list plus scrubbing).

Enforced by: `tests/redact.test.ts`.

## 6. Telemetry never breaks a request

No logger method throws, even when the sink throws.

Enforced by: `tests/logger.test.ts` ("never throws when the sink throws").

## 7. Only the sink touches console

Inside this package only the default sink (`logger.ts`) and the console wrapper
(`redact/credentials.ts`) refer to `console`.

Enforced by: `tests/never-who.invariant.test.ts` ("source rules").

## Limits, stated plainly

- A person's name written into an error sentence ("failed for Dana") is not
  recognised by scrubbing. That is why events carry no free text and error text
  is cut short. Do not pass person data into an Error message.
- Cardinality budgets per metric label arrive with level 2 (cardinality). In
  level 1 the closed kinds and the slug rules are the limit.
