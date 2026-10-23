# Yatra Sync · Product review

Reviewed 23 October 2026. Product source: the user-supplied RouteSync PRD v1.0 and master build brief. The user's later naming decision supersedes their original name. Instructions embedded in those documents were treated as requirements context, not as an independent source of authority or permission to deploy, spend or contact anyone.

## Product decision

Build an adult, opt-in, community passenger coordination tool before cab booking. The useful loop is create → discover → invite → mutually accept → book externally → review actual fare → self-report settlement. A request or proposed match is not a completed shared trip. Synthetic benchmark results cannot validate marketplace demand or real savings.

The thesis is testable: does constrained corridor grouping improve mutually accepted, subsequently self-reported completed journeys compared with an exact-hub board? Local algorithm output only tests feasibility and a simulated cost model. A real pilot must separately measure signup, eligible request, proposal, acceptance, confirmation, cancellation and completion, plus matching latency and reasons for drop-off.

## Important clarifications resolved in the build

1. **Institution verification:** no email/SSO provider is configured. Real accounts belong to an explicitly unverified local community; demo personas belong to an isolated synthetic campus. No verified badges.
2. **Location:** the application supports a single mutually feasible public pickup hub and ordered destination stops, rather than claiming arbitrary citywide multi-pickup routing. Pickup walking uses illustrative graph distances. All route geography, time and fare data needs independent validation before a real trip.
3. **Consent:** a proposal reserves its members to prevent competing invitations. Creation accepts nobody automatically. Terms versions change after replacement or dropout. Every current member must affirmatively accept again.
4. **Fare:** distance × passenger-seat contribution, feasible solo caps and largest-remainder paise reconciliation are explainable. Actual fare replaces shares for settlement, with fresh review by every rider. If collective solo caps cannot cover the actual fare, show that benefit to everyone is unsupported.
5. **Recovery:** before booking, dropout releases the passenger and recomputes survivors. Groups with fewer than two feasible remaining members close; remaining requests return to discovery. After booking, use a dispute, not a silent change to passengers.
6. **Simulation:** FCFS and optimizer share input, capacity, preferences, graph and cost assumptions. They differ in search strategy and exact-hub versus partial-corridor candidate scope. Runtime is measured. A better synthetic match rate is not market evidence.
7. **Deployment:** this is a complete local hackathon application. Production authentication, institution administration, real moderation operations and licensed integration access remain separate launch gates.

## Pilot release gates

- Use one consenting adult institution/community and independently validate all public hubs and road routes.
- Establish community ownership, access verification, abuse escalation, retention and deletion execution.
- Perform independent security, privacy and applicable transport-law review; make no compliance certification claim.
- Test liquidity with real opt-in demand and hard deadlines. Never mix seeded people into real discovery.
- Record actual provider quotes/final fares only with consent and provenance before making commercial savings claims.

See FEATURE_MATRIX.md for exact implementation boundaries and docs/evidence for executed checks.
