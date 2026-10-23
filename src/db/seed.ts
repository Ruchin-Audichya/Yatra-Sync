import { eq } from "drizzle-orm";
import { db, sqlite, atomic } from "./index";
import * as s from "./schema";
import { hashPassword } from "../lib/security";
import { hubs, edges, shortestPath } from "../domain/graph";
import { scenarioFare } from "../domain/fare";
import type { Trip } from "../domain/types";
export const personas = [
  {
    id: "demo-aarav",
    name: "Aarav Sharma",
    gender: "man",
    role: "traveller",
    label: "Start here · campus → station",
  },
  {
    id: "demo-meera",
    name: "Meera Jain",
    gender: "woman",
    role: "traveller",
    label: "Compatible co-traveller",
  },
  {
    id: "demo-kabir",
    name: "Kabir Singh",
    gender: "man",
    role: "traveller",
    label: "Intermediate drop-off",
  },
  {
    id: "demo-ananya",
    name: "Ananya Rao",
    gender: "woman",
    role: "traveller",
    label: "Replacement traveller",
  },
  {
    id: "demo-admin",
    name: "Demo Administrator",
    gender: "unspecified",
    role: "demo_admin",
    label: "Control room & moderation",
  },
] as const;
export function seed(reset = false, now = Date.now()) {
  return atomic(() => {
    if (reset) {
      for (const t of [
        "runs",
        "events",
        "reports",
        "blocks",
        "messages",
        "notifications",
        "members",
        "groups",
        "trips",
        "sessions",
        "users",
      ])
        sqlite
          .prepare(
            `DELETE FROM ${t} WHERE ${t === "users" ? "synthetic = 1" : t === "trips" ? "owner_id LIKE 'demo-%'" : t === "sessions" ? "user_id LIKE 'demo-%'" : t === "groups" ? "json_extract(data, '$.communityId') = 'jecrc-demo'" : t === "members" ? "user_id LIKE 'demo-%'" : t === "blocks" ? "user_id LIKE 'demo-%' OR target_id LIKE 'demo-%'" : t === "messages" || t === "notifications" || t === "events" || t === "runs" ? "user_id LIKE 'demo-%'" : "community_id = 'jecrc-demo'"}`,
          )
          .run();
    }
    for (const h of hubs)
      sqlite
        .prepare("INSERT OR REPLACE INTO hubs VALUES(?,?,?)")
        .run(h.id, h.name, JSON.stringify(h));
    for (const e of edges)
      sqlite
        .prepare("INSERT OR REPLACE INTO route_edges VALUES(?,?,?,?,?)")
        .run(e.id, e.from, e.to, e.meters, e.minutes);
    const hash = hashPassword("YatriDemo!2026");
    for (const p of personas) {
      db.insert(s.users)
        .values({
          id: p.id,
          name: p.name,
          email: `${p.id}@yatri.invalid`,
          password: hash,
          communityId: "jecrc-demo",
          role: p.role,
          synthetic: true,
          gender: p.gender,
          adult: true,
          sharing: true,
        })
        .onConflictDoNothing()
        .run();
    }
    const base = Math.ceil((now + 15 * 60000) / 300000) * 300000;
    for (const [i, p] of personas
      .filter((p) => p.role === "traveller")
      .entries()) {
      const destination = i === 2 ? "sitapura" : "junction";
      const trip: Trip = {
        id: `seed-trip-${i}`,
        ownerId: p.id,
        name: p.name,
        communityId: "jecrc-demo",
        origin: "jecrc",
        destination,
        earliest: base,
        latest: base + 30 * 60000,
        maxWait: 20,
        maxDetour: 12,
        maxWalk: 500,
        seats: 1,
        luggage: "small",
        provider: "any",
        womenOnly: false,
        gender: p.gender as Trip["gender"],
        adult: true,
        sharing: true,
        status: "active",
        expires: base + 60 * 60000,
        soloPaise: scenarioFare(shortestPath("jecrc", destination)!.meters),
        created: now + i,
        synthetic: true,
        routeVersion: 1,
        visibility: "community",
      };
      // Aarav starts without a request so the create journey is real.
      if (i !== 0)
        db.insert(s.trips)
          .values({
            id: trip.id,
            ownerId: trip.ownerId,
            status: trip.status,
            communityId: trip.communityId,
            data: JSON.stringify(trip),
          })
          .onConflictDoNothing()
          .run();
    }
    db.insert(s.settings)
      .values({ key: "providerOutage", value: "false" })
      .onConflictDoUpdate({ target: s.settings.key, set: { value: "false" } })
      .run();
    return { personas: personas.length, hubCount: hubs.length, base };
  });
}
export function ensureSeed() {
  if (!db.select().from(s.users).where(eq(s.users.id, "demo-aarav")).get())
    seed();
}
