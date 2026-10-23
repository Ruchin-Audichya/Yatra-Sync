import { z } from "zod";
import { hubs } from "../domain/graph";
const hub = z
  .string()
  .refine((id) => hubs.some((h) => h.id === id), "Choose a seeded hub.");
export const tripInput = z
  .object({
    origin: hub,
    destination: hub,
    earliest: z.number().int().positive(),
    latest: z.number().int().positive(),
    maxWait: z.number().int().min(0).max(120),
    maxDetour: z.number().int().min(0).max(60),
    maxWalk: z.number().int().min(0).max(2000),
    seats: z.number().int().min(1).max(4),
    luggage: z.enum(["small", "medium", "large"]),
    provider: z.enum(["any", "uber", "ola"]),
    womenOnly: z.boolean(),
    soloPaise: z.number().int().min(0).max(100000000).nullable(),
    trainNumber: z.string().max(12).optional(),
    trainArrival: z.number().int().positive().optional(),
  })
  .refine(
    (v) => v.origin !== v.destination,
    "Origin and destination must differ.",
  )
  .refine(
    (v) => v.latest >= v.earliest && v.latest - v.earliest <= 8 * 60 * 60000,
    "Departure window must be within eight hours.",
  );
export const registerInput = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.email().max(120),
  password: z.string().min(10).max(128),
  adult: z.literal(true),
  sharing: z.literal(true),
  gender: z.enum(["woman", "man", "unspecified"]),
});
export const loginInput = z.object({
  email: z.email().max(120),
  password: z.string().min(1).max(128),
});
export const groupInput = z.object({
  tripIds: z.array(z.string().min(1)).min(2).max(4),
  departure: z.number().int().optional(),
});
export const versionInput = z.object({ version: z.number().int().min(1) });
export const reportInput = z.object({
  targetId: z.string().max(80).optional(),
  body: z.string().trim().min(8).max(2000),
  block: z.boolean().default(false),
});
export const messageInput = z.object({
  body: z.string().trim().min(1).max(1000),
});
export const fareInput = z.object({
  version: z.number().int().min(1),
  paise: z.number().int().min(0).max(100000000),
});
export const transitionInput = z.object({
  version: z.number().int().min(1),
  status: z.enum([
    "BOOKING_PENDING",
    "BOOKED_SELF_REPORTED",
    "IN_PROGRESS_SELF_REPORTED",
    "COMPLETED_SELF_REPORTED",
    "DISPUTED",
  ]),
  reference: z.string().trim().max(100).optional(),
  provider: z.enum(["uber", "ola", "other"]).optional(),
});
export const simulationInput = z.object({
  count: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(100),
    z.literal(200),
  ]),
  seed: z.number().int().min(0).max(100000),
  disruption: z.enum(["none", "delay", "cancellation"]),
});
