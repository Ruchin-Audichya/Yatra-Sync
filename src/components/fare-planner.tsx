"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Route,
  ArrowUpRight,
  ShieldCheck,
  Copy,
  Check,
  Info,
  Users,
} from "lucide-react";
import { hubs, hubName, shortestPath } from "@/domain/graph";
import { allocatePaise, money, scenarioFare } from "@/domain/fare";
import { useApp } from "./context";
import { Schematic } from "./map";
import { Status } from "./product";
export function AllocationMeter({
  amounts,
  names,
}: {
  amounts: number[];
  names: string[];
}) {
  const total = amounts.reduce((a, b) => a + b, 0);
  return (
    <div className="allocation-meter">
      <div className="allocation-meter-label">
        <span>FARE CONTRIBUTIONS</span>
        <strong>{money(total)} total</strong>
      </div>
      <div
        className="allocation-track"
        role="img"
        aria-label={names
          .map((name, i) => `${name}: ${money(amounts[i])}`)
          .join(", ")}
      >
        {amounts.map((n, i) => (
          <span
            key={i}
            className={`allocation-color-${i % 4}`}
            style={{
              width: `${total ? (n / total) * 100 : 100 / amounts.length}%`,
            }}
          />
        ))}
      </div>
      <div className="allocation-legend">
        {names.map((name, i) => (
          <span key={i}>
            <i className={`allocation-color-${i % 4}`} />
            {name}
            <strong>
              {total ? Math.round((amounts[i] / total) * 100) : 0}%
            </strong>
          </span>
        ))}
      </div>
    </div>
  );
}
export function FarePlanner() {
  const { data } = useApp();
  const [count, setCount] = useState(3),
    [total, setTotal] = useState("640.25"),
    [origin, setOrigin] = useState("junction"),
    [destinations, setDestinations] = useState([
      "jecrc",
      "sitapura",
      "gandhi",
      "jecrc",
    ]),
    [copyState, setCopyState] = useState("");
  const valid = /^\d+(\.\d{0,2})?$/.test(total) && Number(total) <= 1000000;
  const paise = valid ? Math.round(Number(total) * 100) : 0;
  const weights = destinations
    .slice(0, count)
    .map((d) => shortestPath(origin, d)?.meters ?? 0);
  const solo = weights.map(scenarioFare),
    amounts = allocatePaise(paise, weights, solo);
  const beneficial = amounts.every((a, i) => a <= solo[i]);
  const names = Array.from({ length: count }, (_, i) =>
    i === 0 ? "You" : `Rider ${i + 1}`,
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        `Yatra Sync · illustrative fare plan\n${hubName(origin)}\n${names.map((n, i) => `${n} → ${hubName(destinations[i])}: ${money(amounts[i])}`).join("\n")}\nTotal: ${money(paise)}. Calculator only, not a booking or payment.`,
      );
      setCopyState("Breakdown copied.");
    } catch {
      setCopyState(
        "Clipboard unavailable. You can select and copy the displayed amounts.",
      );
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <Wallet size={15} />
            EVERY RUPEE, ACCOUNTED FOR.
          </span>
          <h1>A fair share of the journey.</h1>
          <p>
            Different stops, one transparent split. Explore the numbers before
            you agree.
          </p>
        </div>
        <span className="pill">
          <ShieldCheck size={15} />
          Exact-paise reconciliation
        </span>
      </div>
      <div className="fare-calculator-layout">
        <div>
          <section className="panel fare-calculator">
            <div className="section-title">
              <div>
                <span className="eyebrow">INTERACTIVE FARE PLANNER</span>
                <h2>See what sharing could look like.</h2>
              </div>
              <span className="row-icon blue">
                <Wallet size={23} />
              </span>
            </div>
            <p className="muted small-text">
              A local, illustrative calculator. Changes here don’t alter your
              group’s agreed fare.
            </p>
            <div className="field-grid spaced">
              <label>
                Group fare to explore · ₹
                <input
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  inputMode="decimal"
                  aria-invalid={!valid}
                  placeholder="640.25"
                />
              </label>
              <label>
                Common starting hub
                <select
                  value={origin}
                  onChange={(e) => {
                    const value = e.target.value;
                    setOrigin(value);
                    setDestinations(
                      destinations.map((d) =>
                        d === value ? hubs.find((h) => h.id !== value)!.id : d,
                      ),
                    );
                  }}
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="rider-count">
              <legend>Passengers sharing the fare</legend>
              <div className="segmented">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    aria-pressed={n === count}
                    onClick={() => setCount(n)}
                    className={n === count ? "selected" : ""}
                  >
                    <Users size={16} />
                    {n} riders
                  </button>
                ))}
              </div>
            </fieldset>
            {!valid && (
              <p role="alert" className="error-text">
                Enter ₹0–₹10,00,000 with no more than two decimal places.
              </p>
            )}
            <div className="fare-rider-list">
              {names.map((name, i) => (
                <div className="fare-rider" key={i}>
                  <span className={`rider-number allocation-color-${i}`}>
                    {i + 1}
                  </span>
                  <label>
                    {name} · drop-off
                    <select
                      aria-label={`${name} drop-off`}
                      value={destinations[i]}
                      onChange={(e) =>
                        setDestinations(
                          destinations.map((d, k) =>
                            k === i ? e.target.value : d,
                          ),
                        )
                      }
                    >
                      {hubs
                        .filter((h) => h.id !== origin)
                        .map((h) => (
                          <option value={h.id} key={h.id}>
                            {h.name}
                          </option>
                        ))}
                    </select>
                    <small>
                      {(weights[i] / 1000).toFixed(1)} km standalone ·
                      illustrative graph
                    </small>
                  </label>
                  <div className="rider-amount">
                    <strong data-testid="planner-share">
                      {money(amounts[i])}
                    </strong>
                    <small>Solo model: {money(solo[i])}</small>
                  </div>
                </div>
              ))}
            </div>
            <AllocationMeter amounts={amounts} names={names} />
            <div className="fare-planner-total">
              <span>All shares add up. Exactly.</span>
              <strong data-testid="planner-total">{money(paise)}</strong>
            </div>
            <div className={`callout ${beneficial ? "" : "warning"}`}>
              <Info size={18} />
              <span>
                {beneficial
                  ? "This illustrative allocation fits every comparable solo estimate."
                  : "This fare is not economically beneficial to every rider. Review the amounts before agreeing."}{" "}
                No saving is guaranteed.
              </span>
            </div>
            <button
              className="button secondary spaced"
              onClick={copy}
              disabled={!valid}
            >
              <Copy size={16} />
              Copy breakdown
            </button>
            {copyState && (
              <p role="status" className="small-text success-text spaced">
                {copyState}
              </p>
            )}
          </section>
          <section className="panel spaced fairness-explainer">
            <span className="eyebrow">THE MATH, WITHOUT THE MYSTERY</span>
            <h2>Fairness you can follow.</h2>
            <div className="how-grid">
              <div>
                <Route size={22} />
                <h3>Your distance matters</h3>
                <p>
                  Each rider contributes in proportion to their standalone
                  corridor distance.
                </p>
              </div>
              <div>
                <ShieldCheck size={22} />
                <h3>Compare the alternatives</h3>
                <p>
                  Solo-estimate caps apply when the whole fare can fit inside
                  those caps.
                </p>
              </div>
              <div>
                <Check size={22} />
                <h3>Every paise has a place</h3>
                <p>
                  Rounding remainders are assigned deterministically. Nothing
                  goes missing.
                </p>
              </div>
            </div>
          </section>
        </div>
        <aside className="fare-planner-side">
          <div className="calculator-map">
            <Schematic origin={origin} destination={destinations[0]} />
          </div>
          <section className="panel spaced">
            <div className="section-title">
              <h2>Your group fare rooms</h2>
              <Wallet size={21} />
            </div>
            {data.groups.length ? (
              data.groups.map((g) => (
                <Link
                  href={`/app/groups/${g.id}`}
                  className="fare-room-link"
                  key={g.id}
                >
                  <div>
                    <strong>
                      {hubName(g.origin)} → {hubName(g.destination)}
                    </strong>
                    <small>
                      {g.passengers} request holders · recorded total{" "}
                      {money(g.farePaise)}
                    </small>
                    <Status value={g.status} />
                  </div>
                  <ArrowUpRight size={18} />
                </Link>
              ))
            ) : (
              <div className="small-empty">
                <p className="muted">
                  Your group’s estimated or manually entered fare will appear
                  after you form a circle.
                </p>
                <Link className="text-link spaced" href="/app/matches">
                  Find co-travellers <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
          </section>
          <div className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              <strong>Clarity before commitment.</strong>
              <p>
                Actual group fare changes require every member’s review.
                Payments happen directly, outside Yatra Sync.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
