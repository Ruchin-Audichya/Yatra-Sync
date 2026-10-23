import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, atomic, sqlite } from "../db";
import * as s from "../db/schema";
import { ensureSeed, personas, seed } from "../db/seed";
import {
  AppError,
  demoEnabled,
  hashPassword,
  newToken,
  rateLimit,
  tokenHash,
  verifyPassword,
} from "./security";
import { tripInput, registerInput } from "./validation";
import { hubs, edges } from "../domain/graph";
import { evaluateGroup, recommend } from "../domain/matching";
import { splitFare } from "../domain/fare";
import { benchmark } from "../domain/simulation";
import type { GroupData, Trip, User, Plan } from "../domain/types";
import type { z } from "zod";
export const check: (
  ok: unknown,
  message: string,
  status?: number,
) => asserts ok = (ok, message, status = 400) => {
  if (!ok) throw new AppError(message, status);
};
const id = () => randomUUID();
function userRow(row: typeof s.users.$inferSelect): User {
  const { password: discard, ...safe } = row;
  void discard;
  return {
    ...safe,
    gender: row.gender as User["gender"],
    role: row.role as User["role"],
  };
}
export function findUser(userId: string) {
  const row = db.select().from(s.users).where(eq(s.users.id, userId)).get();
  check(row, "Account unavailable.", 401);
  const { password: _, ...safe } = row;
  void _;
  return userRow({ ...safe, password: "" });
}
export function authenticate(token: string | undefined): User | null {
  if (!token) return null;
  const session = db
    .select()
    .from(s.sessions)
    .where(eq(s.sessions.token, tokenHash(token)))
    .get();
  if (!session || session.expires <= Date.now()) return null;
  const user = findUser(session.userId);
  if (user.synthetic && !demoEnabled()) return null;
  return user;
}
export function newSession(userId: string) {
  const token = newToken();
  db.insert(s.sessions)
    .values({
      token: tokenHash(token),
      userId,
      expires: Date.now() + 7 * 86400000,
    })
    .run();
  return token;
}
export function signIn(email: string, password: string) {
  const row = db
    .select()
    .from(s.users)
    .where(eq(s.users.email, email.toLowerCase()))
    .get();
  check(
    row && verifyPassword(password, row.password),
    "Email or password incorrect.",
    401,
  );
  check(
    !row.synthetic || demoEnabled(),
    "Synthetic accounts are disabled.",
    403,
  );
  return newSession(row.id);
}
export function register(input: z.infer<typeof registerInput>) {
  return atomic(() => {
    check(
      !db
        .select()
        .from(s.users)
        .where(eq(s.users.email, input.email.toLowerCase()))
        .get(),
      "This email is already registered.",
    );
    const userId = id();
    db.insert(s.users)
      .values({
        id: userId,
        name: input.name,
        email: input.email.toLowerCase(),
        password: hashPassword(input.password),
        communityId: "local-community",
        role: "traveller",
        synthetic: false,
        gender: input.gender,
        adult: true,
        sharing: true,
      })
      .run();
    event(
      null,
      userId,
      "CONSENT",
      "Adult, community discovery and sharing consent granted.",
    );
    return newSession(userId);
  });
}
export function demoSession(userId: string) {
  check(
    demoEnabled(),
    "Demo personas require DEMO_MODE=true in development.",
    403,
  );
  ensureSeed();
  check(
    personas.some((p) => p.id === userId),
    "Unknown demo persona.",
  );
  return newSession(userId);
}
export function signOut(token: string) {
  db.delete(s.sessions)
    .where(eq(s.sessions.token, tokenHash(token)))
    .run();
}
function event(
  groupId: string | null,
  userId: string | null,
  kind: string,
  body: string,
) {
  db.insert(s.events)
    .values({ id: id(), groupId, userId, kind, body, created: Date.now() })
    .run();
}
function notify(userId: string, body: string, href = "/app/notifications") {
  db.insert(s.notifications)
    .values({ id: id(), userId, body, href, created: Date.now(), read: false })
    .run();
}
export function readTrip(tripId: string) {
  const row = db.select().from(s.trips).where(eq(s.trips.id, tripId)).get();
  check(row, "Trip not found.", 404);
  return JSON.parse(row.data) as Trip;
}
function saveTrip(trip: Trip) {
  db.insert(s.trips)
    .values({
      id: trip.id,
      ownerId: trip.ownerId,
      communityId: trip.communityId,
      status: trip.status,
      data: JSON.stringify(trip),
    })
    .onConflictDoUpdate({
      target: s.trips.id,
      set: { status: trip.status, data: JSON.stringify(trip) },
    })
    .run();
}
function readGroup(groupId: string) {
  const row = db.select().from(s.groups).where(eq(s.groups.id, groupId)).get();
  check(row, "Group not found.", 404);
  return JSON.parse(row.data) as GroupData;
}
function saveGroup(group: GroupData) {
  db.insert(s.groups)
    .values({ id: group.id, data: JSON.stringify(group) })
    .onConflictDoUpdate({
      target: s.groups.id,
      set: { data: JSON.stringify(group) },
    })
    .run();
}
const allMembers = (groupId: string) =>
  db
    .select()
    .from(s.members)
    .where(and(eq(s.members.groupId, groupId), eq(s.members.active, true)))
    .all();
