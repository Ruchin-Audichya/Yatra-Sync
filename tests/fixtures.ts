import type { Trip } from "../src/domain/types";
import { shortestPath } from "../src/domain/graph";
import { scenarioFare } from "../src/domain/fare";
export const now = 1_800_000_000_000;
export function trip(id: string, overrides: Partial<Trip> = {}): Trip {
  const origin = overrides.origin ?? "junction",
    destination = overrides.destination ?? "jecrc";
  return {
    id,
    ownerId: `user-${id}`,
    communityId: "test",
    name: `Test ${id}`,
    origin,
    destination,
    earliest: now + 10 * 60000,
    latest: now + 40 * 60000,
    maxWait: 20,
    maxDetour: 15,
    maxWalk: 500,
    seats: 1,
    luggage: "small",
    provider: "any",
    womenOnly: false,
    gender: "woman",
    sharing: true,
    adult: true,
    status: "active",
    expires: now + 60 * 60000,
    soloPaise: scenarioFare(shortestPath(origin, destination)?.meters ?? 0),
    created: now,
    synthetic: true,
    routeVersion: 1,
    visibility: "community",
    ...overrides,
  };
}
