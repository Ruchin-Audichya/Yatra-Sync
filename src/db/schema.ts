import {
  sqliteTable,
  text,
  integer,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  communityId: text("community_id").notNull(),
  role: text("role").notNull(),
  synthetic: integer("synthetic", { mode: "boolean" }).notNull(),
  gender: text("gender").notNull(),
  adult: integer("adult", { mode: "boolean" }).notNull(),
  sharing: integer("sharing", { mode: "boolean" }).notNull(),
});
export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires").notNull(),
});
export const trips = sqliteTable(
  "trips",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    communityId: text("community_id").notNull(),
    data: text("data").notNull(),
  },
  (t) => [index("trip_candidates").on(t.communityId, t.status)],
);
export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  data: text("data").notNull(),
});
export const members = sqliteTable(
  "members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tripId: text("trip_id")
      .notNull()
      .references(() => trips.id),
    acceptedVersion: integer("accepted_version").notNull().default(0),
    fareAcceptedVersion: integer("fare_accepted_version").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    paid: integer("paid", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);
export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  created: integer("created").notNull(),
});
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  href: text("href").notNull(),
  created: integer("created").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
});
export const blocks = sqliteTable(
  "blocks",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.targetId] })],
);
export const reports = sqliteTable("reports", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  targetId: text("target_id"),
  body: text("body").notNull(),
  status: text("status").notNull(),
  created: integer("created").notNull(),
  communityId: text("community_id").notNull(),
});
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  groupId: text("group_id").references(() => groups.id, {
    onDelete: "cascade",
  }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  created: integer("created").notNull(),
});
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  created: integer("created").notNull(),
});
