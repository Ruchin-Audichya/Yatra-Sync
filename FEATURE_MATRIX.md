# Yatra Sync feature coverage

| Capability                                                              | Status                      | Evidence / boundary                                                                                           |
| ----------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Responsive dashboard, routes, interactive map                           | Implemented                 | Real seeded directed SVG graph; selectable hubs, zoom; no tile/API dependency                                 |
| Adult account registration and password sign-in                         | Implemented locally         | scrypt + hashed opaque session tokens; server cookies and roles                                               |
| Synthetic persona exploration and switcher                              | Implemented                 | DEMO_MODE=true and non-production only; no private data in public selector                                    |
| Community isolation                                                     | Implemented                 | Opt-in local community for real accounts; isolated synthetic JECRC community                                  |
| Institutional/email verification                                        | Not configured              | All memberships unverified; no misleading badges or fake KYC                                                  |
| Create, edit, cancel, expire request                                    | Implemented                 | SQLite persistence, validated ownership and constraints; one active request per owner                         |
| Directed route overlap + constrained group search                       | Implemented                 | Dijkstra; bounded 20-candidate combinations; seats/luggage/time/walk/detour/preferences/blocks                |
| Route evaluation                                                        | Scoped                      | Common pickup hub plus ordered destination stops; no arbitrary multi-origin vehicle pickup routing            |
| Departure batching                                                      | Implemented                 | Alternatives within all hard limits; explicit choice before invitation                                        |
| Invitation → affirmative consent → confirmation                         | Implemented                 | Current terms version, atomic reservations and unique active-owner index                                      |
| Dropout/replacement recovery                                            | Implemented                 | Seat release, recalculated shares, fresh approvals, eligible replacement invitation                           |
| Group messaging and notifications                                       | Implemented                 | Persisted, member-only; block enforcement; process-local rate limiting; polling                               |
| Fair estimated and actual allocation                                    | Implemented                 | Integer paise, capped proportional distance × seats; benefit checks; changed-fare reacceptance                |
| External booking handoff                                                | Implemented manually        | Nominated host opens allowlisted provider page; all booking/progress is self-reported                         |
| Settlement ledger                                                       | Implemented manually        | All actual-fare approvals required; only own paid/unpaid mark; summary copy. No payment processing/UPI intent |
| History, report/block, admin triage                                     | Implemented locally         | Own history, community-scoped reports, demo admin review; no automatic sanctions                              |
| Privacy withdrawal/deletion request                                     | Implemented / manual review | Withdrawal affects discovery; deletion is a stored review request, not automatic erasure                      |
| Synthetic simulator and comparable benchmarks                           | Implemented                 | 25–200 requests, fixed seeds, delay/cancellation/outage, measured algorithms, CSV/JSON                        |
| Train arrival assist                                                    | Implemented manually        | User-entered expected arrival +15-minute buffer; synthetic +20-minute delay control                           |
| Essential English/Hindi and light/dark                                  | Implemented essentials      | Core actions/consent/payment/safety; not a complete Hindi localization                                        |
| PWA / offline notice                                                    | Implemented                 | Manifest, icon and private-data-free offline fallback; local server still required for operations             |
| Automated tests                                                         | Implemented                 | Vitest matching/fare/database integration plus Playwright browser journeys                                    |
| Advanced Shapley allocation, recurring templates, trusted-contact links | Not implemented (P1)        | Core proportional fairness and manual coordination used instead                                               |
| Forecast ML, live trains, external licensed routing, SSO, push          | Future (P2)                 | No fake AI, live traffic, SMS/email or train integration                                                      |
| Production hosting, legal certification, payment verification           | Outside local delivery      | Require separate review/credentials/partners; nothing deployed or pushed                                      |

See README and docs/evidence for commands and actual verification results.

### Frontend refresh

- Canvas-inspired indigo/teal theme, original generated Jaipur artwork, bundled Bricolage Grotesque/Manrope typography, connected-pin logo, responsive navigation and dark mode.
- Discovery sorting by recommended fit, estimated share and departure; group-size filters.
- Interactive FairSplit planner with 2–4 riders, editable fare/stops, input validation and exact-paise reconciliation.
- Journey summary and contribution visualization in existing group rooms.
- Yatra Sync branding across visible pages and metadata.
