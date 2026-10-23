export interface Hub {
  id: string;
  name: string;
  short: string;
  x: number;
  y: number;
}
export interface Edge {
  id: string;
  from: string;
  to: string;
  meters: number;
  minutes: number;
}
export type Luggage = "small" | "medium" | "large";
export interface Trip {
  id: string;
  ownerId: string;
  communityId: string;
  origin: string;
  destination: string;
  earliest: number;
  latest: number;
  maxWait: number;
  maxDetour: number;
  maxWalk: number;
  seats: number;
  luggage: Luggage;
  provider: "any" | "uber" | "ola";
  womenOnly: boolean;
  gender: "woman" | "man" | "unspecified";
  sharing: boolean;
  adult: boolean;
  status: "active" | "committed" | "cancelled" | "completed";
  expires: number;
  soloPaise: number | null;
  created: number;
  synthetic: boolean;
  name: string;
  routeVersion: number;
  visibility: "community";
  trainNumber?: string;
  trainArrival?: number;
}
export interface Path {
  hubs: string[];
  edges: string[];
  meters: number;
  minutes: number;
}
export interface Allocation {
  tripId: string;
  ownerId: string;
  name: string;
  paise: number;
  soloPaise: number | null;
  savingPaise: number | null;
}
export interface Plan {
  trips: Trip[];
  pickup: string;
  departure: number;
  departureOptions: number[];
  path: Path;
  farePaise: number;
  allocations: Allocation[];
  beneficial: boolean;
  score: number;
  overlap: number;
  maxWait: number;
  maxDetour: number;
  maxWalk: number;
  reasons: string[];
}
export interface User {
  id: string;
  name: string;
  email: string;
  communityId: string;
  role: "traveller" | "demo_admin";
  synthetic: boolean;
  gender: "woman" | "man" | "unspecified";
  adult: boolean;
  sharing: boolean;
}
export type GroupStatus =
  | "ACCEPTING"
  | "CONFIRMED"
  | "BOOKING_PENDING"
  | "BOOKED_SELF_REPORTED"
  | "IN_PROGRESS_SELF_REPORTED"
  | "COMPLETED_SELF_REPORTED"
  | "CANCELLED"
  | "DECLINED"
  | "EXPIRED"
  | "DISPUTED";
export interface GroupData {
  id: string;
  hostId: string;
  communityId: string;
  status: GroupStatus;
  version: number;
  plan: Plan;
  actualPaise: number | null;
  fareVersion: number;
  reference: string;
  created: number;
  provider: string;
}
export interface GroupMember {
  groupId: string;
  userId: string;
  tripId: string;
  acceptedVersion: number;
  fareAcceptedVersion: number;
  active: boolean;
  paid: boolean;
}
