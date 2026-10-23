import { directedOverlap, hubs, shortestPath } from "./graph";
import { scenarioFare, splitFare } from "./fare";
import type { Path, Plan, Trip } from "./types";
export interface MatchContext {
  now: number;
  pickup?: string;
  departure?: number;
  blocks?: [string, string][];
}
function permutations<T>(xs: T[]): T[][] {
  return xs.length <= 1
    ? [xs]
    : xs.flatMap((x, i) =>
        permutations(xs.filter((_, j) => j !== i)).map((rest) => [x, ...rest]),
      );
}
export function evaluateGroup(
  trips: Trip[],
  ctx: MatchContext,
): { plan: Plan | null; reason: string } {
  const fail = (reason: string) => ({ plan: null, reason });
  if (trips.length < 2 || trips.length > 4)
    return fail("Groups need 2–4 passengers.");
  if (new Set(trips.map((t) => t.ownerId)).size !== trips.length)
    return fail("Duplicate passenger.");
  if (
    trips.some(
      (t) =>
        !t.adult ||
        !t.sharing ||
        t.status !== "active" ||
        t.expires <= ctx.now ||
        t.latest < ctx.now,
    )
  )
    return fail("Expired, inactive or missing consent.");
  if (
    trips.some(
      (t) =>
        t.communityId !== trips[0].communityId ||
        t.synthetic !== trips[0].synthetic,
    )
  )
    return fail("Different community or demo boundary.");
  if (trips.reduce((s, t) => s + t.seats, 0) > 4)
    return fail("Four-seat capacity exceeded.");
  if (
    trips.reduce(
      (s, t) => s + { small: 1, medium: 2, large: 3 }[t.luggage] * t.seats,
      0,
    ) > 6
  )
    return fail("Luggage capacity exceeded.");
  if (trips.some((t) => t.womenOnly) && trips.some((t) => t.gender !== "woman"))
    return fail("Self-declared women-only preference.");
  if (
    trips.some((a) =>
      trips.some((b) =>
        ctx.blocks?.some(
          ([x, y]) =>
            (x === a.ownerId && y === b.ownerId) ||
            (y === a.ownerId && x === b.ownerId),
        ),
      ),
    )
  )
    return fail("Blocked pairing.");
  if (
    new Set(trips.filter((t) => t.provider !== "any").map((t) => t.provider))
      .size > 1
  )
    return fail("Different provider preferences.");
  const routes = trips.map((t) => shortestPath(t.origin, t.destination));
  if (routes.some((r) => !r || !r.meters))
    return fail("No valid corridor route.");
  let overlap = 1;
  for (let i = 0; i < trips.length; i++)
    for (let j = i + 1; j < trips.length; j++) {
      const v = directedOverlap(routes[i]!, routes[j]!);
      if (v < 0.4) return fail("Insufficient directed route overlap.");
      overlap = Math.min(overlap, v);
    }
  let best: Plan | null = null;
  let timingPossible = false;
  let pickupPossible = false;
  let economicFailure = false;
  for (const pickup of hubs.map((h) => h.id)) {
    if (ctx.pickup && ctx.pickup !== pickup) continue;
    const walks = trips.map(
      (t) => shortestPath(t.origin, pickup)?.meters ?? Infinity,
    );
    if (walks.some((w, i) => w > trips[i].maxWalk)) continue;
    pickupPossible = true;
    const ready = trips.map(
      (t, i) =>
        Math.max(ctx.now, t.earliest) + Math.ceil(walks[i] / 75) * 60000,
    );
    const earliest = Math.max(...ready);
    const latest = Math.min(
      ...trips.map((t) => Math.min(t.latest, t.earliest + t.maxWait * 60000)),
    );
    if (earliest > latest) continue;
    if (
      ctx.departure !== undefined &&
      (ctx.departure < earliest || ctx.departure > latest)
    )
      continue;
    timingPossible = true;
    const grid = Math.ceil(earliest / 300000) * 300000;
    const departureOptions = [
      earliest,
      ...Array.from(
        { length: Math.max(0, Math.floor((latest - grid) / 300000) + 1) },
        (_, i) => grid + i * 300000,
      ),
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 12);
    if (ctx.departure !== undefined)
      departureOptions.splice(0, departureOptions.length, ctx.departure);
    const departure = departureOptions[0];
    for (const stops of permutations([
      ...new Set(trips.map((t) => t.destination)),
    ])) {
      const route: Path = { hubs: [pickup], edges: [], meters: 0, minutes: 0 };
      const arrivals = new Map<string, number>();
      let last = pickup;
      for (const stop of stops) {
        const leg = shortestPath(last, stop);
        if (!leg) continue;
        route.hubs.push(...leg.hubs.slice(1));
        route.edges.push(...leg.edges);
        route.meters += leg.meters;
        route.minutes += leg.minutes;
        arrivals.set(stop, route.minutes);
        last = stop;
      }
      const detours = trips.map((t, i) =>
        Math.max(
          0,
          (arrivals.get(t.destination) ?? Infinity) - routes[i]!.minutes,
        ),
      );
      if (detours.some((d, i) => d > trips[i].maxDetour)) continue;
      // Reject a path that passes a rider's destination before their declared stop.
      if (
        stops.some(
          (stop) => route.hubs.indexOf(stop) !== route.hubs.lastIndexOf(stop),
        )
      )
        continue;
      const farePaise = scenarioFare(route.meters);
      const { allocations, beneficial } = splitFare(farePaise, trips);
      if (!beneficial) {
        economicFailure = true;
        continue;
      }
      const waits = trips.map((t) => (departure - t.earliest) / 60000);
      const savings = allocations.reduce((s, a) => s + (a.savingPaise ?? 0), 0);
      const maxWait = Math.max(...waits),
        maxDetour = Math.max(...detours),
        maxWalk = Math.max(...walks);
      const score = Math.round(
        Math.max(
          0,
          Math.min(
            100,
            55 +
              overlap * 25 +
              Math.min(20, savings / 4000) -
              maxWait * 0.5 -
              maxDetour -
              maxWalk / 100,
          ),
        ),
      );
      const plan: Plan = {
        trips,
        pickup,
        departure,
        departureOptions,
        path: route,
        farePaise,
        allocations,
        beneficial,
        score,
        overlap,
        maxWait,
        maxDetour,
        maxWalk,
        reasons: [
          `${Math.round(overlap * 100)}% directed corridor overlap`,
          `${Math.round(maxWait)} min maximum wait`,
          `${maxDetour} min maximum added driving`,
          `${maxWalk} m maximum pickup walk`,
          "All comparable solo-fare caps respected",
        ],
      };
      if (
        !best ||
        plan.score > best.score ||
        (plan.score === best.score &&
          (plan.path.meters < best.path.meters ||
            plan.pickup.localeCompare(best.pickup) < 0))
      )
        best = plan;
    }
  }
  return best
    ? { plan: best, reason: "" }
    : fail(
        !pickupPossible
          ? "No meeting hub within walking limits."
          : !timingPossible
            ? "Departure and wait windows do not overlap."
            : economicFailure
              ? "Comparable solo fares do not support benefit for this group."
              : "No route satisfies detour limits.",
      );
}
export function recommend(
  anchor: Trip,
  all: Trip[],
  ctx: MatchContext,
  limit = 6,
): Plan[] {
  const candidates = all
    .filter(
      (t) =>
        t.id !== anchor.id &&
        t.ownerId !== anchor.ownerId &&
        t.communityId === anchor.communityId &&
        t.synthetic === anchor.synthetic &&
        t.status === "active" &&
        t.expires > ctx.now &&
        t.earliest <= anchor.latest &&
        t.latest >= anchor.earliest,
    )
    .sort(
      (a, b) =>
        Math.abs(a.earliest - anchor.earliest) -
          Math.abs(b.earliest - anchor.earliest) || a.id.localeCompare(b.id),
    )
    .slice(0, 20);
  const plans: Plan[] = [];
  const search = (picked: Trip[], start: number) => {
    if (picked.length > 1) {
      const { plan: p, reason } = evaluateGroup(picked, ctx);
      if (!p) {
        if (!reason.startsWith("Comparable solo")) return;
      } else plans.push(p);
    }
    if (picked.length === 4) return;
    for (let i = start; i < candidates.length; i++)
      search([...picked, candidates[i]], i + 1);
  };
  search([anchor], 0);
  return plans
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.trips.length - a.trips.length ||
        a.trips
          .map((t) => t.id)
          .sort()
          .join()
          .localeCompare(
            b.trips
              .map((t) => t.id)
              .sort()
              .join(),
          ),
    )
    .slice(0, limit);
}
export function formGroups(
  all: Trip[],
  ctx: MatchContext,
  mode: "baseline" | "optimizer",
): Plan[] {
  const available = all
    .filter(
      (t) =>
        t.status === "active" &&
        t.expires > ctx.now &&
        t.latest >= ctx.now &&
        t.adult &&
        t.sharing,
    )
    .sort((a, b) => a.created - b.created || a.id.localeCompare(b.id));
  const used = new Set<string>();
  const groups: Plan[] = [];
  for (const anchor of available) {
    if (used.has(anchor.ownerId)) continue;
    const rest = available.filter((t) => !used.has(t.ownerId));
    let plan: Plan | null = null;
    if (mode === "optimizer") plan = recommend(anchor, rest, ctx, 1)[0] ?? null;
    else {
      let picked = [anchor];
      for (const c of rest) {
        if (
          c.id === anchor.id ||
          c.origin !== anchor.origin ||
          c.destination !== anchor.destination
        )
          continue;
        const proposed = evaluateGroup([...picked, c], ctx).plan;
        if (proposed) {
          picked = [...picked, c];
          plan = proposed;
        }
        if (picked.reduce((s, t) => s + t.seats, 0) >= 4) break;
      }
    }
    if (plan) {
      groups.push(plan);
      plan.trips.forEach((t) => used.add(t.ownerId));
    }
  }
  return groups;
}
