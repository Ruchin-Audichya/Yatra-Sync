"use client";
import Link from "next/link";
import { useState } from "react";
import {
  FlaskConical,
  Play,
  Download,
  RefreshCw,
  Clock3,
  Info,
  BarChart3,
} from "lucide-react";
import { useApp } from "./context";
import { money } from "@/domain/fare";
import type { benchmark } from "@/domain/simulation";
type Result = ReturnType<typeof benchmark>;
export function ControlRoom() {
  const { data, act, busy } = useApp();
  const [count, setCount] = useState(50),
    [seed, setSeed] = useState(42),
    [disruption, setDisruption] = useState<"none" | "delay" | "cancellation">(
      "none",
    ),
    [result, setResult] = useState<Result | null>(data.runs[0] ?? null),
    [resetConfirm, setResetConfirm] = useState(false),
    [exportNote, setExportNote] = useState("");
  if (!data.demo || !data.user.synthetic)
    return (
      <div className="empty">
        <FlaskConical size={32} />
        <h1>Demo studio is disabled.</h1>
        <p>
          Available only for synthetic personas in development with
          DEMO_MODE=true.
        </p>
      </div>
    );
  async function run() {
    const r = await act<Result>(
      "demo/benchmark",
      { count, seed, disruption },
      "Synthetic benchmark computed from the same inputs.",
    );
    if (r) setResult(r);
  }
  function download(format: "json" | "csv") {
    if (!result) return;
    let content: string;
    if (format === "json") content = JSON.stringify(result, null, 2);
    else {
      const keys = Object.keys(result.baseline) as (keyof Result["baseline"])[];
      content =
        `synthetic,seed,count,disruption,algorithm,${keys.join(",")}\n` +
        (["baseline", "optimizer"] as const)
          .map(
            (mode) =>
              `true,${result.seed},${result.count},${result.disruption},${mode},${keys.map((k) => result[mode][k]).join(",")}`,
          )
          .join("\n");
    }
    const blob = new Blob([content], {
      type: format === "json" ? "application/json" : "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yatra-sync-synthetic-seed-${result.seed}.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportNote(
      `${format.toUpperCase()} exported with synthetic labels and seed.`,
    );
  }
  const metrics: [keyof Result["baseline"], string, string][] = [
    ["eligible", "Eligible requests", ""],
    ["matched", "Matched travellers", ""],
    ["matchRate", "Matching rate", "%"],
    ["groups", "Proposed groups", ""],
    ["savingPaise", "Estimated aggregate saving", "₹"],
    ["meanWait", "Mean wait", "min"],
    ["medianWait", "Median wait", "min"],
    ["meanDetour", "Mean maximum group detour", "min"],
    ["violations", "Constraint violations", ""],
    ["runtimeMs", "Algorithm runtime", "ms"],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">TEST THE IDEA. MEASURE THE OUTCOME.</div>
          <h1>
            Demo studio<span className="greeting-dot">.</span>
          </h1>
          <p>One dataset. Two algorithms. Honest comparisons.</p>
        </div>
        <Link href="/demo/present" className="button">
          <Play size={16} /> Present to judges
        </Link>
      </div>
      <div className="callout warning">
        <Info size={19} />
        <span>
          Synthetic scenario — not live demand, traffic, cab pricing or proven
          real-world saving. The optimizer may perform worse on some metrics.
          All groups are proposed.
        </span>
      </div>
      <div className="control-grid">
        <section className="panel">
          <div className="section-title">
            <h2>Build your scenario</h2>
            <BarChart3 size={22} />
          </div>
          <fieldset className="scenario-count">
            <legend>Synthetic trip requests</legend>
            <div className="segmented">
              {[25, 50, 100, 200].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={n === count ? "selected" : ""}
                  aria-pressed={n === count}
                  onClick={() => setCount(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>
          <label>
            Reproducible seed
            <input
              type="number"
              value={seed}
              min={0}
              max={100000}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </label>
          <label>
            Disruption scenario
            <select
              value={disruption}
              onChange={(e) =>
                setDisruption(e.target.value as typeof disruption)
              }
            >
              <option value="none">Normal departure mix</option>
              <option value="delay">
                Train delay · every 5th request +20 min
              </option>
              <option value="cancellation">
                Cancellation · every 7th request removed
              </option>
            </select>
          </label>
          <button className="button wide" disabled={busy} onClick={run}>
            <Play size={17} />
            {busy ? "Computing…" : "Run comparison"}
          </button>
          <p className="muted small-text">
            A seeded graph, scenario fares and shared hard rules. FCFS uses
            identical hubs; the bounded optimizer also considers partial
            directed overlap and nearby public pickup hubs.
          </p>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>Judge demo controls</h2>
            <FlaskConical size={22} />
          </div>
          <div className="scenario-action">
            <div>
              <strong>Simulate provider outage</strong>
              <p>Prevents reporting a new booking during a synthetic outage.</p>
            </div>
            <button
              role="switch"
              aria-label="Simulate provider outage"
              aria-checked={data.providerOutage}
              className={`toggle ${data.providerOutage ? "on" : ""}`}
              onClick={() =>
                act(
                  "demo/outage",
                  { value: !data.providerOutage },
                  "Synthetic provider availability updated.",
                )
              }
              disabled={busy}
            >
              <i />
            </button>
          </div>
          <div className="scenario-action">
            <div>
              <strong>Delay my departure</strong>
              <p>Move your active request +20 min. No train data is fetched.</p>
            </div>
            <button
              className="button secondary small"
              disabled={busy || !data.trips.some((t) => t.status === "active")}
              onClick={() =>
                act(
                  "demo/delay",
                  { minutes: 20 },
                  "Manual synthetic delay applied.",
                )
              }
            >
              <Clock3 size={15} />
              +20 min
            </button>
          </div>
          <div className="reset-demo">
            <strong>A fresh start for the next demo.</strong>
            <p>
              Resets synthetic users, trips, groups and messages. Real local
              accounts stay separate. All demo sessions sign out.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.checked)}
              />
              I want to reset synthetic demo state.
            </label>
            <button
              className="button secondary"
              disabled={!resetConfirm || busy}
              onClick={async () => {
                const r = await act(
                  "demo/reset",
                  {},
                  "Synthetic scenario reset.",
                  "/demo",
                );
                if (r) setResult(null);
              }}
            >
              <RefreshCw size={15} />
              Reset judge scenario
            </button>
          </div>
        </section>
      </div>
      {!result ? (
        <div className="panel empty spaced">
          <BarChart3 size={34} />
          <h2>Let the comparison speak.</h2>
          <p>Choose a request count and seed, then run both algorithms.</p>
        </div>
      ) : (
        <section className="panel spaced benchmark-results">
          <div className="section-title">
            <div>
              <span className="eyebrow">
                ACTUAL ALGORITHM OUTPUT · SYNTHETIC
              </span>
              <h2>Baseline vs. optimizer</h2>
              <p>
                Seed {result.seed} · {result.count} requests ·{" "}
                {result.disruption} scenario
              </p>
            </div>
            <div className="action-wrap">
              <button
                className="button secondary small"
                onClick={() => download("csv")}
              >
                <Download size={15} />
                CSV
              </button>
              <button
                className="button secondary small"
                onClick={() => download("json")}
              >
                <Download size={15} />
                JSON
              </button>
            </div>
          </div>
          <div className="benchmark-chart">
            {(["baseline", "optimizer"] as const).map((mode) => (
              <div key={mode}>
                <div>
                  <strong>
                    {mode === "baseline"
                      ? "First come, first served"
                      : "Constrained optimizer"}
                  </strong>
                  <span>{result[mode].matchRate}% matched</span>
                </div>
                <div className="chart-track">
                  <div
                    className={mode}
                    style={{ width: `${result[mode].matchRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Measured metric</th>
                  <th>FCFS baseline</th>
                  <th>Optimizer</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map(([key, label, unit]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    {(["baseline", "optimizer"] as const).map((mode) => (
                      <td key={mode}>
                        {unit === "₹"
                          ? money(result[mode][key])
                          : `${result[mode][key]}${unit ? " " + unit : ""}`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small-text">
            Cancellation survival: {result.cancellationRecovery.survivingGroups}
            /{result.cancellationRecovery.attempted} proposed groups remain
            feasible with at least 2 members after their first passenger is
            removed. This is a synthetic feasibility test; it does not measure
            real replacement acceptance.
          </p>
          <p className="muted small-text">{result.assumptions}</p>
          {exportNote && (
            <p role="status" className="success-text">
              {exportNote}
            </p>
          )}
        </section>
      )}
    </>
  );
}
