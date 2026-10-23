import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "./schema";
const path = process.env.DATABASE_PATH ?? "./data/yatri-sync.sqlite";
if (path !== ":memory:") mkdirSync(dirname(resolve(path)), { recursive: true });
export const sqlite = new Database(path);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");
sqlite.exec(
  readFileSync(
    resolve(process.cwd(), "src/db/migrations/0001_initial.sql"),
    "utf8",
  ),
);
export const db = drizzle(sqlite, { schema });
export const atomic = <T>(action: () => T): T =>
  sqlite.transaction(action).immediate();