function requireMember(user: User, groupId: string) {
  const group = readGroup(groupId);
  const member = allMembers(groupId).find((m) => m.userId === user.id);
  check(
    member && group.communityId === user.communityId,
    "You do not have access to this group.",
    403,
  );
  return { group, member, members: allMembers(groupId) };
}
const blockPairs = () =>
  db
    .select()
    .from(s.blocks)
    .all()
    .map((b) => [b.userId, b.targetId] as [string, string]);
function available(user: User) {
  return db
    .select()
    .from(s.trips)
    .where(
      and(
        eq(s.trips.communityId, user.communityId),
        eq(s.trips.status, "active"),
      ),
    )
    .all()
    .map((r) => JSON.parse(r.data) as Trip)
    .filter(
      (t) =>
        t.synthetic === user.synthetic &&
        !db
          .select()
          .from(s.members)
          .where(
            and(eq(s.members.userId, t.ownerId), eq(s.members.active, true)),
          )
          .get(),
    );
}
export function createTrip(
  user: User,
  input: z.infer<typeof tripInput>,
  tripId?: string,
) {
  return atomic(() => {
    check(
      user.adult && user.sharing,
      "Enable adult and sharing consent in your profile.",
    );
    check(
      input.earliest >= Date.now() - 60000 &&
        input.latest <= Date.now() + 30 * 86400000,
      "Choose a departure within the next 30 days.",
    );
    check(
      !input.womenOnly || user.gender === "woman",
      "Women-only matching requires a voluntary woman self-declaration.",
    );
    const own = db
      .select()
      .from(s.trips)
      .where(eq(s.trips.ownerId, user.id))
      .all()
      .map((r) => JSON.parse(r.data) as Trip);
    let current: Trip | undefined;
    if (tripId) {
      current = readTrip(tripId);
      check(current.ownerId === user.id, "You cannot edit this trip.", 403);
      check(
        current.status === "active",
        "Leave the pending group before editing.",
      );
    }
    check(
      !own.some(
        (t) =>
          t.id !== tripId &&
          ["active", "committed"].includes(t.status) &&
          t.expires > Date.now(),
      ),
      "You already have an active request. Edit or cancel it first.",
    );
    const trip: Trip = {
      ...input,
      id: tripId ?? id(),
      ownerId: user.id,
      name: user.name,
      communityId: user.communityId,
      gender: user.gender,
      sharing: user.sharing,
      adult: user.adult,
      status: "active",
      expires: input.latest,
      created: current?.created ?? Date.now(),
      synthetic: user.synthetic,
      routeVersion: (current?.routeVersion ?? 0) + 1,
      visibility: "community",
    };
    saveTrip(trip);
    event(null, user.id, tripId ? "TRIP_UPDATED" : "TRIP_CREATED", trip.id);
    return trip;
  });
}
function release(group: GroupData, status: GroupData["status"]) {
  for (const m of allMembers(group.id)) {
    const t = readTrip(m.tripId);
    if (t.status === "committed") saveTrip({ ...t, status: "active" });
    notify(
      m.userId,
      `Group ${status.toLowerCase()}. Your request can be matched again.`,
      `/app/matches`,
    );
  }
  db.update(s.members)
    .set({ active: false, acceptedVersion: 0 })
    .where(eq(s.members.groupId, group.id))
    .run();
  group.status = status;
  group.version++;
  saveGroup(group);
}
function expireGroups() {
  atomic(() => {
    for (const row of db.select().from(s.groups).all()) {
      const g = JSON.parse(row.data) as GroupData;
      if (
        ["ACCEPTING", "CONFIRMED", "BOOKING_PENDING"].includes(g.status) &&
        g.plan.departure < Date.now()
      )
        release(g, "EXPIRED");
    }
  });
}
export function cancelTrip(user: User, tripId: string) {
  return atomic(() => {
    const t = readTrip(tripId);
    check(t.ownerId === user.id, "You cannot cancel this trip.", 403);
    check(
      ["active", "committed"].includes(t.status),
      "This trip is already closed.",
    );
    const member = db
      .select()
      .from(s.members)
      .where(and(eq(s.members.tripId, tripId), eq(s.members.active, true)))
      .get();
    if (member) leaveGroup(user, member.groupId);
    saveTrip({ ...readTrip(tripId), status: "cancelled" });
    event(null, user.id, "TRIP_CANCELLED", tripId);
    return { ok: true };
  });
}
export function getMatches(user: User, tripId?: string) {
  const candidates = available(user);
  const anchor = tripId
    ? readTrip(tripId)
    : candidates.find((t) => t.ownerId === user.id);
  if (!anchor)
    return {
      plans: [],
      trip: null,
      reason:
        "Create an active trip request to discover compatible travellers.",
    };
  check(anchor.ownerId === user.id, "This is not your trip.", 403);
  if (anchor.status !== "active")
    return {
      plans: [],
      trip: anchor,
      reason: "Your request is reserved in a group. Open the group to respond.",
    };
  const plans = recommend(anchor, candidates, {
    now: Date.now(),
    blocks: blockPairs(),
  });
  return {
    plans,
    trip: anchor,
    reason: plans.length
      ? ""
      : "No group satisfies all current direction, time, capacity, preference and fare limits. Try editing your window within your real deadline.",
  };
}
export function createGroup(user: User, tripIds: string[], departure?: number) {
  return atomic(() => {
    check(new Set(tripIds).size === tripIds.length, "Duplicate requests.");
    const trips = tripIds.map(readTrip);
    check(
      trips.some((t) => t.ownerId === user.id),
      "Include your own active request.",
      403,
    );
    check(
      trips.every(
        (t) =>
          t.communityId === user.communityId && t.synthetic === user.synthetic,
      ),
      "Community boundary violation.",
      403,
    );
    for (const t of trips)
      check(
        !db
          .select()
          .from(s.members)
          .where(
            and(eq(s.members.userId, t.ownerId), eq(s.members.active, true)),
          )
          .get(),
        "A traveller already has a pending or confirmed group. Refresh matches.",
        409,
      );
    const result = evaluateGroup(trips, {
      now: Date.now(),
      blocks: blockPairs(),
    });
    check(result.plan, result.reason || "No valid group.", 409);
    const plan = result.plan;
    if (departure !== undefined) {
      check(
        plan.departureOptions.includes(departure),
        "Departure suggestion expired. Refresh.",
        409,
      );
      plan.departure = departure;
      plan.maxWait = Math.max(
        ...trips.map((t) => (departure - t.earliest) / 60000),
      );
    }
    const host = trips
      .slice()
      .sort(
        (a, b) => a.created - b.created || a.ownerId.localeCompare(b.ownerId),
      )[0].ownerId;
    const group: GroupData = {
      id: id(),
      hostId: host,
      communityId: user.communityId,
      status: "ACCEPTING",
      version: 1,
      plan,
      actualPaise: null,
      fareVersion: 1,
      reference: "",
      created: Date.now(),
      provider: trips.find((t) => t.provider !== "any")?.provider ?? "uber",
    };
    saveGroup(group);
    for (const t of trips) {
      db.insert(s.members)
        .values({
          groupId: group.id,
          userId: t.ownerId,
          tripId: t.id,
          acceptedVersion: 0,
          fareAcceptedVersion: 0,
          active: true,
          paid: false,
        })
        .run();
      saveTrip({ ...t, status: "committed" });
      notify(
        t.ownerId,
        "A group invitation is ready. Review and accept the current terms.",
        `/app/groups/${group.id}`,
      );
    }
    event(
      group.id,
      user.id,
      "PROPOSED",
      "Group invitation created. No member is automatically accepted.",
    );
    return group;
  });
}
export function acceptGroup(user: User, groupId: string, version: number) {
  return atomic(() => {
    const { group, member } = requireMember(user, groupId);
    check(
      group.version === version,
      "These terms have changed. Review the refreshed group.",
      409,
    );
    check(
      ["ACCEPTING", "CONFIRMED"].includes(group.status),
      "This group is no longer accepting.",
      409,
    );
    check(group.plan.departure > Date.now(), "The departure has expired.", 409);
    if (member.acceptedVersion === version) return group;
    check(user.adult && user.sharing, "Sharing consent is required.");
    const current = group.plan.trips.map((t) => ({
      ...readTrip(t.id),
      status: "active" as const,
    }));
    const result = evaluateGroup(current, {
      now: Date.now(),
      pickup: group.plan.pickup,
      departure: group.plan.departure,
      blocks: blockPairs(),
    });
    check(result.plan, "Group constraints changed. Cancel and re-match.", 409);
    db.update(s.members)
      .set({ acceptedVersion: version, fareAcceptedVersion: group.fareVersion })
      .where(and(eq(s.members.groupId, groupId), eq(s.members.userId, user.id)))
      .run();
    event(
      groupId,
      user.id,
      "ACCEPTED",
      `Accepted current composition, fare method and departure; version ${version}.`,
    );
    if (allMembers(groupId).every((m) => m.acceptedVersion === version)) {
      group.status = "CONFIRMED";
      saveGroup(group);
      for (const m of allMembers(groupId))
        notify(
          m.userId,
          "Everyone accepted. Your group is confirmed.",
          `/app/groups/${groupId}`,
        );
      event(
        groupId,
        user.id,
        "CONFIRMED",
        "All current members affirmatively accepted.",
      );
    }
    return group;
  });
}
export function leaveGroup(user: User, groupId: string) {
  return atomic(() => {
    const { group, member, members } = requireMember(user, groupId);
    check(
      ["ACCEPTING", "CONFIRMED", "BOOKING_PENDING"].includes(group.status),
      "After booking, report a dispute instead of changing passengers.",
    );
    db.update(s.members)
      .set({ active: false, acceptedVersion: 0 })
      .where(and(eq(s.members.groupId, groupId), eq(s.members.userId, user.id)))
      .run();
    saveTrip({ ...readTrip(member.tripId), status: "active" });
    const remaining = members
      .filter((m) => m.userId !== user.id)
      .map((m) => ({ ...readTrip(m.tripId), status: "active" as const }));
    const next = evaluateGroup(remaining, {
      now: Date.now(),
      blocks: blockPairs(),
    }).plan;
    if (next) {
      group.plan = next;
      group.version++;
      group.status = "ACCEPTING";
      group.actualPaise = null;
      group.fareVersion++;
      group.hostId = remaining
        .slice()
        .sort(
          (a, b) => a.created - b.created || a.ownerId.localeCompare(b.ownerId),
        )[0].ownerId;
      db.update(s.members)
        .set({ acceptedVersion: 0, fareAcceptedVersion: 0, paid: false })
        .where(eq(s.members.groupId, groupId))
        .run();
      saveGroup(group);
    } else release(group, "CANCELLED");
    event(
      groupId,
      user.id,
      "MEMBER_LEFT",
      "Passenger left. Prior approvals invalidated; remaining terms recalculated.",
    );
    for (const m of allMembers(groupId))
      notify(
        m.userId,
        "A passenger left. Review new shares and approve again or find a replacement.",
        `/app/groups/${groupId}`,
      );
    return group;
  });
}
export function replaceMember(user: User, groupId: string, tripId: string) {
  return atomic(() => {
    const { group } = requireMember(user, groupId);
    check(
      ["ACCEPTING", "CONFIRMED"].includes(group.status),
      "Replacements only before booking.",
    );
    const t = readTrip(tripId);
    check(
      t.communityId === user.communityId && t.synthetic === user.synthetic,
      "Community boundary violation.",
      403,
    );
    check(
      !db
        .select()
        .from(s.members)
        .where(and(eq(s.members.userId, t.ownerId), eq(s.members.active, true)))
        .get(),
      "Passenger already reserved.",
      409,
    );
    const trips = [
      ...allMembers(groupId).map((m) => ({
        ...readTrip(m.tripId),
        status: "active" as const,
      })),
      t,
    ];
    const result = evaluateGroup(trips, {
      now: Date.now(),
      blocks: blockPairs(),
    });
    check(result.plan, result.reason, 409);
    db.insert(s.members)
      .values({
        groupId,
        userId: t.ownerId,
        tripId: t.id,
        active: true,
        acceptedVersion: 0,
        fareAcceptedVersion: 0,
        paid: false,
      })
      .onConflictDoUpdate({
        target: [s.members.groupId, s.members.userId],
        set: {
          active: true,
          tripId: t.id,
          acceptedVersion: 0,
          fareAcceptedVersion: 0,
          paid: false,
        },
      })
      .run();
    saveTrip({ ...t, status: "committed" });
    group.plan = result.plan;
    group.version++;
    group.fareVersion++;
    group.actualPaise = null;
    group.status = "ACCEPTING";
    saveGroup(group);
    db.update(s.members)
      .set({ acceptedVersion: 0, fareAcceptedVersion: 0, paid: false })
      .where(eq(s.members.groupId, groupId))
      .run();
    event(
      groupId,
      user.id,
      "REPLACEMENT",
      "Replacement invited. Fresh consent required from every member.",
    );
    for (const m of allMembers(groupId))
      notify(
        m.userId,
        "Group composition changed. Review and accept again.",
        `/app/groups/${groupId}`,
      );
    return group;
  });
}
export function transition(
  user: User,
  groupId: string,
  input: {
    version: number;
    status: GroupData["status"];
    reference?: string;
    provider?: string;
  },
) {
  return atomic(() => {
    const { group, members } = requireMember(user, groupId);
    check(group.version === input.version, "Stale group version.", 409);
    if (input.status === "DISPUTED") {
      check(
        [
          "BOOKING_PENDING",
          "BOOKED_SELF_REPORTED",
          "IN_PROGRESS_SELF_REPORTED",
          "COMPLETED_SELF_REPORTED",
        ].includes(group.status),
        "No booking or ride to dispute.",
      );
      group.status = "DISPUTED";
      saveGroup(group);
      event(
        groupId,
        user.id,
        "DISPUTED",
        "Participant reported a dispute. Contact community moderation.",
      );
      return group;
    }
    check(
      group.hostId === user.id,
      "Only the nominated booking member can advance this stage.",
      403,
    );
    const next: Partial<Record<GroupData["status"], GroupData["status"]>> = {
      CONFIRMED: "BOOKING_PENDING",
      BOOKING_PENDING: "BOOKED_SELF_REPORTED",
      BOOKED_SELF_REPORTED: "IN_PROGRESS_SELF_REPORTED",
      IN_PROGRESS_SELF_REPORTED: "COMPLETED_SELF_REPORTED",
    };
    check(
      next[group.status] === input.status,
      "Invalid lifecycle transition.",
      409,
    );
    check(
      members.every((m) => m.acceptedVersion === group.version),
      "Everyone must accept current group terms.",
    );
    if (input.status === "BOOKED_SELF_REPORTED")
      check(
        db
          .select()
          .from(s.settings)
          .where(eq(s.settings.key, "providerOutage"))
          .get()?.value !== "true",
        "Simulated provider outage: do not claim a booking. Try later.",
        409,
      );
    group.status = input.status;
    if (input.reference) group.reference = input.reference;
    if (input.provider) group.provider = input.provider;
    saveGroup(group);
    event(
      groupId,
      user.id,
      input.status,
      "Manually reported by the booking member; no provider API verification.",
    );
    if (input.status === "COMPLETED_SELF_REPORTED") {
      for (const m of members) {
        saveTrip({ ...readTrip(m.tripId), status: "completed" });
      }
      db.update(s.members)
        .set({ active: false })
        .where(eq(s.members.groupId, groupId))
        .run();
    }
    return group;
  });
}
// Completed groups retain authorized historical membership while releasing active reservations.
function financialMember(user: User, groupId: string) {
  const g = readGroup(groupId);
  const m = db
    .select()
    .from(s.members)
    .where(and(eq(s.members.groupId, groupId), eq(s.members.userId, user.id)))
    .get();
  check(
    m &&
      g.communityId === user.communityId &&
      g.plan.trips.some((t) => t.ownerId === user.id) &&
      (m.active ||
        [
          "COMPLETED_SELF_REPORTED",
          "CANCELLED",
          "EXPIRED",
          "DECLINED",
        ].includes(g.status)),
    "Group access denied.",
    403,
  );
  return {
    group: g,
    member: m,
    members: db
      .select()
      .from(s.members)
      .where(eq(s.members.groupId, groupId))
      .all()
      .filter((x) => g.plan.trips.some((t) => t.ownerId === x.userId)),
  };
}
export function updateFare(
  user: User,
  groupId: string,
  paise: number,
  version: number,
) {
  return atomic(() => {
    const { group } = financialMember(user, groupId);
    check(group.version === version, "Stale group terms.", 409);
    check(
      [
        "BOOKED_SELF_REPORTED",
        "IN_PROGRESS_SELF_REPORTED",
        "COMPLETED_SELF_REPORTED",
      ].includes(group.status),
      "Enter actual fare after the external booking is self-reported.",
    );
    group.actualPaise = paise;
    group.fareVersion++;
    const split = splitFare(paise, group.plan.trips);
    group.plan = { ...group.plan, ...split };
    saveGroup(group);
    db.update(s.members)
      .set({ fareAcceptedVersion: 0, paid: false })
      .where(eq(s.members.groupId, groupId))
      .run();
    event(
      groupId,
      user.id,
      "ACTUAL_FARE",
      `Manually entered ${paise} paise. Every participant must review updated shares.`,
    );
    return group;
  });
}
export function reviewFare(user: User, groupId: string, version: number) {
  return atomic(() => {
    const { group } = financialMember(user, groupId);
    check(
      group.fareVersion === version,
      "Fare changed. Review the current shares.",
      409,
    );
    check(group.actualPaise !== null, "Enter actual fare first.");
    db.update(s.members)
      .set({ fareAcceptedVersion: version })
      .where(and(eq(s.members.groupId, groupId), eq(s.members.userId, user.id)))
      .run();
    event(
      groupId,
      user.id,
      "FARE_ACCEPTED",
      `Accepted actual fare version ${version}.`,
    );
    return { ok: true };
  });
}
export function markPaid(user: User, groupId: string, paid: boolean) {
  return atomic(() => {
    const { group, members } = financialMember(user, groupId);
    check(
      group.actualPaise !== null &&
        members.every((m) => m.fareAcceptedVersion === group.fareVersion),
      "All members must review the actual fare before self-reporting settlement.",
    );
    db.update(s.members)
      .set({ paid })
      .where(and(eq(s.members.groupId, groupId), eq(s.members.userId, user.id)))
      .run();
    event(
      groupId,
      user.id,
      "SETTLEMENT",
      paid
        ? "Self-reported paid. No payment verification."
        : "Self-reported unpaid.",
    );
    return { ok: true };
  });
}
export function groupRoom(user: User, groupId: string) {
  const { group, members } = financialMember(user, groupId);
  const consent =
    members.every((m) => m.acceptedVersion === group.version) &&
    group.status !== "ACCEPTING";
  const replacements = ["ACCEPTING", "CONFIRMED"].includes(group.status)
    ? available(user)
        .filter((t) => !group.plan.trips.some((x) => x.ownerId === t.ownerId))
        .filter(
          (t) =>
            evaluateGroup(
              [
                ...group.plan.trips.map((x) => ({
                  ...x,
                  status: "active" as const,
                })),
                t,
              ],
              { now: Date.now(), blocks: blockPairs() },
            ).plan,
        )
        .map((t) => ({ id: t.id, name: t.name }))
        .slice(0, 4)
    : [];
  return {
    group: {
      ...group,
      plan: {
        ...group.plan,
        pickup: consent ? group.plan.pickup : "",
        path: consent
          ? group.plan.path
          : { ...group.plan.path, hubs: [], edges: [] },
      },
    },
    members: members.map((m) => ({ ...m, name: findUser(m.userId).name })),
    messages: db
      .select()
      .from(s.messages)
      .where(eq(s.messages.groupId, groupId))
      .orderBy(s.messages.created)
      .all()
      .filter(
        (m) =>
          !blockPairs().some(
            ([a, b]) =>
              (a === user.id && b === m.userId) ||
              (b === user.id && a === m.userId),
          ),
      )
      .map((m) => ({ ...m, name: findUser(m.userId).name })),
    events: db
      .select()
      .from(s.events)
      .where(eq(s.events.groupId, groupId))
      .orderBy(desc(s.events.created))
      .limit(20)
      .all(),
    replacements,
  };
}
export function sendMessage(user: User, groupId: string, body: string) {
  const { group, members } = requireMember(user, groupId);
  check(
    !["CANCELLED", "DECLINED", "EXPIRED"].includes(group.status),
    "This group is closed.",
  );
  check(
    !members.some((m) =>
      blockPairs().some(
        ([a, b]) =>
          (a === user.id && b === m.userId) ||
          (b === user.id && a === m.userId),
      ),
    ),
    "Messaging unavailable after a block.",
  );
  rateLimit(`message:${user.id}`, 8);
  db.insert(s.messages)
    .values({ id: id(), groupId, userId: user.id, body, created: Date.now() })
    .run();
  return { ok: true };
}
export function report(
  user: User,
  body: string,
  targetId?: string,
  block = false,
) {
  return atomic(() => {
    if (targetId) {
      const target = findUser(targetId);
      check(
        target.communityId === user.communityId &&
          target.synthetic === user.synthetic &&
          target.id !== user.id,
        "Target is outside your permitted community.",
        403,
      );
    }
    db.insert(s.reports)
      .values({
        id: id(),
        userId: user.id,
        targetId: targetId ?? null,
        body,
        status: "open",
        created: Date.now(),
        communityId: user.communityId,
      })
      .run();
    if (block && targetId) {
      db.insert(s.blocks)
        .values({ userId: user.id, targetId })
        .onConflictDoNothing()
        .run();
      const membership = db
        .select()
        .from(s.members)
        .where(and(eq(s.members.userId, user.id), eq(s.members.active, true)))
        .get();
      if (membership) {
        const g = readGroup(membership.groupId);
        if (
          allMembers(g.id).some((m) => m.userId === targetId) &&
          ["ACCEPTING", "CONFIRMED", "BOOKING_PENDING"].includes(g.status)
        )
          leaveGroup(user, g.id);
      }
    }
    event(null, user.id, "REPORT", "Report submitted for community review.");
    return { ok: true };
  });
}
export function profile(
  user: User,
  input: { name: string; gender: User["gender"]; sharing: boolean },
) {
  return atomic(() => {
    const active = db
      .select()
      .from(s.members)
      .where(and(eq(s.members.userId, user.id), eq(s.members.active, true)))
      .get();
    check(
      !active,
      "Leave or complete your current group before changing matching preferences.",
    );
    db.update(s.users).set(input).where(eq(s.users.id, user.id)).run();
    for (const row of db
      .select()
      .from(s.trips)
      .where(eq(s.trips.ownerId, user.id))
      .all()) {
      const t = JSON.parse(row.data) as Trip;
      if (t.status === "active")
        saveTrip({
          ...t,
          name: input.name,
          gender: input.gender,
          sharing: input.sharing,
        });
    }
    event(
      null,
      user.id,
      "PROFILE_CONSENT",
      input.sharing ? "Sharing consent active." : "Sharing consent withdrawn.",
    );
    return { ok: true };
  });
}
export function deleteRequest(user: User) {
  return report(
    user,
    "Account and personal data deletion requested. Please review retained group records.",
  );
}
export function markNotifications(user: User) {
  db.update(s.notifications)
    .set({ read: true })
    .where(eq(s.notifications.userId, user.id))
    .run();
  return { ok: true };
}
export function adminReports(user: User) {
  check(
    user.role === "demo_admin" && user.synthetic && demoEnabled(),
    "Administrator permission required.",
    403,
  );
  return db
    .select()
    .from(s.reports)
    .where(eq(s.reports.communityId, user.communityId))
    .orderBy(desc(s.reports.created))
    .all();
}
export function resolveReport(user: User, reportId: string) {
  adminReports(user);
  const row = db
    .select()
    .from(s.reports)
    .where(eq(s.reports.id, reportId))
    .get();
  check(row && row.communityId === user.communityId, "Report not found.", 404);
  db.update(s.reports)
    .set({ status: "reviewed" })
    .where(eq(s.reports.id, reportId))
    .run();
  event(null, user.id, "MODERATION", "Report marked reviewed.");
  return { ok: true };
}
export function simulate(
  user: User,
  count: number,
  seedValue: number,
  disruption: "none" | "delay" | "cancellation",
) {
  check(demoEnabled() && user.synthetic, "Synthetic demo only.", 403);
  rateLimit(`bench:${user.id}`, 10);
  const result = benchmark(count, seedValue, Date.now(), disruption);
  db.insert(s.runs)
    .values({
      id: id(),
      userId: user.id,
      data: JSON.stringify(result),
      created: Date.now(),
    })
    .run();
  return result;
}
export function resetDemo(user: User) {
  check(demoEnabled() && user.synthetic, "Synthetic demo only.", 403);
  return seed(true);
}
export function setOutage(user: User, value: boolean) {
  check(demoEnabled() && user.synthetic, "Synthetic demo only.", 403);
  db.insert(s.settings)
    .values({ key: "providerOutage", value: String(value) })
    .onConflictDoUpdate({
      target: s.settings.key,
      set: { value: String(value) },
    })
    .run();
  return { ok: true };
}
export function delayTrip(user: User, minutes: number) {
  check(user.synthetic && demoEnabled(), "Synthetic demo only.", 403);
  const t = available(user).find((t) => t.ownerId === user.id);
  check(t, "You need an active request outside a group.");
  return createTrip(
    user,
    {
      ...t,
      earliest: t.earliest + minutes * 60000,
      latest: t.latest + minutes * 60000,
    },
    t.id,
  );
}
export function state(user: User) {
  expireGroups();
  const ownTrips = db
    .select()
    .from(s.trips)
    .where(eq(s.trips.ownerId, user.id))
    .all()
    .map((r) => JSON.parse(r.data) as Trip)
    .sort((a, b) => b.created - a.created);
  const ownMembers = db
    .select()
    .from(s.members)
    .where(eq(s.members.userId, user.id))
    .all();
  const ownGroups = ownMembers
    .filter(
      (m) =>
        m.active ||
        [
          "COMPLETED_SELF_REPORTED",
          "CANCELLED",
          "EXPIRED",
          "DECLINED",
        ].includes(readGroup(m.groupId).status),
    )
    .map((m) => readGroup(m.groupId))
    .filter((g) => g.plan.trips.some((t) => t.ownerId === user.id))
    .map((g) => ({
      id: g.id,
      status: g.status,
      version: g.version,
      hostId: g.hostId,
      passengers: g.plan.trips.length,
      origin: g.plan.trips[0].origin,
      destination: g.plan.trips[0].destination,
      departure: g.plan.departure,
      farePaise: g.actualPaise ?? g.plan.farePaise,
    }));
  const results = getMatches(user);
  return {
    now: Date.now(),
    user,
    hubs,
    edges,
    trips: ownTrips,
    groups: ownGroups,
    matches: results.plans.map((p: Plan) => ({
      ...p,
      pickup: "",
      path: { ...p.path, hubs: [], edges: [] },
    })),
    matchReason: results.reason,
    notifications: db
      .select()
      .from(s.notifications)
      .where(eq(s.notifications.userId, user.id))
      .orderBy(desc(s.notifications.created))
      .limit(30)
      .all(),
    demo: demoEnabled(),
    personas: demoEnabled() ? personas : [],
    providerOutage:
      db
        .select()
        .from(s.settings)
        .where(eq(s.settings.key, "providerOutage"))
        .get()?.value === "true",
    runs: db
      .select()
      .from(s.runs)
      .where(eq(s.runs.userId, user.id))
      .orderBy(desc(s.runs.created))
      .limit(1)
      .all()
      .map((r) => JSON.parse(r.data)),
  };
}
export function publicInfo() {
  return { demo: demoEnabled(), personas: demoEnabled() ? personas : [], hubs };
}
export function health() {
  return { ok: sqlite.prepare("SELECT 1").get() !== undefined };
}
