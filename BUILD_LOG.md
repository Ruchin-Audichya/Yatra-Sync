# Build log

- Reviewed both supplied source documents; empty workspace, Node 22.14/npm 10.9 available; no existing code or regression baseline.
- Declared deep verification and workspace-only write scope. SQLite/Next.js selected as requested. Next.js official installation/authentication documentation consulted.
- Decision: build locally, keep synthetic and real-account discovery separated, enforce authorization in services and use SQLite immediate transactions for lifecycle changes.

- Implemented Yatra Sync name, responsive product shell, public notices, local registration/sign-in and isolated synthetic persona flow.
- Added Drizzle/SQLite migration, fixed-seed public hub graph, persisted trip/group/message/report/notification/event/benchmark records, and atomic membership reservations.
- Built directed overlap matching, bounded group enumeration, hard departure/walk/detour/capacity/preferences/consent limits, explicit batch alternatives and exact-paise capped proportional splitting.
- Implemented versioned mutual consent, deterministic host, dropout/replacement recovery, booking handoff and progress marked self-reported, actual-fare review, manual own-share settlement and moderation.
- First algorithm run surfaced three incorrect test assumptions (a one-sided zero walking limit still permits the other rider to walk, one zero solo cap can be subsidized by a feasible other cap, and a fixed-clock host was not necessarily Meera). Corrected fixtures/assertions; added explicit boundary cases rather than weakening constraints.
- Browser verification found and fixed a localhost/127.0.0.1 origin-comparison issue, a label wrapping multiple scenario buttons, and Strict Mode preference hydration overwriting saved language/theme. Both initially failing browser journeys were rerun and passed.
- Strengthened privacy: redacted unconfirmed pickup paths and mutation responses; pinned acceptance to the agreed pickup/departure; prevented a removed passenger from regaining room access after survivors complete. Added regression coverage and actual concurrent HTTP invitation test.
- Upgraded Drizzle to 0.45.4 after an npm production dependency advisory. Synchronized manifest/lockfile; final production audit reports 0 vulnerabilities. Transient development module errors during dependency replacement were resolved before final build and tests.
- Visual QA inspected actual desktop landing/dashboard/group/studio screenshots and the 360px Hindi/dark view. Adjusted map padding and labels so the campus endpoint stays visible above its information card; reran the full validation after this change.
- Final Gravitas-owned verification: lint, typecheck, 138 Vitest tests (58 matching/graph, 35 fare, 45 integration), production build and all 9 Playwright journeys PASS. JSON/CSV benchmark exported from executed algorithms. Full logs in docs/evidence/verification.log.
- Seed 42 / 50 synthetic requests: FCFS 47/50 vs optimizer 48/50 matched, both 0 violations; optimizer mean wait 2.4 minutes vs baseline 5.5. A separate 200-request run matched 196/200 vs 190/200 with 0 violations; measured optimizer runtime about 1.2 seconds on this machine. These are synthetic results and vary with scenario/runtime.
- Delivered PM review, architecture, feature matrix, benchmark method, three-minute demo and exact startup/reset/test documentation. No external deployment, remote push, cab booking or payment was performed.

## Yatra Sync design refresh · 23 October 2026

Applied the supplied Urban Kinetic design reference across the frontend, including responsive top navigation, route discovery, travel rooms and exact fare contribution graphics. Added a local interactive FairSplit planner and discovery filters/sorting. Renamed visible branding to Yatra Sync while retaining compatible storage and session identifiers. See DESIGN_UPDATE.md and docs/evidence/yatra-skin/ for the implementation notes and current verification evidence.


## Canvas artwork and identity · 23 October 2026

The user's later artwork canvas superseded the interim forest/paper exploration. Implemented indigo/teal surfaces, connected-pin SVG identity, Bricolage Grotesque/Manrope typography and an original generated Jaipur hero asset. Integrated the asset into landing, onboarding and the dashboard; preserved the deterministic corridor graph for actual route exploration. Added mobile quick navigation and desktop profile access. Current visual checks and regression output are under docs/evidence/yatra-canvas/. Artwork provenance and the exact prompt are in docs/ART_DIRECTION.md.
