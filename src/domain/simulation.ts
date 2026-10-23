import { hubs, shortestPath } from "./graph";
import { scenarioFare } from "./fare";
import { evaluateGroup, formGroups } from "./matching";
import type { Trip, Plan } from "./types";
export function generateScenario(
  count: number,
  seed: number,
  now: number,
  disruption: "none" | "delay" | "cancellation" = "none",
): Trip[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const origins = [
    "junction",
    "gate",
    "airport",
    "jecrc",
    "junction",
    "junction",
  ];
  return Array.from({ length: count }, (_, i) => {
    const origin = origins[Math.floor(random() * origins.length)];
    const destination =
      origin === "jecrc" ? "junction" : random() < 0.2 ? "sitapura" : "jecrc";
    const earliest =
      now +
      Math.floor(random() * 8) * 300000 +
      (disruption === "delay" && i % 5 === 0 ? 20 * 60000 : 0);
    const meters = shortestPath(origin, destination)!.meters;
    return {
      id: `sim-${seed}-${i}`,
      ownerId: `person-${i}`,
      name: `Synthetic rider ${i + 1}`,
      communityId: "jecrc-demo",
      origin,
      destination,
      earliest,
      latest: earliest + 30 * 60000,
      maxWait: i % 11 === 0 ? 5 : 20,
      maxDetour: 10,
      maxWalk: 500,
      seats: i % 17 === 0 ? 2 : 1,
      luggage: i % 13 === 0 ? "large" : "small",
      provider: "any",
      womenOnly: i % 9 === 0,
      gender: i % 3 === 0 ? "woman" : "man",
      sharing: true,
      adult: true,
      status:
        disruption === "cancellation" && i % 7 === 0 ? "cancelled" : "active",
      expires: earliest + 60 * 60000,
      soloPaise: scenarioFare(meters),
      created: now + i,
      synthetic: true,
      routeVersion: 1,
      visibility: "community",
    };
  });
}
function stats(plans: Plan[], trips: Trip[], runtimeMs: number, now: number) {
  const matched = plans.flatMap((p) => p.trips);
  const waits = plans
    .flatMap((p) => p.trips.map((t) => (p.departure - t.earliest) / 60000))
    .sort((a, b) => a - b);
  const saving = plans.reduce(
    (s, p) =>
      s + p.allocations.reduce((sum, a) => sum + (a.savingPaise ?? 0), 0),
    0,
  );
  const eligible = trips.filter(
    (t) =>
      t.status === "active" &&
      t.expires > now &&
      t.latest >= now &&
      t.adult &&
      t.sharing,
  ).length;
  return {
    eligible,
    matched: matched.length,
    matchRate: eligible
      ? Math.round((matched.length / eligible) * 1000) / 10
      : 0,
    groups: plans.length,
    savingPaise: saving,
    meanWait: waits.length
      ? Math.round((waits.reduce((a, b) => a + b, 0) / waits.length) * 10) / 10
      : 0,
    medianWait: waits.length ? waits[Math.floor(waits.length / 2)] : 0,
    meanDetour: plans.length
      ? Math.round(
          (plans.reduce((s, p) => s + p.maxDetour, 0) / plans.length) * 10,
        ) / 10
      : 0,
    violations: plans.filter((p) => !evaluateGroup(p.trips, { now }).plan)
      .length,
    runtimeMs: Math.round(runtimeMs * 100) / 100,
  };
}
export function benchmark(
  count = 50,
  seed = 42,
  now = 1_800_000_000_000,
  disruption: "none" | "delay" | "cancellation" = "none",
) {
  const trips = generateScenario(count, seed, now, disruption);
  const a = performance.now();
  const baseline = formGroups(trips, { now }, "baseline");
  const b = performance.now();
  const optimizer = formGroups(trips, { now }, "optimizer");
  const c = performance.now();
  const recovery = optimizer
    .map((p) => {
      const remain = p.trips.slice(1);
      return remain.length < 2 ? null : evaluateGroup(remain, { now }).plan;
    })
    .filter(Boolean).length;
  return {
    synthetic: true,
    seed,
    count,
    disruption,
    graphHubs: hubs.length,
    inputIds: trips.map((t) => t.id),
    baseline: stats(baseline, trips, b - a, now),
    optimizer: stats(optimizer, trips, c - b, now),
    cancellationRecovery: {
      attempted: optimizer.length,
      survivingGroups: recovery,
    },
    assumptions:
      "Synthetic scenario — not live demand, traffic, cab pricing or proven real-world saving. Same inputs, graph, fare model and hard rules. Groups are proposed, never confirmed.",
    created: now,
  };
}
