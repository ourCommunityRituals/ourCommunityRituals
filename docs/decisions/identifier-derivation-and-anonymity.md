# Identifier derivation and anonymity — OSE peppers vs. OW session tokens

**Date:** 2026-08-29
**Status:** Finding + proposed rule. No code changed.
**Scope:** OSE `ip_hash` / `anon_id_hash`; OW session tokens. Invariants **#1**
(`anonymous_id`), **#7** (`aggregate_only_reporting`), **#8** (`bounded_pii_retention`).

---

## The paper

Ederer, Goldsmith-Pinkham & Jensen, **"Anonymity and Identity Online"**, arXiv:2409.15948
(submitted 2024-09-24). <https://arxiv.org/abs/2409.15948>

Economics Job Market Rumors generated each poster's four-character username from
their IP address. The scheme carried no secret, and IPv4 is only 2³² — so the
authors enumerated the whole address space, hashed each candidate, and matched.
They recovered **~47,630 distinct IP addresses covering 66.1% of roughly 7 million
posts across 12 years**, then geolocated them by institution.

The finding that matters for us is not "hashing is bad." It is:

> **An identifier derived from a low-entropy input is only as private as the
> secret in the derivation. With no secret, the input space *is* the search
> space — and the break is retroactive across all history at once.**

The attack needed no privileged access. Public data plus the derivation scheme.

---

## Where OSE sits

Two derived identifiers, both `SHA-256(value + "|" + pepper)` truncated to 32 hex
chars, both returning `null` (store NULL, never the raw value) when no pepper is
configured:

| | Input | Input entropy | Source |
| --- | --- | --- | --- |
| `hashIpForSubscribe` | client IP | **2³²** | `src/handlers/pages.ts` (OSE-207) |
| `hashAnonIdForReturns` | `anonymous_id` | **~2¹²²** | `src/lib/anon-id-hash.ts` (OSE-272) |

Three things this design already gets right, and they are the difference between
this and EJMR:

1. **There is a secret in the derivation.** Without the pepper, enumeration fails.
   EJMR had no equivalent.
2. **Separate peppers with separate rotation cadence** (`IP_HASH_PEPPER` vs
   `ANON_ID_HASH_PEPPER`), ratified 2026-05-15, explicitly so the two anonymity
   scopes have *"independent compromise blast radii."* That reasoning was written
   down before there was a paper to justify it.
3. **`anonymous_id` is `crypto.randomUUID()`** — ~122 bits. Its hash is not
   enumerable *even if the pepper leaks*, because the input space is not
   searchable. **The anon-id side is not exposed to this attack at all.**

### The residual, precisely

`ip_hash` is the one that inherits the paper's shape. IPv4 is 2³². The entirety of
that identifier's anonymity rests on one secret and nothing else. If
`IP_HASH_PEPPER` leaks:

- enumerate 4.3 billion addresses, hash each with the pepper, match — hours of
  commodity compute;
- and it is **retroactive**: every `ip_hash` ever written becomes reversible at
  once, exactly as EJMR's twelve years fell together.

Truncation to 128 bits is irrelevant here. The code's own comment is correct that
truncation is about collision resistance, not reversibility — but that means it
provides no defence on this axis. The pepper does 100% of the work.

**This is not a defect.** Deriving `ip_hash` is justified: the system needs "did
this same IP submit twice" without storing IPs, and that requires the same input
to produce the same output without a stored mapping. The point is that the
justified design comes with a concentrated, retroactive failure mode, and the
control that bounds it — rotation — is the one that is not happening.

### Rotation is specified, not running

`anon-id-hash.ts` documents why rotation will not occur on its own:

> *"Pepper rotation invalidates all historical hashes … SharedReport return-rate
> signal 'resets' at pepper rotation."*

Rotation has a product cost. A control with a product cost and no schedule is a
control that gets designed, documented, and never exercised. Searching this
checkout: **no rotation mechanism in code, and no pepper reference in any
workflow.** The cadence exists as a ratified decision, not as a thing that
happens.

