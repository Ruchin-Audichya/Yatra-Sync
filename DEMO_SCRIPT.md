# Three-minute Yatra Sync judge demo

Prerequisite: `cp .env.example .env.local`, `npm run demo:reset`, `npm run dev -- --port 3002`. Open http://127.0.0.1:3002/demo. No API keys. Never represent seeded people or fares as real.

**0:00–0:35 — Plan.** Select Aarav Sharma. Choose Plan a journey. The default JECRC → Jaipur Junction and future 30-minute window are compatible with fresh fixtures. Continue through hard wait/detour/walking/luggage constraints. Review, check discovery consent, then Find my people. These writes persist in SQLite.

**0:35–1:05 — Match and invite.** Inspect the top group, its heuristic score, per-rider illustrative savings and Why this group fits. Departure alternatives are inside each member's hard wait cap. Invite the top four-person group. Everyone is initially awaiting consent; the meeting point stays hidden.

**1:05–1:35 — Mutual consent and recovery.** Check and accept as Aarav. Switch to the other invited personas using the top selector and explicitly accept individually. The group confirms only after the final acceptance. Before booking, switch to Kabir and choose Decline / leave group. Confirm the local dialog. Switch to a remaining passenger, reopen the circle from My journeys, and show the new terms version, new shares and reset acceptances. Optionally invite the eligible replacement. Accept current terms again as every remaining member.

**1:35–2:15 — Manual booking and actual split.** Switch to the named nominated booking member (normally Meera after a fresh reset; read the actual displayed name). Prepare external booking. Show the provider link without needing to leave the app. Say “I booked externally” only as a simulated, self-reported demo action. Enter ₹640.25, recalculate shares and show that paise sum exactly. Each participant reviews the changed actual fare. Mark only your own share paid; the UI says self-reported. No money moves.

**2:15–3:00 — Measure.** Open Demo studio. Run 50 requests, seed 42. Compare identical-input FCFS with the constrained optimizer. Read actual matching rate, proposed groups, illustrative savings, waiting, zero rule violations and measured runtime. Export JSON/CSV. State that these are synthetic feasibility/cost results, not proven market demand or provider prices.

For a shorter run, show cancellation before confirmation and finish one group without recovery first. Reset synthetic state with the studio confirmation checkbox for the next demonstration; real local accounts are preserved, synthetic sessions sign out. The CLI reset is the quickest clean setup.
