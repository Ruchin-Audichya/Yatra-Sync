import { shortestPath } from "./graph";
import { scenarioFare } from "./fare";
import { evaluateGroup } from "./matching";
import type { Trip } from "./types";

// Fixed-clock, in-memory fixtures: presentations never expire or touch SQLite.
export const JUDGE_NOW = Date.UTC(2027, 0, 15, 12, 10);
export function judgeTrips(): Trip[] {
  return [
    "Aarav Sharma",
    "Meera Jain",
    "Kabir Singh",
    "Ananya Rao",
    "Nisha Verma",
  ].map((name, i) => {
    const destination = i === 2 ? "gandhi" : "junction";
    const earliest = JUDGE_NOW + (15 + [0, 2, 3, 1, 2][i]) * 60000;
    return {
      id: `judge-trip-${i}`,
      ownerId: `judge-rider-${i}`,
      name,
      communityId: "judge-sandbox",
      origin: "sitapura",
      destination,
      earliest,
      latest: earliest + 20 * 60000,
      maxWait: 15,
      maxDetour: 12,
      maxWalk: 500,
      seats: 1,
      luggage: "small",
      provider: "any",
      womenOnly: false,
      gender: "unspecified",
      sharing: true,
      adult: true,
      status: "active",
      expires: JUDGE_NOW + 120 * 60000,
      soloPaise: scenarioFare(shortestPath("sitapura", destination)!.meters),
      created: JUDGE_NOW + i,
      synthetic: true,
      routeVersion: 1,
      visibility: "community",
    };
  });
}
export function judgePlan(trips = judgeTrips().slice(0, 4)) {
  const result = evaluateGroup(trips, { now: JUDGE_NOW });
  if (!result.plan)
    throw new Error(`Judge scenario is invalid: ${result.reason}`);
  return result.plan;
}
