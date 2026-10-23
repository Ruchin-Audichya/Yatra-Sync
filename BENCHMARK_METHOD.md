# Reproducible synthetic comparison

Run `npm run bench -- 50 42`. JSON and CSV evidence are saved to `docs/evidence/benchmark.json` and `docs/evidence/benchmark.csv`; the interactive Demo studio also exports CSV and JSON including seed, synthetic label and scenario.

`generateScenario(count, seed, referenceTime, disruption)` uses a fixed LCG (1664525, 1013904223, modulo 2^32). Counts are 25/50/100/200 in the studio. The CLI defaults to 50 requests, seed 42 and fixed reference time 1800000000000. The UI uses its recorded current time. Identical count, seed and reference time produce identical request data; algorithm runtime is inherently variable.

The generator mixes campus/station/airport routes, station-gate walking, intermediate stops, reverse directions, staggered departures, wait caps, luggage, multi-seat requests and self-declared women-only restrictions. Delay moves every fifth request +20 minutes. Cancellation removes every seventh request. Dedicated algorithm tests cover expired requests and explicit blocked pairs; the synthetic population is not a live demand forecast.

Both algorithms receive the same input requests and share the same eligibility/constraint evaluator, seeded graph, four-seat capacity, luggage policy, departure bounds, individual fare checks and scenario cost model. FCFS processes creation order and greedily adds exact-origin/destination matches that remain feasible. The optimizer processes the same order, searches up to 20 nearby-time candidates and chooses the highest-ranked feasible 2–4-person group. Both reserve each owner at most once. This is a bounded greedy grouping procedure, not a proof of global optimality. Results can favour either method on different metrics.

- Eligible = active, consenting adults with unexpired future departure bounds. Preferences that constrain matching do not remove a request from the denominator.
- Matched travellers = unique owners in proposed groups; matching rate = matched / eligible × 100.
- Group count = proposed groups. No mutual confirmation or real completion is inferred.
- Estimated saving = sum of each matched rider's comparable solo estimate minus their shared allocation. Unmatched riders contribute zero. Amounts are integer paise.
- Wait = common departure minus each rider's earliest departure; walking readiness is included. Report mean and median.
- Detour metric = mean of each group's maximum per-rider added driving time; the UI names this explicitly.
- Runtime = measured performance.now elapsed around each executed algorithm, milliseconds. It is computational matching time, not real user waiting/marketplace matching latency.
- Constraint violations = re-evaluated infeasible groups. Expected zero; scores never override hard constraints.
- Cancellation survival = feasible groups of at least two after removing the first member of each optimizer proposal. This does not claim successful replacement consent or real recovery.

Fare model: base ₹60 + ₹18 per illustrative graph kilometre. Allocations use standalone graph distance × requested seats, feasible solo caps and deterministic largest-remainder reconciliation. These are assumptions, not licensed provider tariffs. See domain/fare.ts and tests.

Every output is synthetic: it is not live demand, traffic, cab pricing or proven real-world savings. The executable evidence is the benchmark JSON, not a fixed number in marketing copy.
