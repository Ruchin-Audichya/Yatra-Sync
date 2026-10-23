import type { Allocation, Trip } from "./types";
import { shortestPath } from "./graph";
export const scenarioFare = (meters: number) => Math.round(6000 + meters * 1.8);
export function allocatePaise(
  total: number,
  weights: number[],
  caps?: number[],
): number[] {
  if (!Number.isSafeInteger(total) || total < 0 || total > 1_000_000_000)
    throw new Error(
      "Fare must be a non-negative integer in paise (maximum ₹1 crore).",
    );
  if (!weights.length) {
    if (total === 0) return [];
    throw new Error("At least one passenger is required.");
  }
  if (weights.some((w) => !Number.isFinite(w) || w < 0))
    throw new Error("Invalid fare weights.");
  if (
    caps &&
    (caps.length !== weights.length ||
      caps.some((c) => !Number.isSafeInteger(c) || c < 0))
  )
    throw new Error("Invalid solo caps.");
  const useCaps = !!caps && caps.reduce((a, b) => a + b, 0) >= total;
  const out = weights.map(() => 0),
    remaining = new Set(weights.map((_, i) => i));
  let budget = total;
  while (remaining.size) {
    const ids = [...remaining];
    const sum = ids.reduce((s, i) => s + weights[i], 0);
    const ws = ids.map((i) => (sum ? weights[i] : 1));
    const denom = ws.reduce((s, w) => s + w, 0);
    const constrained = useCaps
      ? ids.filter((i, k) => (budget * ws[k]) / denom > caps![i] - out[i])
      : [];
    if (constrained.length) {
      for (const i of constrained) {
        const amount = caps![i] - out[i];
        out[i] += amount;
        budget -= amount;
        remaining.delete(i);
      }
      continue;
    }
    const exact = ids.map((i, k) => ({ i, v: (budget * ws[k]) / denom }));
    let left = budget;
    for (const { i, v } of exact) {
      out[i] += Math.floor(v);
      left -= Math.floor(v);
    }
    exact.sort((a, b) => (b.v % 1) - (a.v % 1) || a.i - b.i);
    for (let k = 0; k < left; k++) out[exact[k].i]++;
    break;
  }
  return out;
}
export function splitFare(
  total: number,
  trips: Trip[],
): { allocations: Allocation[]; beneficial: boolean } {
  const weights = trips.map(
    (t) => (shortestPath(t.origin, t.destination)?.meters ?? 1) * t.seats,
  );
  const comparable = trips.every((t) => t.soloPaise !== null);
  const shares = allocatePaise(
    total,
    weights,
    comparable ? trips.map((t) => t.soloPaise!) : undefined,
  );
  const allocations = trips.map((t, i) => ({
    tripId: t.id,
    ownerId: t.ownerId,
    name: t.name,
    paise: shares[i],
    soloPaise: t.soloPaise,
    savingPaise: t.soloPaise === null ? null : t.soloPaise - shares[i],
  }));
  return {
    allocations,
    beneficial:
      comparable &&
      allocations.every((a) => a.savingPaise !== null && a.savingPaise >= 0),
  };
}
export const money = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
