import { beforeEach, afterAll, describe, it, expect, vi } from "vitest";
vi.hoisted(() => {
  process.env.DATABASE_PATH = ":memory:";
  process.env.DEMO_MODE = "true";
});
import { seed } from "../src/db/seed";
import { sqlite, db } from "../src/db";
import * as s from "../src/db/schema";
import * as svc from "../src/lib/service";
import { hashPassword, verifyPassword } from "../src/lib/security";
const now = 1_800_000_000_000;
const user = (name = "aarav") => svc.findUser(`demo-${name}`);
function createA() {
  const template = svc.readTrip("seed-trip-1");
  return svc.createTrip(user(), { ...template });
}
function group(ids?: string[]) {
  const a = createA();
  return svc.createGroup(user(), ids ?? [a.id, "seed-trip-1", "seed-trip-3"]);
}
function confirm() {
  const g = group();
  for (const t of g.plan.trips)
    svc.acceptGroup(svc.findUser(t.ownerId), g.id, g.version);
  return svc.groupRoom(user(), g.id).group;
}
function book() {
  const g = confirm();
  const host = svc.findUser(g.hostId);
  svc.transition(host, g.id, { version: g.version, status: "BOOKING_PENDING" });
  return svc.transition(host, g.id, {
    version: g.version,
    status: "BOOKED_SELF_REPORTED",
  });
}
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  for (const table of [
    "events",
    "runs",
    "messages",
    "notifications",
    "blocks",
    "reports",
    "members",
    "groups",
    "trips",
    "sessions",
    "users",
  ])
    sqlite.exec(`DELETE FROM ${table}`);
  seed(false, now);
});
afterAll(() => {
  vi.useRealTimers();
  sqlite.close();
});
describe("persisted trips, identity and authorization", () => {
  it("hashes and validates passwords without storing plain text", () => {
    const hash = hashPassword("good-password");
    expect(hash).not.toContain("good-password");
    expect(verifyPassword("good-password", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });
  it("stores a hashed server session token", () => {
    const token = svc.demoSession(user().id);
    expect(svc.authenticate(token)?.id).toBe(user().id);
    expect(db.select().from(s.sessions).all()[0].token).not.toBe(token);
    svc.signOut(token);
    expect(svc.authenticate(token)).toBeNull();
  });
  it("never returns a password in user state", () =>
    expect(svc.state(user()).user).not.toHaveProperty("password"));
  it("requires configured demo mode", () => {
    process.env.DEMO_MODE = "false";
    expect(() => svc.demoSession("demo-aarav")).toThrow("DEMO_MODE");
    process.env.DEMO_MODE = "true";
  });
  it("blocks synthetic sessions in production", () => {
    const token = svc.demoSession("demo-aarav");
    const env = process.env.NODE_ENV;
    vi.stubEnv("NODE_ENV", "production");
    expect(svc.authenticate(token)).toBeNull();
    vi.stubEnv("NODE_ENV", env);
  });
  it("persists a created request and returns computed recommendations", () => {
    const a = createA();
    expect(svc.readTrip(a.id)).toEqual(a);
    expect(svc.getMatches(user()).plans.length).toBeGreaterThan(0);
  });
  it("forbids a second active request", () => {
    createA();
    expect(() => createA()).toThrow("already have");
  });
  it("forbids another user editing a trip", () => {
    const a = createA();
    expect(() => svc.createTrip(user("meera"), { ...a }, a.id)).toThrow(
      "cannot edit",
    );
  });
  it("forbids another user cancelling a trip", () => {
    const a = createA();
    expect(() => svc.cancelTrip(user("meera"), a.id)).toThrow("cannot cancel");
  });
  it("edits its own active request with route version increment", () => {
    const a = createA();
    const edit = svc.createTrip(user(), { ...a, maxWait: 10 }, a.id);
    expect(edit.routeVersion).toBe(2);
    expect(edit.maxWait).toBe(10);
  });
  it("blocks real/demo cross-community invitations and discovery", () => {
    const token = svc.register({
      name: "Local Adult",
      email: "adult@example.test",
      password: "strong-pass-123",
      adult: true,
      sharing: true,
      gender: "unspecified",
    });
    const real = svc.authenticate(token)!;
    expect(svc.state(real).matches).toHaveLength(0);
    expect(() => svc.createGroup(real, ["seed-trip-1", "seed-trip-3"])).toThrow(
      "own active",
    );
  });
  it("withdrawal excludes requests from matching", () => {
    createA();
    svc.profile(user(), { name: user().name, gender: "man", sharing: false });
    expect(svc.getMatches(svc.findUser(user().id)).plans).toHaveLength(0);
  });
  it("records a deletion review request", () => {
    svc.deleteRequest(user());
    expect(db.select().from(s.reports).all()[0].body).toContain("deletion");
  });
});
describe("atomic consent, cancellation and booking lifecycle", () => {
  it("does not automatically accept any invitation", () => {
    const g = group();
    expect(g.status).toBe("ACCEPTING");
    expect(
      svc.groupRoom(user(), g.id).members.every((m) => m.acceptedVersion === 0),
    ).toBe(true);
    expect(svc.groupRoom(user(), g.id).group.plan.pickup).toBe("");
    expect(svc.groupRoom(user(), g.id).group.plan.path.hubs).toEqual([]);
    expect(svc.groupRoom(user(), g.id).group.plan.path.edges).toEqual([]);
  });
  it("reveals meeting point only after every member accepts", () => {
    const g = group();
    svc.acceptGroup(user(), g.id, 1);
    expect(svc.groupRoom(user(), g.id).group.status).toBe("ACCEPTING");
    svc.acceptGroup(user("meera"), g.id, 1);
    expect(svc.groupRoom(user(), g.id).group.status).toBe("ACCEPTING");
    svc.acceptGroup(user("ananya"), g.id, 1);
    expect(svc.groupRoom(user(), g.id).group.status).toBe("CONFIRMED");
    expect(svc.groupRoom(user(), g.id).group.plan.pickup).toBeTruthy();
  });
  it("rejects stale consent versions", () => {
    const g = group();
    expect(() => svc.acceptGroup(user(), g.id, 2)).toThrow(
      "terms have changed",
    );
  });
  it("makes repeat acceptance idempotent", () => {
    const g = group();
    svc.acceptGroup(user(), g.id, 1);
    svc.acceptGroup(user(), g.id, 1);
    expect(
      svc.groupRoom(user(), g.id).events.filter((e) => e.kind === "ACCEPTED"),
    ).toHaveLength(1);
  });
  it("reserves pending members against duplicate group creation", () => {
    const g = group();
    expect(() =>
      svc.createGroup(
        user(),
        g.plan.trips.map((t) => t.id),
      ),
    ).toThrow("already has");
    expect(
      db
        .select()
        .from(s.members)
        .all()
        .filter((m) => m.active),
    ).toHaveLength(3);
  });
  it("backs reservations with a database unique constraint", () => {
    const g = group();
    expect(() =>
      sqlite
        .prepare(
          "INSERT INTO members(group_id,user_id,trip_id,active) VALUES(?,?,?,1)",
        )
        .run(g.id, "demo-aarav", "seed-trip-2"),
    ).toThrow();
  });
  it("enforces member-only room access", () => {
    const g = group();
    expect(() => svc.groupRoom(user("kabir"), g.id)).toThrow("access denied");
  });
  it("prevents a nonmember accepting terms", () => {
    const g = group();
    expect(() => svc.acceptGroup(user("kabir"), g.id, 1)).toThrow("access");
  });
  it("forbids booking before confirmation", () => {
    const g = group();
    expect(() =>
      svc.transition(svc.findUser(g.hostId), g.id, {
        version: 1,
        status: "BOOKING_PENDING",
      }),
    ).toThrow("Invalid lifecycle");
  });
  it("forbids a non-host advancing booking", () => {
    const g = confirm();
    expect(() =>
      svc.transition(
        svc.findUser(g.plan.trips.find((t) => t.ownerId !== g.hostId)!.ownerId),
        g.id,
        { version: 1, status: "BOOKING_PENDING" },
      ),
    ).toThrow("nominated");
  });
  it("requires fresh approval and budget-balanced shares on dropout", () => {
    const g = confirm();
    const before = g.plan.allocations;
    svc.leaveGroup(user("ananya"), g.id);
    const after = svc.groupRoom(user(), g.id);
    expect(after.group.version).toBe(2);
    expect(after.group.status).toBe("ACCEPTING");
    expect(after.members).toHaveLength(2);
    expect(after.members.every((m) => m.acceptedVersion === 0)).toBe(true);
    expect(after.group.plan.allocations).not.toEqual(before);
    expect(after.group.plan.allocations.reduce((s, a) => s + a.paise, 0)).toBe(
      after.group.plan.farePaise,
    );
    expect(() => svc.acceptGroup(user(), g.id, 1)).toThrow(
      "terms have changed",
    );
  });
  it("invalidates every approval when inviting a replacement", () => {
    const g = group();
    svc.acceptGroup(user(), g.id, 1);
    const changed = svc.replaceMember(user(), g.id, "seed-trip-2");
    expect(changed.version).toBe(2);
    expect(svc.groupRoom(user(), g.id).members).toHaveLength(4);
    expect(
      svc.groupRoom(user(), g.id).members.every((m) => m.acceptedVersion === 0),
    ).toBe(true);
  });
  it("releases a two-person group when one passenger leaves", () => {
    const a = createA();
    const g = svc.createGroup(user(), [a.id, "seed-trip-1"]);
    svc.leaveGroup(user(), g.id);
    expect(
      db
        .select()
        .from(s.members)
        .all()
        .filter((m) => m.active),
    ).toHaveLength(0);
    expect(svc.readTrip("seed-trip-1").status).toBe("active");
  });
  it("cancelling a request removes it and recomputes survivors", () => {
    const g = group();
    svc.cancelTrip(
      user(),
      g.plan.trips.find((t) => t.ownerId === user().id)!.id,
    );
    expect(svc.state(user()).trips[0].status).toBe("cancelled");
    expect(svc.groupRoom(user("meera"), g.id).group.version).toBe(2);
  });
  it("blocks passenger changes after self-reported booking", () => {
    const g = book();
    expect(() => svc.leaveGroup(user(), g.id)).toThrow("After booking");
  });
  it("forbids stale booking versions", () => {
    const g = confirm();
    expect(() =>
      svc.transition(svc.findUser(g.hostId), g.id, {
        version: 2,
        status: "BOOKING_PENDING",
      }),
    ).toThrow("Stale");
  });
  it("honors synthetic provider outage", () => {
    const g = confirm(),
      host = svc.findUser(g.hostId);
    svc.transition(host, g.id, { version: 1, status: "BOOKING_PENDING" });
    svc.setOutage(user(), true);
    expect(() =>
      svc.transition(host, g.id, {
        version: 1,
        status: "BOOKED_SELF_REPORTED",
      }),
    ).toThrow("outage");
  });
  it("expires pending groups, releases reservations and rejects old offers", () => {
    const g = group();
    vi.setSystemTime(g.plan.departure + 1);
    svc.state(user());
    expect(
      db
        .select()
        .from(s.members)
        .all()
        .some((m) => m.active),
    ).toBe(false);
    expect(() => svc.acceptGroup(user(), g.id, 1)).toThrow();
  });
  it("simultaneous acceptance commands serialize without early confirmation", async () => {
    const g = group();
    await Promise.all(
      g.plan.trips.map((t) =>
        Promise.resolve().then(() =>
          svc.acceptGroup(svc.findUser(t.ownerId), g.id, 1),
        ),
      ),
    );
    expect(svc.groupRoom(user(), g.id).group.status).toBe("CONFIRMED");
    expect(
      new Set(
        db
          .select()
          .from(s.members)
          .all()
          .filter((m) => m.active)
          .map((m) => m.userId),
      ).size,
    ).toBe(3);
  });
});
describe("actual fare, settlement and moderation", () => {
  it("forbids actual fare before booking", () => {
    const g = group();
    expect(() => svc.updateFare(user(), g.id, 64025, 1)).toThrow(
      "after the external booking",
    );
  });
  it("recalculates odd actual paise and clears all fare approvals", () => {
    const g = book();
    svc.updateFare(user(), g.id, 64025, 1);
    const room = svc.groupRoom(user(), g.id);
    expect(room.group.plan.allocations.reduce((s, a) => s + a.paise, 0)).toBe(
      64025,
    );
    expect(room.members.every((m) => m.fareAcceptedVersion === 0)).toBe(true);
    expect(room.members.every((m) => !m.paid)).toBe(true);
  });
  it("forbids settlement without every current fare review", () => {
    const g = book();
    svc.updateFare(user(), g.id, 64025, 1);
    svc.reviewFare(user(), g.id, 2);
    expect(() => svc.markPaid(user(), g.id, true)).toThrow("All members");
  });
  it("allows only own self-reported settlement after all consent", () => {
    const g = book();
    svc.updateFare(user(), g.id, 64025, 1);
    for (const p of g.plan.trips)
      svc.reviewFare(svc.findUser(p.ownerId), g.id, 2);
    svc.markPaid(user(), g.id, true);
    const room = svc.groupRoom(user(), g.id);
    expect(room.members.find((m) => m.userId === user().id)!.paid).toBe(true);
    expect(room.members.filter((m) => m.paid)).toHaveLength(1);
  });
  it("rejects stale fare review", () => {
    const g = book();
    svc.updateFare(user(), g.id, 64025, 1);
    expect(() => svc.reviewFare(user(), g.id, 1)).toThrow("Fare changed");
  });
  it("persists group messages and prevents unrelated reads/writes", () => {
    const g = group();
    svc.sendMessage(user(), g.id, "Hello group");
    expect(svc.groupRoom(user(), g.id).messages[0].body).toBe("Hello group");
    expect(() => svc.sendMessage(user("kabir"), g.id, "Uninvited")).toThrow(
      "access",
    );
  });
  it("block removes future pairing and records a report", () => {
    createA();
    svc.report(user(), "Unwanted contact.", "demo-meera", true);
    expect(
      svc
        .getMatches(user())
        .plans.every((p) => !p.trips.some((t) => t.ownerId === "demo-meera")),
    ).toBe(true);
    expect(db.select().from(s.reports).all()).toHaveLength(1);
  });
  it("scopes report triage to the server-side administrator role", () => {
    svc.report(user(), "A general concern.");
    expect(() => svc.adminReports(user())).toThrow("Administrator");
    const reports = svc.adminReports(user("admin"));
    svc.resolveReport(user("admin"), reports[0].id);
    expect(svc.adminReports(user("admin"))[0].status).toBe("reviewed");
  });
  it("completed trip releases active seats and retains authorized fare history", () => {
    const g = book(),
      host = svc.findUser(g.hostId);
    svc.transition(host, g.id, {
      version: 1,
      status: "IN_PROGRESS_SELF_REPORTED",
    });
    svc.transition(host, g.id, {
      version: 1,
      status: "COMPLETED_SELF_REPORTED",
    });
    expect(
      db
        .select()
        .from(s.members)
        .all()
        .some((m) => m.active),
    ).toBe(false);
    expect(svc.groupRoom(user(), g.id).group.status).toBe(
      "COMPLETED_SELF_REPORTED",
    );
    svc.updateFare(user(), g.id, 75001, 1);
    expect(svc.groupRoom(user(), g.id).group.actualPaise).toBe(75001);
  });
  it("deterministically resets the synthetic requests at a fixed clock", () => {
    const before = svc.readTrip("seed-trip-1");
    createA();
    seed(true, now);
    expect(svc.readTrip("seed-trip-1")).toEqual(before);
    expect(svc.state(user()).trips).toHaveLength(0);
  });
});

describe("real local account credentials and session boundaries", () => {
  it("authenticates the stored password and rejects a wrong one", () => {
    const input = {
      name: "Local Traveller",
      email: "login@example.test",
      password: "ten-letters-password",
      adult: true as const,
      sharing: true as const,
      gender: "unspecified" as const,
    };
    svc.register(input);
    const token = svc.signIn(input.email, input.password);
    expect(svc.authenticate(token)?.email).toBe(input.email);
    expect(() => svc.signIn(input.email, "wrong")).toThrow("incorrect");
  });
  it("expires opaque sessions after seven days", () => {
    const token = svc.demoSession(user().id);
    vi.setSystemTime(now + 8 * 86400000);
    expect(svc.authenticate(token)).toBeNull();
  });
});

describe("removed passenger privacy after later completion", () => {
  it("does not restore an ex-member access when the remaining group completes", () => {
    const g = group();
    svc.leaveGroup(user(), g.id);
    const current = svc.groupRoom(user("meera"), g.id).group;
    for (const t of current.plan.trips)
      svc.acceptGroup(svc.findUser(t.ownerId), g.id, current.version);
    const host = svc.findUser(current.hostId);
    for (const status of [
      "BOOKING_PENDING",
      "BOOKED_SELF_REPORTED",
      "IN_PROGRESS_SELF_REPORTED",
      "COMPLETED_SELF_REPORTED",
    ] as const)
      svc.transition(host, g.id, { version: current.version, status });
    expect(() => svc.groupRoom(user(), g.id)).toThrow("access denied");
    expect(svc.state(user()).groups.some((x) => x.id === g.id)).toBe(false);
  });
});
