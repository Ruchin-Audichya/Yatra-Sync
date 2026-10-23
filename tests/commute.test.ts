import { describe, it, expect } from "vitest";
import {
  compareQuote,
  parseQuote,
  recentRoutes,
  repeatPreferences,
} from "../src/domain/commute";
import { judgeTrips, judgePlan } from "../src/domain/judge-demo";

describe("daily commuting", () => {
  it("never carries a stale quote, timing, train data or consent into a repeat", () => {
    const trip = judgeTrips()[0];
    const repeated = repeatPreferences(trip);
    expect(repeated.origin).toBe(trip.origin);
    expect(repeated.maxDetour).toBe(trip.maxDetour);
    expect(repeated).not.toHaveProperty("earliest");
    expect(repeated).not.toHaveProperty("soloPaise");
    expect(repeated).not.toHaveProperty("trainArrival");
    expect(repeated).not.toHaveProperty("sharing");
    expect(repeatPreferences(trip, true)).toMatchObject({
      origin: trip.destination,
      destination: trip.origin,
    });
  });
  it("chooses the latest distinct routes without mutating server history", () => {
    const trips = judgeTrips();
    const older = { ...trips[0], created: 1 };
    const newer = { ...trips[0], id: "latest", created: 3 };
    const input = [older, newer, trips[2]];
    const result = recentRoutes(input);
    expect(
      result.find(
        (t) => t.origin === older.origin && t.destination === older.destination,
      )?.id,
    ).toBe("latest");
    expect(input[0]).toBe(older);
    expect(result).toHaveLength(2);
  });
  it("parses bounded exact rupee quotes and rejects misleading inputs", () => {
    expect(parseQuote("640.25")).toBe(64025);
    for (const value of ["", "-1", "0", "0.001", "NaN", "1e3", "1000001"])
      expect(parseQuote(value)).toBeNull();
  });
  it("accounts for extras, rounding and quotes where sharing loses money", () => {
    expect(compareQuote(48000, 54000, 2, 6000)).toMatchObject({
      share: 30000,
      saving: 18000,
      breakEven: 90000,
    });
    expect(compareQuote(10000, 40000, 3, 0)).toMatchObject({
      share: 13334,
      saving: -3334,
    });
    expect(compareQuote(10000, 20000, 2, 0).saving).toBe(0);
    expect(() => compareQuote(100, 100, 1, 0)).toThrow();
  });
});
describe("isolated presentation fixtures", () => {
  it("keeps all three demonstrated compositions feasible under the real engine", () => {
    const trips = judgeTrips();
    for (const group of [
      trips.slice(0, 4),
      [trips[0], trips[1], trips[3]],
      [trips[0], trips[1], trips[3], trips[4]],
    ]) {
      const plan = judgePlan(group);
      expect(plan.allocations.reduce((sum, a) => sum + a.paise, 0)).toBe(
        plan.farePaise,
      );
    }
  });
});
