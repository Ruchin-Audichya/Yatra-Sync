import type { Trip } from "./types";
import { allocatePaise } from "./fare";

/** A repeat request reuses comfort limits, never old dates, quotes or consent. */
export function repeatPreferences(trip: Trip, reverse = false) {
  return {
    origin: reverse ? trip.destination : trip.origin,
    destination: reverse ? trip.origin : trip.destination,
    maxWait: trip.maxWait,
    maxWalk: trip.maxWalk,
    maxDetour: trip.maxDetour,
    seats: trip.seats,
    luggage: trip.luggage,
    provider: trip.provider,
    womenOnly: trip.womenOnly,
  };
}
export function recentRoutes(trips: Trip[]) {
  const seen = new Set<string>();
  return [...trips]
    .sort((a, b) => b.created - a.created)
    .filter((trip) => {
      const key = `${trip.origin}:${trip.destination}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}
export function parseQuote(value: string): number | null {
  if (
    !/^\d+(\.\d{0,2})?$/.test(value) ||
    Number(value) <= 0 ||
    Number(value) > 1000000
  )
    return null;
  return Math.round(Number(value) * 100);
}
export function compareQuote(
  solo: number,
  shared: number,
  riders: number,
  extra: number,
) {
  if (![2, 3, 4].includes(riders) || !Number.isSafeInteger(extra) || extra < 0)
    throw new Error("Invalid sharing inputs");
  const shares = allocatePaise(shared + extra, Array(riders).fill(1));
  return {
    share: shares[0],
    saving: solo - shares[0],
    breakEven: solo * riders - extra,
  };
}
