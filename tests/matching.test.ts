import { describe, it, expect } from "vitest";
import {
  shortestPath,
  directedOverlap,
  edges,
  hubs,
} from "../src/domain/graph";
import { evaluateGroup, recommend, formGroups } from "../src/domain/matching";
import { generateScenario, benchmark } from "../src/domain/simulation";
import { trip, now } from "./fixtures";
const a = () => trip("a"),
  b = (p: Parameters<typeof trip>[1] = {}) => trip("b", p);
describe("directed seeded corridor graph", () => {
  it.each(hubs.map((h) => [h.id]))(
    "routes from %s to every hub with consistent edge totals",
    (from) => {
      for (const to of hubs) {
        const p = shortestPath(from, to.id)!;
        expect(p).not.toBeNull();
        expect(p.hubs[0]).toBe(from);
        expect(p.hubs.at(-1)).toBe(to.id);
        expect(
          p.edges.reduce(
            (s, id) => s + edges.find((e) => e.id === id)!.meters,
            0,
          ),
        ).toBe(p.meters);
      }
    },
  );
  it("returns null for unknown hubs", () =>
    expect(shortestPath("nowhere", "jecrc")).toBeNull());
  it("handles identical endpoints", () =>
    expect(shortestPath("jecrc", "jecrc")!.meters).toBe(0));
  it("cannot traverse disconnected custom edges", () =>
    expect(shortestPath("junction", "jecrc", [])).toBeNull());
  it("has zero reverse directed overlap", () =>
    expect(
      directedOverlap(
        shortestPath("junction", "jecrc")!,
        shortestPath("jecrc", "junction")!,
      ),
    ).toBe(0));
  it("has full ordered overlap on a shared subsection", () =>
    expect(
      directedOverlap(
        shortestPath("junction", "jecrc")!,
        shortestPath("gandhi", "sitapura")!,
      ),
    ).toBe(1));
});
describe("hard constraints outrank score", () => {
  const cases: [string, Parameters<typeof trip>[1]][] = [
    ["duplicate owner", { ownerId: "user-a" }],
    ["not adult", { adult: false }],
    ["no sharing consent", { sharing: false }],
    ["cancelled", { status: "cancelled" }],
    ["committed", { status: "committed" }],
    ["completed", { status: "completed" }],
    ["expired", { expires: now }],
    ["past departure", { latest: now - 1 }],
    ["other community", { communityId: "other" }],
    ["real vs synthetic", { synthetic: false }],
    ["reverse direction", { origin: "jecrc", destination: "junction" }],
    ["different branch", { origin: "airport", destination: "malviya" }],
    [
      "no overlapping window",
      { earliest: now + 70 * 60000, latest: now + 90 * 60000 },
    ],
    [
      "wait cap",
      { earliest: now + 31 * 60000, latest: now + 40 * 60000, maxWait: 0 },
    ],
    ["missing route", { origin: "missing" }],
    [
      "same origin destination",
      { origin: "junction", destination: "junction" },
    ],
  ];
  it.each(cases)("rejects %s", (_, override) =>
    expect(evaluateGroup([a(), b(override)], { now }).plan).toBeNull(),
  );
  it("rejects when neither passenger can walk to the other hub", () =>
    expect(
      evaluateGroup(
        [trip("a", { maxWalk: 0 }), b({ origin: "gate", maxWalk: 0 })],
        { now },
      ).plan,
    ).toBeNull());
  it("rejects insufficient collective solo quotes", () =>
    expect(
      evaluateGroup([trip("a", { soloPaise: 100 }), b({ soloPaise: 100 })], {
        now,
      }).plan,
    ).toBeNull());
  it("can allocate zero to a zero solo cap when the other cap covers the fare", () => {
    const p = evaluateGroup([a(), b({ soloPaise: 0 })], { now }).plan!;
    expect(p.allocations[1].paise).toBe(0);
    expect(p.allocations[0].paise).toBe(p.farePaise);
  });
  it("matches identical valid trips", () =>
    expect(evaluateGroup([a(), b()], { now }).plan?.beneficial).toBe(true));
  it("rejects fewer than two", () =>
    expect(evaluateGroup([a()], { now }).plan).toBeNull());
  it("rejects five people", () =>
    expect(
      evaluateGroup(
        ["a", "b", "c", "d", "e"].map((x) => trip(x)),
        { now },
      ).plan,
    ).toBeNull());
  it("checks total passenger seats, including booking member", () =>
    expect(
      evaluateGroup([trip("a", { seats: 3 }), b({ seats: 2 })], { now }).reason,
    ).toContain("capacity"));
  it("allows exactly four small-bag passengers", () =>
    expect(
      evaluateGroup(
        ["a", "b", "c", "d"].map((x) => trip(x)),
        { now },
      ).plan?.trips,
    ).toHaveLength(4));
  it("rejects excess luggage even within seat cap", () =>
    expect(
      evaluateGroup(
        [trip("a", { luggage: "large", seats: 2 }), b({ luggage: "medium" })],
        { now },
      ).reason,
    ).toContain("Luggage"));
  it("enforces blocks in either direction", () => {
    for (const blocks of [[["user-a", "user-b"]], [["user-b", "user-a"]]] as [
      string,
      string,
    ][][])
      expect(evaluateGroup([a(), b()], { now, blocks }).plan).toBeNull();
  });
  it("requires self-declared woman for every women-only member", () =>
    expect(
      evaluateGroup([trip("a", { womenOnly: true }), b({ gender: "man" })], {
        now,
      }).plan,
    ).toBeNull());
  it("accepts mutually compatible women-only preferences", () =>
    expect(
      evaluateGroup([trip("a", { womenOnly: true }), b()], { now }).plan,
    ).not.toBeNull());
  it("rejects conflicting provider preferences", () =>
    expect(
      evaluateGroup([trip("a", { provider: "uber" }), b({ provider: "ola" })], {
        now,
      }).plan,
    ).toBeNull());
  it("allows flexible provider preference", () =>
    expect(
      evaluateGroup([trip("a", { provider: "uber" }), b()], { now }).plan,
    ).not.toBeNull());
  it("accepts staggered intermediate dropoffs without detour", () => {
    const p = evaluateGroup(
      [
        trip("a", { origin: "jecrc", destination: "junction", maxDetour: 0 }),
        b({ origin: "jecrc", destination: "sitapura", maxDetour: 0 }),
        trip("c", { origin: "jecrc", destination: "gandhi", maxDetour: 0 }),
      ],
      { now },
    ).plan!;
    expect(p).not.toBeNull();
    expect(p.maxDetour).toBe(0);
    expect(p.allocations.reduce((s, a) => s + a.paise, 0)).toBe(p.farePaise);
  });
  it("accounts for walking readiness inside wait cap", () =>
    expect(
      evaluateGroup(
        [
          trip("a", { maxWalk: 0, maxWait: 0 }),
          b({ origin: "gate", maxWait: 0 }),
        ],
        { now },
      ).plan,
    ).toBeNull());
  it("allows nearby public hubs when all walking and wait limits pass", () => {
    const p = evaluateGroup([a(), b({ origin: "gate" })], { now }).plan;
    expect(p).not.toBeNull();
    expect(p!.maxWalk).toBeLessThanOrEqual(500);
  });
  it("returns only departure options inside every hard window", () => {
    const p = evaluateGroup(
      [a(), b({ earliest: now + 12 * 60000, maxWait: 5 })],
      { now },
    ).plan!;
    for (const d of p.departureOptions)
      for (const t of p.trips) {
        expect(d).toBeGreaterThanOrEqual(t.earliest);
        expect(d).toBeLessThanOrEqual(
          Math.min(t.latest, t.earliest + t.maxWait * 60000),
        );
      }
  });
  it("finds triple economic benefit when a pair alone cannot fit solo caps", () => {
    const ts = ["a", "b", "c"].map((x) => trip(x, { soloPaise: 21000 }));
    expect(evaluateGroup(ts.slice(0, 2), { now }).plan).toBeNull();
    expect(recommend(ts[0], ts, { now })[0]?.trips).toHaveLength(3);
  });
  it("deterministically ranks ties irrespective of input order", () => {
    const ts = ["a", "b", "c", "d"].map((x) => trip(x));
    const ids = (input: typeof ts) =>
      recommend(ts[0], input, { now }).map((p) =>
        p.trips
          .map((t) => t.id)
          .sort()
          .join(),
      );
    expect(ids(ts)).toEqual(ids([...ts].reverse()));
  });
  it("has an honest empty result", () =>
    expect(recommend(a(), [a()], { now })).toEqual([]));
  it("never assigns an owner twice across proposed benchmark groups", () => {
    const ts = generateScenario(50, 42, now);
    for (const mode of ["baseline", "optimizer"] as const) {
      const groups = formGroups(ts, { now }, mode);
      const ids = groups.flatMap((p) => p.trips.map((t) => t.ownerId));
      expect(new Set(ids).size).toBe(ids.length);
      for (const p of groups)
        expect(evaluateGroup(p.trips, { now }).plan).not.toBeNull();
    }
  });
  it("reproduces fixed input requests exactly", () =>
    expect(generateScenario(50, 7, now)).toEqual(generateScenario(50, 7, now)));
  it("changes arrivals only explicitly in a delay scenario", () => {
    const normal = generateScenario(25, 7, now),
      delayed = generateScenario(25, 7, now, "delay");
    normal.forEach((t, i) =>
      expect(delayed[i].earliest - t.earliest).toBe(
        i % 5 === 0 ? 20 * 60000 : 0,
      ),
    );
  });
  it("removes cancelled requests from eligibility for both algorithms", () => {
    const r = benchmark(25, 7, now, "cancellation");
    expect(r.baseline.eligible).toBe(r.optimizer.eligible);
    expect(r.baseline.eligible).toBe(21);
    expect(r.baseline.violations + r.optimizer.violations).toBe(0);
  });
});

describe("pinned group terms", () => {
  it("rejects a fixed departure outside any rider wait limit", () => {
    const ts = [trip("a"), trip("b")];
    expect(
      evaluateGroup(ts, { now, departure: now + 31 * 60000 }).plan,
    ).toBeNull();
  });
  it("checks readiness at the agreed pickup without silently changing it", () => {
    const ts = [
      trip("a", { maxWalk: 500 }),
      trip("b", { origin: "gate", maxWalk: 0 }),
    ];
    const p = evaluateGroup(ts, { now }).plan!;
    expect(p.pickup).toBe("gate");
    expect(
      evaluateGroup(ts, {
        now: p.departure - 60000,
        pickup: p.pickup,
        departure: p.departure,
      }).plan,
    ).toBeNull();
  });
  it("preserves the exact feasible agreed departure and pickup", () => {
    const ts = [trip("a"), trip("b")];
    const p = evaluateGroup(ts, { now }).plan!;
    const pinned = evaluateGroup(ts, {
      now,
      pickup: p.pickup,
      departure: p.departureOptions.at(-1),
    }).plan!;
    expect(pinned.pickup).toBe(p.pickup);
    expect(pinned.departure).toBe(p.departureOptions.at(-1));
  });
});
