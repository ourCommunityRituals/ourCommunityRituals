# OCR network plate

A single-file dashboard for the OurCommunityRituals hub and its spokes
(OSE, OW, OSG, OSR, OST). It answers four questions from four sources and
files every disagreement between them under a reconciliation layer.

| Question | Source | Band on the plate |
| --- | --- | --- |
| What is planned | Linear | Planned |
| What is deployed | Cloudflare D1 | Deployed |
| What is scheduled | Google Calendar, OCR blocks only | Scheduled |
| What is tested | hub CI workflows + the OSE-1070 risk map | Tested (pyramid: stages left to right, layers bottom to top) |

Anything no source returns is drawn hatched under **No source anywhere**.

## Files

- `network-plate.html` renders the plate. It holds no data.
- `snapshots.js` holds one entry per pull. The plate draws the latest pull
  in the selected time frame and trends every pull in that frame.

Open `network-plate.html` directly in a browser. No build, no server.

## Refreshing

A refresh is a new pull: append one object to `window.PLATE_SNAPSHOTS` in
`snapshots.js` with a new `pulled` date. Never edit an old snapshot; history
is the point. The shape of a snapshot is documented at the top of that file.

When GitHub runs are wired, fill each pyramid cell's `result` with `pass` or
`fail` and point `link` at the run. Until then results read as unread and
the pyramid shows shape only.

## Controls

- **Time frame** scopes the trends, the history table, and the pull picker.
  It counts back from the latest pull, not from today, so the file is stable.
- **Pull drawn on the plate** picks which snapshot the bands show.
- **Filter by text** narrows hex cells, calendar blocks, pyramid cells, and
  reconciliation items at once, and reports the match count.

## Scope rule

The plate is OCR-centric so it can ship as part of the product. Personal
calendar items and anything outside the hub and spokes do not belong in a
snapshot.
