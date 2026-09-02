/* Network plate snapshots.
   One entry per pull. Append a new entry for each re-render; never edit an old one.
   The plate draws the latest snapshot in the selected time frame and trends every
   snapshot in that frame. Dates are ISO (YYYY-MM-DD).

   Shape of a snapshot:
   pulled   ISO date of the pull
   window   {from,to} the calendar window that was read
   gauges   {prodMig, stgMig, codeFloor, prodRows, hours, blocks}
   planned / deployed / dark   cells (id, n name, k kind, s state live|queued|closed|none, sub, meta, body, items[])
   week     calendar rows (d when, w what (html), h hours label, c clash, g ghost/no-event)
   recon    reconciliation layers (id, name, pair, state open|clean|blind, items[{sev,t,body,fix,refs[]}])
*/
window.PLATE_SNAPSHOTS=[
{
 pulled:"2026-09-01",
 window:{from:"2026-09-01",to:"2026-09-14"},
 gauges:{prodMig:41,stgMig:68,codeFloor:67,prodRows:1,hours:12,blocks:4},
 planned:[
  {id:"ose",n:"OurSharedEvents",k:"OSE",s:"live",sub:"14 projects",meta:"Linear team OSE",
   body:"Core platform. Largest share of open work in the workspace.",
   items:[{t:"First Scan — Contact With Reality",st:"In Progress · target 30 Sep 2026"},
    {t:"Infrastructure Dashboard",st:"In Progress · target 1 Jun 2026 · 3 months past",od:true},
    {t:"Security Hardening",st:"Backlog"},{t:"SDET & SRE Test Coverage",st:"Backlog"},
    {t:"SharedReport Intelligence Surface",st:"Backlog"},
    {t:"Marketability & Discoverability",st:"Backlog"},
    {t:"Artifact-Integrity Checks",st:"Backlog"},
    {t:"OCR-RedTeamAgent",st:"Backlog"},{t:"OCR-Enforcement",st:"Backlog"},
    {t:"OCR-H3 substrate adoption",st:"Backlog"},
    {t:"Cost Sustainability & Free-Forever Guardrails",st:"Completed"},
    {t:"QR & Form Attribution Chain",st:"Completed"},
    {t:"Digital Click Geo Privacy",st:"Canceled"},
    {t:"NCR Geo Intelligence",st:"Canceled"}]},
  {id:"ow",n:"OurWKRP",k:"OW",s:"live",sub:"5 projects",meta:"Linear team OW",
   body:"Named-contributor layer behind the legal wall. One running, four queued.",
   items:[{t:"Staging Deploy Pipeline",st:"In Progress · target 1 Jun 2026 · 3 months past",od:true},
    {t:"Verified Accounts + Commercial Layer",st:"Backlog"},
    {t:"Genre Exploration Layer",st:"Backlog"},
    {t:"DJ Profiles + Set Archives",st:"Backlog"},
    {t:"Fist of Five",st:"Backlog"}]},
  {id:"brain",n:"OCR brain",k:"OCR-doc",s:"queued",sub:"7 projects",meta:"Linear team OCR-doc",
   body:"Governance and invariants. All seven sit under the Self-Checking Infrastructure initiative. Nothing started.",
   items:[{t:"Brain invariant hygiene",st:"Backlog"},{t:"Brain Ops & Maintenance",st:"Backlog"},
    {t:"ADR-002 identity choice infrastructure",st:"Backlog"},
    {t:"L5 — Continuous-improvement cadence",st:"Backlog"},
    {t:"L5 — Framework-readiness telemetry",st:"Backlog"},
    {t:"L5 — Per-product onboarding",st:"Backlog"},
    {t:"L5 — Auto-emit drift tickets",st:"Backlog"}]},
  {id:"flywheel",n:"Flywheel",k:"cross-team",s:"queued",sub:"OSE + OW",meta:"Linear project",
   body:"Consolidation + Flywheel Launch. The only project spanning two teams, and it is in Backlog.",items:[]},
  {id:"selfcheck",n:"Self-checking",k:"initiative",s:"queued",sub:"9 projects",meta:"Linear initiative",
   body:"Invariants as the Core Framework. The workspace's only initiative. Gathers the brain projects plus RedTeamAgent, Enforcement, and H3.",items:[]}
 ],
 deployed:[
  {id:"prod",n:"ocr-db",k:"production",s:"live",sub:"migration 41",meta:"Cloudflare D1 · 442 KB · 23 tables",
   body:"Live production database for OurSharedEvents. Applied through 0041_add_sponsor_logo_metadata. The code floor is 67, so this is twenty-six behind. Holds one event and nothing else, which is the only reason the gap has not bitten.",
   items:[{t:"events",st:"1 row"},{t:"sponsors",st:"0 rows"},{t:"scans",st:"0 rows"},
    {t:"subscribers",st:"0 rows"},{t:"corridors",st:"0 rows"}]},
  {id:"stg",n:"ocr-db",k:"staging",s:"live",sub:"migration 68",meta:"Cloudflare D1 · 1.8 MB",
   body:"Staging behind stg.oursharedevents.com. Applied through 0068_sponsor_lifecycle_and_acceptance, one past the code floor. Every demoed surface runs against this, which is why the API reads correct and production would not.",items:[]},
  {id:"forms",n:"ocr-forms-db",k:"prod + staging",s:"queued",sub:"2 databases",meta:"Cloudflare D1",
   body:"Forms store. Production created 3 Aug 2026 at 139 KB, staging at 500 KB. Separate lifecycle from the main database.",items:[]},
  {id:"wkrp",n:"ourwkrp",k:"prod + staging",s:"queued",sub:"2 databases",meta:"Cloudflare D1",
   body:"Named-data side of the legal wall. Production at 12 KB is effectively empty. Staging at 274 KB. This pair must never share an agent identity with the OSE pair.",items:[]}
 ],
 dark:[
  {id:"github",n:"GitHub",k:"not wired",s:"none",sub:"no connector",meta:"would answer: what is in flight",
   body:"Open PRs, CI red or green, branch age, stale worktrees. The biggest missing source, and the one that makes agent-authored work legible, since it reports through pull requests.",items:[]},
  {id:"pay",n:"Stripe / PayPal",k:"not wired",s:"none",sub:"zero revenue",meta:"would answer: what is earned",
   body:"Nothing to show yet. Worth wiring now so the first Local $50 event appears here without being told.",items:[]},
  {id:"osg",n:"OSG Thursdays",k:"Eagles Hall",s:"none",sub:"weekly",meta:"nothing in Linear",
   body:"Ships an event every seven days and produces no ticket. The calendar knows about the build block afterward but not the event itself.",items:[]},
  {id:"osr",n:"OSR",k:"RIPH",s:"none",sub:"blocked",meta:"nothing in Linear",
   body:"Proposal delivered to Jen and complete. Next record night blocked on crew availability, not production.",items:[]},
  {id:"ost",n:"OurSharedTables",k:"concept",s:"none",sub:"pre-Tom",meta:"nothing in Linear",
   body:"Mosque Foundation food pantry is the first door. Nothing publishes before Tom clears venue and time.",items:[]},
  {id:"six",n:"Founding Six",k:"corridor",s:"none",sub:"OCR-121",meta:"named, not tracked",
   body:"Blue Island, Beverly, Brainerd, Evergreen Park, Oak Lawn, Mt. Greenwood. Locked as a set, unrepresented as work.",items:[]}
 ],
 week:[
  {d:"Tue 1 Sep · 8–11pm",w:"<b>Deep work — OCR front end</b> Through the Sawyer handoff.",h:"3h"},
  {d:"Thu 3 Sep · 10pm",w:"<b>Build Block — OCR software</b> and <b>Deep work — OCR front end (post-OSG)</b> both start here.",h:"clash",c:true},
  {d:"Tue 8 Sep · 8–11pm",w:"<b>Deep work — OCR front end</b>",h:"3h"},
  {d:"Thu 10 Sep · 10pm",w:"<b>OCR blocks clash again</b> Same double-booking as 3 Sep.",h:"clash",c:true},
  {d:"Thu (weekly)",w:"OSG at Eagles Hall. Not on the calendar; inferred from the post-OSG block that follows it.",h:"no event",g:true},
  {d:"End Sep",w:"Sawyer handoff. Named in two block descriptions; has no event of its own and no ticket.",h:"no event",g:true}
 ],
tests:{
  asOf:"hub ci.yml at this pull · OSE counts from the OSE-1070 risk map, 29 Aug 2026",
  stages:["Local","PR gate","Main / nightly","Staging (live edge)","Production"],
  layers:["Static & security","Unit","Contract","Integration","Component / viewport","E2E"],
  cells:[
   {layer:"Static & security",stage:"Local",type:"lint · typecheck",count:"2 checks",result:"local",
    target:"hub workspace",flows:["pnpm lint (eslint .)","tsc --noEmit"],link:null,
    note:"Runs only on a developer machine until pushed."},
   {layer:"Static & security",stage:"PR gate",type:"L0 security · lint · tsc · semgrep S0",count:"4 checks",result:"unknown",
    target:"hub workspace",flows:["level0_security.py","eslint","tsc --noEmit","security-bracket selftest (S0, ubuntu)"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",
    note:"Pass or fail is unreadable from this plate until GitHub is wired."},
   {layer:"Static & security",stage:"Main / nightly",type:"L0 security · security_gate.py drift",count:"2 checks",result:"unknown",
    target:"hub workspace · nightly 03:17 UTC",flows:["Gate job on push","Shared security_gate.py drift check"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",
    note:"The nightly exists to catch Brain drift between pushes."},
   {layer:"Static & security",stage:"Staging (live edge)",type:"semgrep S2 (post-execution)",count:"reusable",result:"unknown",
    target:"spokes that call security-bracket",flows:["security-bracket phase S2"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/security-bracket.yml",
    note:"Whether any spoke calls the S2 phase is not visible from the hub."},
   {layer:"Static & security",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:"No static or security check runs against production."},

   {layer:"Unit",stage:"Local",type:"Vitest",count:"19 files · 4 packages",result:"local",
    target:"@ocr/ui, @ocr/tokens, runner-fleet, @ocr/flags",
    flows:["ui: tokens, partials, theme-swap, react, contract","tokens: contrast, axes","runner-fleet: token, platform, errors, github, watchdog","flags: d1, sqlite, memory, postgres, generated-parity, invariants, ci-workflow"],
    link:null,note:"data-provider declares vitest and has no test files."},
   {layer:"Unit",stage:"PR gate",type:"Vitest",count:"@ocr/flags only",result:"unknown",
    target:"flags test:gate + Vision invariants job",flows:["flags:test:gate (excludes invariants)","tests/invariants.test.ts (Tier Equity, Inert Monetization, Deprecation Lock)"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",
    note:"ui, tokens, runner-fleet suites run in no workflow."},
   {layer:"Unit",stage:"Main / nightly",type:"Vitest",count:"@ocr/flags only",result:"unknown",
    target:"same Gate job on push and schedule",flows:["flags:test:gate","invariants.test.ts"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",note:""},
   {layer:"Unit",stage:"Staging (live edge)",type:"OSE specs classified UNIT",count:"29 specs · 337 tests",result:"misplaced",
    target:"oursharedevents tests/e2e",flows:["22 static / code-shape specs","7 specs that never touch a browser"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/docs/testing/OSE-1070-e2e-coverage-risk-map.md",
    note:"Destination is Vitest. Today they run as E2E against live staging."},
   {layer:"Unit",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},

   {layer:"Contract",stage:"Local",type:"Vitest contract",count:"1 file",result:"local",
    target:"@ocr/ui contract.test.ts",flows:["ui contract"],link:null,note:""},
   {layer:"Contract",stage:"PR gate",type:"generated parity · Brain parity",count:"2 checks",result:"unknown",
    target:"flags contract",flows:["flags:check:generated","flags-contract.yaml ↔ OCR-docs pyramid (jsonschema)"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",
    note:"Brain parity needs the OCR-docs sibling repo present."},
   {layer:"Contract",stage:"Main / nightly",type:"generated parity · Brain parity",count:"2 checks",result:"unknown",
    target:"flags contract",flows:["flags:check:generated","Brain parity"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",note:""},
   {layer:"Contract",stage:"Staging (live edge)",type:"OSE specs classified CONTRACT",count:"4 specs · 46 tests",result:"misplaced",
    target:"oursharedevents API shape",flows:["API shape assertions"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/docs/testing/OSE-1070-e2e-coverage-risk-map.md",
    note:"Destination is the Newman contract tier."},
   {layer:"Contract",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},

   {layer:"Integration",stage:"Local",type:"Vitest adapters",count:"4 files",result:"local",
    target:"@ocr/flags storage adapters",flows:["d1","sqlite","postgres","memory"],link:null,note:""},
   {layer:"Integration",stage:"PR gate",type:"Vitest adapters",count:"4 files",result:"unknown",
    target:"@ocr/flags storage adapters (inside test:gate)",flows:["d1","sqlite","postgres","memory"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",note:""},
   {layer:"Integration",stage:"Main / nightly",type:"Vitest adapters",count:"4 files",result:"unknown",
    target:"@ocr/flags storage adapters",flows:["d1","sqlite","postgres","memory"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/.github/workflows/ci.yml",note:""},
   {layer:"Integration",stage:"Staging (live edge)",type:"OSE specs classified INTEGRATION",count:"43 specs · 573 tests",result:"misplaced",
    target:"oursharedevents browser flows, no edge",flows:["35 specs browser only","8 specs browser + network"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/docs/testing/OSE-1070-e2e-coverage-risk-map.md",
    note:"Destination is in-job miniflare / wrangler dev."},
   {layer:"Integration",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},

   {layer:"Component / viewport",stage:"Local",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:"No component-test runner in the hub."},
   {layer:"Component / viewport",stage:"PR gate",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},
   {layer:"Component / viewport",stage:"Main / nightly",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},
   {layer:"Component / viewport",stage:"Staging (live edge)",type:"OSE specs classified COMPONENT · device ladder",count:"47 specs · 995 tests · 1 quarantined",result:"misplaced",
    target:"oursharedevents layout and computed-style assertions",
    flows:["47 specs: boundingBox, getComputedStyle, viewport, screenshots","mobile-workability-audit.yml: 1 spec on iPhone SE, iPhone 14 Pro Max, iPad Air, Desktop Safari (WebKit only, no Chromium column)"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/docs/testing/OSE-1070-e2e-coverage-risk-map.md",
    note:"Destination is Playwright CT on Chromium and WebKit. The device ladder exists and is quarantined."},
   {layer:"Component / viewport",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},

   {layer:"E2E",stage:"Local",type:"Playwright",count:"1 spec · no runner",result:"notrun",
    target:"@ocr/ui e2e/shared-ui.spec.ts",flows:["shared-ui"],link:null,
    note:"Exists in the repo. No workflow runs it and Playwright is not a ui dependency."},
   {layer:"E2E",stage:"PR gate",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:"Hub PRs run no browser test."},
   {layer:"E2E",stage:"Main / nightly",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,note:""},
   {layer:"E2E",stage:"Staging (live edge)",type:"Playwright against stg.oursharedevents.com",count:"133 specs · 2094 tests",result:"unknown",
    target:"oursharedevents e2e-smoke and e2e configs, desktop Chrome",
    flows:["10 specs · 143 tests genuinely need the live edge (CF-Access, redirects, headers)","123 specs · 1951 tests do not, and run here anyway"],
    link:"https://github.com/ourcommunityrituals/ourcommunityrituals/blob/main/docs/testing/OSE-1070-e2e-coverage-risk-map.md",
    note:"Per-page and per-flow results arrive when GitHub is wired; the spoke repo is not attached to this plate."},
   {layer:"E2E",stage:"Production",type:"nothing",count:"",result:"none",target:"",flows:[],link:null,
    note:"No post-deploy check runs against production."}
  ],
  edge:{specs:133,tests:2094,needEdge:10,demotable:123}
 },
 recon:[
  {id:"code-deployed",name:"Code ↔ Deployed",pair:"repo migration floor vs Cloudflare D1 applied",state:"open",
   items:[
    {sev:"gate",t:"Production is twenty-six migrations behind.",
     body:"Live at 41, code floor at 67, staging at 68. Survivable only because production holds one event and nothing else. This is the gate in front of any customer-facing work.",
     fix:"Cloudflare · apply 0042 through 0067 to ocr-db production",refs:["prod"]},
    {sev:"stale",t:"Staging is one migration ahead of the code floor.",
     body:"0068 is applied but no merged code requires it. Every contract validated on staging silently carries that assumption. Harmless today, invisible tomorrow.",
     fix:"Repo · land the code that needs 0068, or record it as inert",refs:["stg"]}
   ]},
  {id:"planned-deployed",name:"Planned ↔ Deployed",pair:"Linear projects vs Cloudflare resources",state:"open",
   items:[
    {sev:"stale",t:"Staging Deploy Pipeline reads In Progress while staging is deployed and current.",
     body:"The thing the project tracks exists and runs at migration 68. Either the project is done or its remaining scope is written nowhere.",
     fix:"Linear (OW) · close it, or write the remaining scope as issues",refs:["ow","stg"]},
    {sev:"stale",t:"Infrastructure Dashboard is a taken name.",
     body:"It already holds thirty-plus OSE surface tickets. This plate is a deployed surface with no home in Linear, and the obvious name is spoken for.",
     fix:"Linear (OSE) · a project for this plate under a different name",refs:["ose"]}
   ]},
  {id:"planned-scheduled",name:"Planned ↔ Scheduled",pair:"Linear vs Calendar",state:"open",
   items:[
    {sev:"gate",t:"The Sawyer handoff at end of September has no ticket.",
     body:"It appears in two calendar block descriptions and nowhere in Linear. It is the only hard date driving front-end work.",
     fix:"Linear (OSE) · a milestone dated end of September",refs:["ose"]},
    {sev:"stale",t:"Twelve booked hours point at no Linear project.",
     body:"Every block to 14 Sep is booked against “OCR front end”, which is not a project, milestone, or issue. The nearest candidate is First Scan, target 30 Sep.",
     fix:"Calendar · name the Linear target in each block",refs:["ose"]}
   ]},
  {id:"scheduled-scheduled",name:"Scheduled ↔ Scheduled",pair:"Calendar against itself",state:"open",
   items:[
    {sev:"stale",t:"Thursday night is double-booked, and recurs.",
     body:"Build Block — OCR software and Deep work — OCR front end (post-OSG) both start at 10pm on 3 Sep and again on 10 Sep. One of them is fiction.",
     fix:"Calendar · delete or move one series",refs:[]}
   ]},
  {id:"planned-planned",name:"Planned ↔ Planned",pair:"Linear against itself",state:"open",
   items:[
    {sev:"stale",t:"Two projects are three months past target.",
     body:"Infrastructure Dashboard (OSE) and Staging Deploy Pipeline (OW), both dated 1 June 2026, both still reading In Progress.",
     fix:"Linear · re-date or close both",refs:["ose","ow"]},
    {sev:"stale",t:"QR & Form Attribution Chain reads Completed while QR Integrity is the declared active sprint.",
     body:"A completed project and an active epic covering the same ground. One is stale.",
     fix:"Linear (OSE) · reopen the project or retire the epic",refs:["ose"]}
   ]},
  {id:"ops-any",name:"Operations ↔ Any source",pair:"spoke work vs Linear, Cloudflare, Calendar",state:"open",
   items:[
    {sev:"dark",t:"OSG ships weekly and no source records it.",
     body:"An event every seven days at Eagles Hall. No ticket, no calendar event; only the build block afterward proves it happened.",
     fix:"Calendar · a recurring Thursday event, at minimum",refs:["osg"]},
    {sev:"dark",t:"OSR is blocked and nothing records the blocker.",
     body:"Proposal delivered and complete. The next record night waits on crew availability, which no system holds.",
     fix:"Linear · one blocked issue naming the dependency",refs:["osr"]},
    {sev:"dark",t:"OurSharedTables is gated on a person, not a ticket.",
     body:"Nothing publishes before Tom clears venue and time. The gate exists only in conversation.",
     fix:"Linear · one blocked issue naming the gate",refs:["ost"]},
    {sev:"dark",t:"The Founding Six corridor is locked but unrepresented as work.",
     body:"Six neighborhoods fixed as a set under OCR-121, with no project, milestone, or issue carrying them forward.",
     fix:"Linear · a project or milestone per corridor launch",refs:["six"]}
   ]},
  {id:"tested-deployed",name:"Tested ↔ Deployed",pair:"test pyramid vs where the pipeline runs it",state:"open",
   items:[
    {sev:"gate",t:"Production has no post-deploy check.",
     body:"Every column of the pyramid is empty at Production. A migration gap of twenty-six would be found by users before any test.",
     fix:"OSE CI · one smoke spec against production after each deploy",refs:["prod"]},
    {sev:"stale",t:"123 of 133 OSE specs run at the live edge and do not need it.",
     body:"Ninety-two percent of the suite is classified unit, contract, integration, or component and still runs as E2E against staging.",
     fix:"OSE repo · demotion batches per the OSE-1070 map, mutation score held per batch",refs:["stg"]},
    {sev:"dark",t:"Three hub packages test in no workflow.",
     body:"@ocr/ui, @ocr/tokens, and runner-fleet carry Vitest suites; only @ocr/flags runs in the Gate job. data-provider declares vitest and has no tests.",
     fix:"Hub ci.yml · run the workspace test script in the Gate job",refs:[]},
    {sev:"dark",t:"The shared-ui Playwright spec has no runner.",
     body:"It exists in @ocr/ui and no workflow executes it. It is coverage on paper.",
     fix:"Hub ci.yml · a Playwright job, or delete the spec",refs:[]}
   ]},
  {id:"unwired",name:"Sources not wired",pair:"cannot be reconciled from this plate",state:"blind",
   items:[
    {sev:"blind",t:"GitHub is not connected.",
     body:"In-flight work is invisible. The code floor of 67 came from a manual read of the repo, not from a connector, so the Code ↔ Deployed layer depends on a number nothing refreshes.",
     fix:"This plate · wire the GitHub connector",refs:["github"]},
    {sev:"blind",t:"Stripe and PayPal are not connected.",
     body:"Earned revenue is invisible. Zero today, which is exactly when wiring is cheapest.",
     fix:"This plate · wire the payment rails",refs:["pay"]}
   ]}
 ]
}
];
