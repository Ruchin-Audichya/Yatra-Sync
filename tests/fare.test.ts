import { describe, it, expect } from "vitest";
import { allocatePaise, splitFare, scenarioFare } from "../src/domain/fare";
import { trip } from "./fixtures";
describe("exact-paise allocation", () => {
  it.each([0, 1, 2, 3, 7, 11, 99, 100, 101, 49999, 1_000_000_000])(
    "exactly reconciles %i paise with unequal weights",
    (total) => {
      const parts = allocatePaise(total, [1, 2, 7]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((n) => Number.isSafeInteger(n) && n >= 0)).toBe(true);
    },
  );
  it("equal split has deterministic odd-paise remainder", () =>
    expect(allocatePaise(101, [1, 1, 1])).toEqual([34, 34, 33]));
  it("weights a long journey proportionately", () =>
    expect(allocatePaise(10000, [1, 3])).toEqual([2500, 7500]));
  it("falls back to equal weights when all weights are zero", () =>
    expect(allocatePaise(5, [0, 0])).toEqual([3, 2]));
  it("handles zero-weight participant", () =>
    expect(allocatePaise(100, [0, 1])).toEqual([0, 100]));
  it("handles a one-passenger arithmetic edge", () =>
    expect(allocatePaise(17, [9])).toEqual([17]));
  it("empty zero allocation is valid", () =>
    expect(allocatePaise(0, [])).toEqual([]));
  it.each([-1, 1.2, NaN, Infinity, 1_000_000_001])(
    "rejects invalid total %s",
    (total) => expect(() => allocatePaise(total, [1, 1])).toThrow(),
  );
  it("rejects a nonzero total without participants", () =>
    expect(() => allocatePaise(10, [])).toThrow());
  it("rejects negative weights", () =>
    expect(() => allocatePaise(100, [1, -2])).toThrow());
  it("rejects nonfinite weights", () =>
    expect(() => allocatePaise(100, [Infinity, 2])).toThrow());
  it("rejects invalid solo caps", () =>
    expect(() => allocatePaise(100, [1, 1], [-2, 80])).toThrow());
  it("caps a short solo quote when total caps permit", () =>
    expect(allocatePaise(10000, [1, 1], [1000, 10000])).toEqual([1000, 9000]));
  it("iteratively redistributes multiple constrained caps", () =>
    expect(allocatePaise(100, [5, 5, 1], [10, 20, 100])).toEqual([10, 20, 70]));
  it("does not invent economic feasibility when solo caps are insufficient", () => {
    const ts = [trip("a", { soloPaise: 30 }), trip("b", { soloPaise: 30 })];
    const s = splitFare(101, ts);
    expect(s.beneficial).toBe(false);
    expect(s.allocations.reduce((a, b) => a + b.paise, 0)).toBe(101);
  });
  it("does not claim universal benefit with unknown solo estimates", () =>
    expect(
      splitFare(100, [trip("a", { soloPaise: null }), trip("b")]).beneficial,
    ).toBe(false));
  it("keeps unequal-stop shares nonnegative and budget balanced", () => {
    const s = splitFare(50001, [
      trip("a"),
      trip("b", { destination: "gandhi" }),
      trip("c", { destination: "sitapura" }),
    ]);
    expect(s.allocations[1].paise).toBeLessThan(s.allocations[0].paise);
    expect(s.allocations.reduce((sum, a) => sum + a.paise, 0)).toBe(50001);
  });
  it("changed actual fare recalculates all shares", () => {
    const ts = [trip("a"), trip("b")];
    expect(splitFare(40001, ts).allocations.map((a) => a.paise)).toEqual([
      20001, 20000,
    ]);
    expect(splitFare(50003, ts).allocations.map((a) => a.paise)).toEqual([
      25002, 25001,
    ]);
  });
  it("uses seats in the distance contribution", () =>
    expect(
      splitFare(30000, [trip("a", { seats: 2 }), trip("b")]).allocations.map(
        (a) => a.paise,
      ),
    ).toEqual([20000, 10000]));
  it("uses integer illustrative scenario fare", () =>
    expect(scenarioFare(250)).toBe(6450));
  it("exhaustively preserves budget and feasible caps across small inputs", () => {
    for (let total = 0; total < 100; total++)
      for (let cap = 0; cap < 10; cap++) {
        const parts = allocatePaise(total, [3, 1, 8], [cap, 80, 80]);
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
        expect(parts[0]).toBeLessThanOrEqual(cap);
        expect(parts.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
      }
  });
});
