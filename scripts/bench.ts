import { writeFileSync, mkdirSync } from "node:fs";
import { benchmark } from "../src/domain/simulation";
const result = benchmark(
  Number(process.argv[2] ?? 50),
  Number(process.argv[3] ?? 42),
);
mkdirSync("docs/evidence", { recursive: true });
writeFileSync("docs/evidence/benchmark.json", JSON.stringify(result, null, 2));
const keys = Object.keys(result.baseline) as (keyof typeof result.baseline)[];
const csv =
  `synthetic,seed,count,disruption,algorithm,${keys.join(",")}\n` +
  (["baseline", "optimizer"] as const)
    .map(
      (mode) =>
        `true,${result.seed},${result.count},${result.disruption},${mode},${keys.map((k) => result[mode][k]).join(",")}`,
    )
    .join("\n");
writeFileSync("docs/evidence/benchmark.csv", csv);
console.log(JSON.stringify(result, null, 2));
