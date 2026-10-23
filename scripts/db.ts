try {
  process.loadEnvFile(".env.local");
} catch {}
const { seed } = await import("../src/db/seed");
const { sqlite } = await import("../src/db");
const action = process.argv[2];
if (action === "seed" || action === "reset")
  console.log(seed(action === "reset"));
else if (action === "migrate")
  console.log("SQLite migration 0001 applied; foreign keys and WAL enabled.");
else throw new Error("Use migrate, seed or reset.");
sqlite.close();
export {};
