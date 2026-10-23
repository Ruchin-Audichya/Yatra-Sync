# Yatra Sync: daily commuting pass

The useful moment is before a commuter books a cab. The home screen now puts a route request and any pending group decision first. Office, station and airport shortcuts use the supported Jaipur hubs; they do not imply citywide live coverage.

## What works

- Select two hubs, swap direction and choose a departure in 5, 15 or 30 minutes. Continue into the existing trip flow to review comfort limits and explicitly consent before publishing a request.
- Repeat or reverse one of the three latest distinct routes from authenticated server history. Carry forward seats, luggage, provider and comfort limits. Never reuse an old quote, departure time, train arrival or consent. No private journey history is added to local storage or the offline cache.
- Compare a manually entered solo quote against a whole shared-cab quote, with optional tolls/parking. Use two, three or four equal-seat travellers with identical pickup/drop-off. Show both potential savings and negative savings, with exact paise rounding. Different drop-offs continue to use the existing distance-based fare planner.
- Pick a suggested coordination message, edit it, then send through the existing group chat. Selecting a prompt does not send it.
- Use the isolated judge presentation at `/demo/present`: real matching and fare functions, simulated consent, cancellation/replacement, and a runnable benchmark. No presentation actions write to group or trip records.

## Product boundaries

Matching still operates inside the existing opted-in community and consent model. It checks directed route overlap, timing, walking, detour, capacity, preferences, blocks and economic benefit. This pass does not open discovery to unrelated communities.

The Jaipur graph and base fare model remain illustrative. A manually entered current quote does not refresh the shared-fare model automatically. The home comparison is a separate decision aid, not a provider quote or group agreement. Booking, payment and settlement happen outside the app; identities and bookings are not provider-verified.

## Next pilot decisions

Choose one dense office corridor and a small consenting cohort before expanding geographic coverage. Measure request-to-first-compatible-proposal time, group confirmation rate, abandonment, extra waiting, and final self-reported savings versus the contemporaneous solo quote. Treat missing supply as a matching failure, not an excuse to fabricate nearby riders.

A real rollout still needs a production routing source, appropriate provider arrangements, reliable hosting and operational support. Keep precise pickup disclosure behind mutual consent. Demand for a commute reminder or a saved routine should be established before adding location tracking or notification permissions.