This is the same shape as every other finding in this session's audit — a
specified control that does not execute. It is listed here so it is not
rediscovered a fourth time.

---

## Where OW sits — and it is on the right side of this

OW's session tokens are **not derived from anything**:

```
src/handlers/auth-register.ts:43   const sessionToken = crypto.randomUUID();
src/handlers/auth-callback.ts:87   const sessionToken = crypto.randomUUID();
```

Stored in KV, delivered via `buildSessionCookie(...)` as an **HttpOnly cookie**,
and `auth-session.ts` states the token is *"read exclusively from the HttpOnly
cookie."*

That is a textbook opaque bearer session, and it is **structurally immune to the
paper's attack**:

| | OSE `ip_hash` | OW session token |
| --- | --- | --- |
| Derivation | `SHA-256(IP ‖ pepper)` | none — pure CSPRNG |
| Input search space | 2³² | n/a, nothing to search |
| What protects it | one secret | no such secret exists |
| If that secret leaks | **all history reversible at once** | no equivalent failure |
| Revocation | pepper rotation; resets return-rate signal | delete the KV entry |
| Linkage lives in | the derivation itself | a server-side table |

There is nothing to reverse, because nothing about the user went into the token.
Revocation is real and cheap rather than a rotation that costs a product signal.

**Two things in OW that look adjacent but are not findings:**

- `src/lastfm/client.ts` uses **MD5** — that is Last.fm's documented API signature
  scheme (`sigString += sharedSecret`, then MD5), externally imposed by their
  protocol, and it is a secret-suffix construction so it is not length-extendable.
  Not a design choice, not this class of problem.
- `?token=` in `src/handlers/lastfm.ts` is **Last.fm's OAuth callback** handing
  their token back, not OW authenticating its own users by URL. OW's own session
  never travels in a URL.

---

## The rule this suggests

> **Derive an identifier from user data only when you need the same input to
> produce the same output *without storing a mapping*. Otherwise generate random
> and keep a lookup table.**
>
> Derivation buys statelessness and pays for it with a secret whose compromise is
> retroactive and total. Random-plus-table buys real revocation and pays for it
> with a table you must protect.

By that rule both current designs are correct: `ip_hash` genuinely needs
derivation; OW's session genuinely does not. The rule matters for what comes next.

### Applying it to OW-123

**OW-123 (HL-P3.4) — "Private rung: unlisted/tokenized profile visibility"** is
the next place a token gets designed, and it is a capability-URL pattern. Two
notes, neither about the paper:

1. Keep it **random, not derived**. An unlisted-profile token derived from the
   profile id or handle would be enumerable in exactly the way EJMR's usernames
   were. Random keeps it immune.
2. A capability URL is a *different* risk class from this paper's: possession is
   access, and URLs leak through referrers, browser history, shared screenshots,
   and server logs. OW today keeps tokens out of URLs entirely; OW-123 would be
   the first exception, and it deserves that decision made deliberately —
   expiry, scope, and revocation named up front.

---

## Proposed, in order of value per effort

1. **Make unrotated pepper age visible.** Not a rotation schedule — a fact that
   "we have never rotated" cannot stay invisible. Cheapest possible version of
   the control that is currently absent.
2. **Assert neither pepper is ever logged or echoed.** Given this session already
   found an org-write credential exposed to dependency install scripts in CI, this
   is not a theoretical concern.
3. **Record the rule above** so OW-123 and future identifier work inherit it
   rather than re-deriving it.

## Limits of this write-up

Everything asserted about OSE and OW was read directly from the checkouts on
2026-08-29 (`oursharedevents@1fe3bab`, `ourwkrp@413b6f9`). The paper's findings are
from its abstract as fetched, not a full read of the methodology. No claim is made
that any pepper has leaked, or that any de-anonymization is presently possible —
the argument is about concentration of risk and an unexercised control.
