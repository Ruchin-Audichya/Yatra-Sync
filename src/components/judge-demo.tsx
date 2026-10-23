"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCheck,
  Expand,
  FlaskConical,
  Info,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { judgePlan, judgeTrips, JUDGE_NOW } from "@/domain/judge-demo";
import { money, splitFare } from "@/domain/fare";
import { hubName } from "@/domain/graph";
import { benchmark } from "@/domain/simulation";
import styles from "./judge-demo.module.css";

const chapters = [
  {
    label: "The idea",
    kicker: "GOOD COMPANY IS GOING YOUR WAY",
    title: "It’s 6 PM.\nShare the way home.",
    note: "Open with the human problem, not the algorithm. ‘Office is over. Cab fares are high. Several people nearby are heading in the same direction, but finding each other still takes a group chat. Yatra Sync brings the people, the plan and the fare into one clear conversation.’",
    duration: "20 sec",
  },
  {
    label: "The match",
    kicker: "01 / A SHARED DIRECTION",
    title: "Four people.\nOne way forward.",
    note: "Click Find their match. Aarav, Meera and Ananya travel to the station; Kabir gets off earlier at Gandhi Nagar. Point out the computed waiting and detour limits. These results come from the same matching function as the product, using fixed synthetic fixtures.",
    duration: "30 sec",
  },
  {
    label: "The fare",
    kicker: "02 / FAIRNESS YOU CAN SEE",
    title: "Different stops.\nDifferent shares.",
    note: "Contrast the short Gandhi Nagar ride with the full station journey. Click Try ₹640.25 to demonstrate paise reconciliation under a what-if fare. This is a fare exploration, not a provider quote or payment. The total always matches the sum of the shares.",
    duration: "25 sec",
  },
  {
    label: "The choice",
    kicker: "03 / EVERYONE GETS A SAY",
    title: "A shared ride.\nAn individual choice.",
    note: "Click each traveller to simulate their consent. Only four current approvals make this demo ready. Explain that in the working app every passenger accepts from their own session; the presenter sandbox is demonstrating that interaction, not authorizing a real booking.",
    duration: "25 sec",
  },
  {
    label: "The recovery",
    kicker: "04 / BUILT FOR CHANGING PLANS",
    title: "Plans change.\nWe find a way.",
    note: "Simulate Kabir leaving. Watch the group re-evaluate, the fare change, and prior approvals clear. Then suggest Nisha as a replacement. The same evaluator checks the new composition. Everyone would need to accept the new terms in the working app.",
    duration: "30 sec",
  },
  {
    label: "The evidence",
    kicker: "05 / SHOW THE WORK",
    title: "A good idea.\nPut to the test.",
    note: "Run the comparison. Both algorithms get the same 50 synthetic requests and seed 42. Read the actual result, including any metric that gets worse. Matching rate and savings are scenario outputs, not proven demand or real-world savings. Rule checks report only the modeled constraints.",
    duration: "30 sec",
  },
  {
    label: "The invitation",
    kicker: "LESS GOING ALONE. MORE GOING TOGETHER.",
    title: "The ride is shared.\nThe choice is yours.",
    note: "Close on the product: ‘Yatra Sync makes sharing a journey easier to understand and easier to agree to.’ Open the working app for questions, or use chapter navigation to revisit the fare, consent or recovery. No claim of live dispatch, identity verification or automatic payment.",
    duration: "20 sec",
  },
];
const firstName = (name: string) => name.split(" ")[0];
export function JudgeDemo() {
  const [step, setStep] = useState(0),
    [notes, setNotes] = useState(false),
    [matched, setMatched] = useState(false),
    [total, setTotal] = useState<string | null>(null),
    [accepted, setAccepted] = useState<string[]>([]),
    [cancelled, setCancelled] = useState(false),
    [replacement, setReplacement] = useState(false),
    [result, setResult] = useState<ReturnType<typeof benchmark> | null>(null),
    [computing, setComputing] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [running, setRunning] = useState(false),
    [full, setFull] = useState(false),
    [message, setMessage] = useState("");
  const [trips] = useState(judgeTrips);
  const original = useMemo(() => judgePlan(trips.slice(0, 4)), [trips]);
  const active = useMemo(
    () =>
      cancelled
        ? [
            ...trips.slice(0, 4).filter((t) => t.id !== trips[2].id),
            ...(replacement ? [trips[4]] : []),
          ]
        : trips.slice(0, 4),
    [trips, cancelled, replacement],
  );
  const plan = useMemo(() => judgePlan(active), [active]);
  const version = replacement ? 3 : cancelled ? 2 : 1;
  const validFare =
    total === null ||
    (/^\d+(\.\d{0,2})?$/.test(total) && Number(total) <= 1000000);
  const fare =
    total === null || !validFare
      ? plan.farePaise
      : Math.round(Number(total) * 100);
  const allocation = splitFare(fare, active);
  const allAccepted = accepted.length === active.length;
  const chapter = chapters[step],
    dark = step === 0 || step === 6;
  const go = (n: number) => {
    setStep(Math.max(0, Math.min(chapters.length - 1, n)));
    setMessage("");
  };
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target instanceof HTMLElement &&
          (e.target.matches("input,select,textarea") ||
            e.target.isContentEditable))
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setStep((s) => Math.min(6, s + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setStep((s) => Math.max(0, s - 1));
      }
      if (e.key.toLowerCase() === "n") setNotes((n) => !n);
      if (e.key === "Home") {
        e.preventDefault();
        setStep(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        setStep(6);
      }
    };
    const onFull = () => setFull(!!document.fullscreenElement);
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFull);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFull);
    };
  }, []);
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setMessage(
        "Fullscreen is unavailable in this browser. The presentation still works in this window.",
      );
    }
  }
  function replay() {
    setStep(0);
    setMatched(false);
    setTotal(null);
    setAccepted([]);
    setCancelled(false);
    setReplacement(false);
    setResult(null);
    setElapsed(0);
    setRunning(false);
    setMessage("Demo reset. Your local accounts and trips were not changed.");
  }
  function leave() {
    setCancelled(true);
    setAccepted([]);
    setTotal(null);
    setMessage(
      "Kabir left this sandbox group. Fare recomputed; all prior approvals cleared.",
    );
  }
  async function measure() {
    setComputing(true);
    try {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      setResult(benchmark(50, 42, JUDGE_NOW));
    } catch {
      setMessage("The comparison could not complete. Please run it again.");
    } finally {
      setComputing(false);
    }
  }
  const roster = (list = active) => (
    <div className={styles.roster}>
      {list.map((t, i) => (
        <div key={t.id} className={styles.person}>
          <span className={styles.avatar} data-tone={i % 4}>
            {t.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
          <span>
            <strong>{t.name}</strong>
            <small>{hubName(t.destination)}</small>
          </span>
          <span>
            {money(t.soloPaise ?? 0)}
            <small>solo model</small>
          </span>
        </div>
      ))}
    </div>
  );
  return (
    <div className={`${styles.shell} ${dark ? styles.dark : ""}`}>
      <a href="#judge-stage" className={styles.skip}>
        Skip to presentation
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/icon.svg" alt="" width={34} height={34} />
          <strong>Yatra Sync</strong>
          <span>JUDGE EXPERIENCE</span>
        </Link>
        <div className={styles.tools}>
          <span className={styles.timer} aria-label="Rehearsal elapsed time">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </span>
          <button
            onClick={() => setRunning((r) => !r)}
            aria-label={
              running ? "Pause rehearsal timer" : "Start rehearsal timer"
            }
          >
            {running ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            onClick={() => setNotes((n) => !n)}
            aria-label="Toggle presenter notes"
            aria-expanded={notes}
            aria-controls="presenter-notes"
          >
            <Info size={18} />
            <span>Presenter notes</span>
          </button>
          <button
            onClick={fullscreen}
            aria-label={full ? "Exit fullscreen" : "Enter fullscreen"}
          >
            <Expand size={18} />
          </button>
          <Link href="/demo" aria-label="Exit presentation">
            <X size={19} />
          </Link>
        </div>
      </header>
      <main id="judge-stage" className={styles.stage} key={step}>
        <div className={styles.caption}>
          <span>
            <FlaskConical size={13} /> SYNTHETIC SANDBOX
          </span>
          <span>NO ACCOUNTS. NO RESET. NO LIVE BOOKINGS.</span>
        </div>
        <div
          className={`${styles.scene} ${step === 0 || step === 6 ? styles.hero : ""}`}
        >
          <div className={styles.copy}>
            <span className={styles.kicker}>{chapter.kicker}</span>
            <h1>
              {chapter.title.split("\n").map((line, i) => (
                <span key={line} className={i === 1 ? styles.accent : ""}>
                  {line}
                </span>
              ))}
            </h1>
            <p>
              {
                [
                  "Find people heading your way. Agree on a plan. Share the fare fairly.",
                  "Three travellers head to Jaipur Junction. Kabir gets off at Gandhi Nagar. Their constraints decide whether they can share.",
                  "A shorter journey should have a smaller contribution. Every share is visible. Every paise adds up.",
                  "A match is an invitation. Every traveller must accept the same group, departure and fare terms.",
                  "A cancellation should start a new conversation. Recheck the group. Recalculate the fare. Ask everyone again.",
                  "One dataset. The same hard rules. Two matching strategies. Compare the computed results, not a marketing number.",
                  "A little coordination. Better company. A journey that works for everyone.",
                ][step]
              }
            </p>
            {step === 0 && (
              <div className={styles.ctas}>
                <button
                  className={styles.primary}
                  onClick={() => {
                    setRunning(true);
                    go(1);
                  }}
                >
                  Start the story <ArrowRight size={19} />
                </button>
                <span>3 minutes · 7 chapters · live calculations</span>
              </div>
            )}
            {step === 1 && (
              <>
                <button
                  className={styles.primary}
                  onClick={() => setMatched(true)}
                >
                  {matched ? <Check size={18} /> : <Sparkles size={18} />}{" "}
                  {matched ? "Match computed" : "Find their match"}
                </button>
                <p className={styles.fine}>
                  Uses the product’s matching engine. The Jaipur graph and fares
                  are illustrative.
                </p>
              </>
            )}
            {step === 2 && (
              <div className={styles.ctas}>
                <button
                  className={styles.secondary}
                  onClick={() => setTotal(total === null ? "640.25" : null)}
                >
                  {total === null ? "Try ₹640.25" : "Use route estimate"}
                  <ArrowUpRight size={16} />
                </button>
                <span>Explore a what-if fare. No payment is made.</span>
              </div>
            )}
            {step === 3 && (
              <div className={styles.callout}>
                <ShieldCheck size={22} />
                <span>
                  {allAccepted
                    ? "All sandbox passengers approved this version."
                    : `${accepted.length} of ${active.length} simulated approvals.`}
                  <small>
                    The working app requires each person’s own authenticated
                    session.
                  </small>
                </span>
              </div>
            )}
            {step === 4 && (
              <div className={styles.ctas}>
                {!cancelled ? (
                  <button className={styles.primary} onClick={leave}>
                    Simulate Kabir leaving <ArrowRight size={18} />
                  </button>
                ) : !replacement ? (
                  <button
                    className={styles.primary}
                    onClick={() => {
                      setReplacement(true);
                      setAccepted([]);
                      setMessage(
                        "Nisha fits the remaining group. New composition, new terms, fresh consent required.",
                      );
                    }}
                  >
                    Suggest a replacement <Users size={18} />
                  </button>
                ) : (
                  <button
                    className={styles.secondary}
                    onClick={() => {
                      setCancelled(false);
                      setReplacement(false);
                      setAccepted([]);
                      setTotal(null);
                    }}
                  >
                    Restore original group <RotateCcw size={17} />
                  </button>
                )}
                <span>Before external booking · modeled recovery</span>
              </div>
            )}
            {step === 5 && (
              <button
                className={styles.primary}
                disabled={computing}
                onClick={measure}
              >
                <Play size={17} />
                {computing
                  ? "Computing…"
                  : result
                    ? "Run again"
                    : "Run the comparison"}
              </button>
            )}
            {step === 6 && (
              <>
                <div className={styles.ctas}>
                  <Link className={styles.primary} href="/demo">
                    Open the working app <ArrowUpRight size={19} />
                  </Link>
                  <button className={styles.secondary} onClick={replay}>
                    <RotateCcw size={17} /> Replay the story
                  </button>
                </div>
                <div className={styles.closingProof}>
                  <span>
                    <Check size={16} /> Constraint-aware matches
                  </span>
                  <span>
                    <Check size={16} /> Transparent contributions
                  </span>
                  <span>
                    <Check size={16} /> Consent at every change
                  </span>
                </div>
              </>
            )}
          </div>
          {step === 0 && (
            <div className={styles.heroArt}>
              <Image
                src="/art/jaipur-route-hero.webp"
                alt="Imagined Jaipur shared travel scene"
                width={1536}
                height={1024}
                loading="eager"
                sizes="(max-width:800px) 100vw, 55vw"
              />
              <div>
                <Route size={18} />
                <span>
                  Sitapura offices <ArrowRight size={14} /> Jaipur Junction
                </span>
              </div>
            </div>
          )}
          {step === 1 && (
            <section
              className={styles.panel}
              aria-label="Live match demonstration"
            >
              <div className={styles.panelTop}>
                <span>THE TRAVELLERS</span>
                <span>4 seats maximum</span>
              </div>
              {roster(trips.slice(0, 4))}
              {matched ? (
                <div className={styles.matchResult} role="status">
                  <div>
                    <CheckCheck size={26} />
                    <strong>A compatible group.</strong>
                  </div>
                  <div className={styles.metrics}>
                    <span>
                      <strong>{Math.round(original.overlap * 100)}%</strong>
                      directed overlap
                    </span>
                    <span>
                      <strong>{original.maxWait} min</strong>maximum wait
                    </span>
                    <span>
                      <strong>{original.maxDetour} min</strong>added driving
                    </span>
                  </div>
                  <small>
                    Departure and wait, direction, capacity, luggage,
                    preferences and economic benefit evaluated.
                  </small>
                </div>
              ) : (
                <div className={styles.unrevealed}>
                  <Route size={28} />
                  <p>Same road is only the beginning.</p>
                  <span>
                    Can their time windows and hard limits work together?
                  </span>
                </div>
              )}
            </section>
          )}
          {step === 2 && (
            <section
              className={`${styles.panel} ${styles.receipt}`}
              aria-label="Computed fare allocation"
            >
              <div className={styles.panelTop}>
                <span>
                  {total === null
                    ? "ILLUSTRATIVE ROUTE ESTIMATE"
                    : "WHAT-IF GROUP FARE"}
                </span>
                <Wallet size={20} />
              </div>
              <div className={styles.fareTotal}>
                {money(fare)}
                <span>one group total</span>
              </div>
              {total !== null && (
                <label className={styles.fareInput}>
                  Explore another total · ₹
                  <input
                    value={total}
                    inputMode="decimal"
                    onChange={(e) => setTotal(e.target.value)}
                    aria-invalid={!validFare}
                  />
                </label>
              )}
              {!validFare && (
                <p role="alert">
                  Enter ₹0–₹10,00,000 with up to two decimals. Showing the route
                  estimate until valid.
                </p>
              )}
              <div className={styles.fareRows}>
                {allocation.allocations.map((a) => (
                  <div key={a.tripId}>
                    <span>
                      <strong>{firstName(a.name)}</strong>
                      <small>
                        {hubName(
                          active.find((t) => t.id === a.tripId)!.destination,
                        )}
                      </small>
                    </span>
                    <strong data-testid="judge-fare-share">
                      {money(a.paise)}
                    </strong>
                  </div>
                ))}
              </div>
              <div
                className={styles.fareBar}
                role="img"
                aria-label="Fare contributions"
              >
                {allocation.allocations.map((a, i) => (
                  <span
                    key={a.tripId}
                    data-tone={i % 4}
                    style={{ flex: fare ? a.paise : 1 }}
                  />
                ))}
              </div>
              <div className={styles.reconcile}>
                <Check size={18} />
                <span>Sum of shares</span>
                <strong data-testid="judge-fare-sum">
                  {money(
                    allocation.allocations.reduce((n, a) => n + a.paise, 0),
                  )}
                </strong>
              </div>
              <small>
                Distance × seats, with solo caps when feasible. Savings are
                estimates and are not guaranteed.
              </small>
            </section>
          )}
          {step === 3 && (
            <section
              className={styles.panel}
              aria-label="Sandbox consent demonstration"
            >
              <div className={styles.panelTop}>
                <span>SHARED TERMS · VERSION {version}</span>
                <span>
                  {allAccepted ? "Ready in sandbox" : "Awaiting consent"}
                </span>
              </div>
              <div className={styles.consentRing}>
                <span>
                  {accepted.length}
                  <small>/ {active.length}</small>
                </span>
                <p>
                  {allAccepted
                    ? "Everyone is on the same page."
                    : "Every yes counts."}
                </p>
              </div>
              <div className={styles.consentList}>
                {active.map((t) => (
                  <button
                    key={t.id}
                    onClick={() =>
                      setAccepted((a) =>
                        a.includes(t.id)
                          ? a.filter((id) => id !== t.id)
                          : [...a, t.id],
                      )
                    }
                    aria-pressed={accepted.includes(t.id)}
                    aria-label={`Simulate ${firstName(t.name)} consent`}
                  >
                    <span>{firstName(t.name)}</span>
                    <span>
                      {accepted.includes(t.id) ? (
                        <>
                          <Check size={16} /> Approved
                        </>
                      ) : (
                        "Simulate approval"
                      )}
                    </span>
                  </button>
                ))}
              </div>
              <small>
                These are local demonstration toggles. They do not accept terms
                or confirm any persisted group.
              </small>
            </section>
          )}
          {step === 4 && (
            <section
              className={styles.panel}
              aria-label="Computed cancellation recovery"
            >
              <div className={styles.panelTop}>
                <span>TERMS VERSION {version}</span>
                <span>{active.length} / 4 seats</span>
              </div>
              <div className={styles.recoveryStatus}>
                <span className={styles.recoveryIcon}>
                  {replacement ? (
                    <Users size={28} />
                  ) : cancelled ? (
                    <RotateCcw size={28} />
                  ) : (
                    <ShieldCheck size={28} />
                  )}
                </span>
                <h2>
                  {replacement
                    ? "A new traveller fits."
                    : cancelled
                      ? "The group still fits."
                      : "A plan with room to adapt."}
                </h2>
                <p>
                  {cancelled
                    ? "Re-evaluated with the product’s matching function."
                    : "Change the composition. Watch the numbers respond."}
                </p>
              </div>
              <div className={styles.miniRoster}>
                {active.map((t, i) => (
                  <span
                    key={t.id}
                    className={styles.avatar}
                    data-tone={i % 4}
                    title={t.name}
                  >
                    {firstName(t.name)}
                  </span>
                ))}
              </div>
              <div className={styles.metrics}>
                <span>
                  <strong>{money(plan.allocations[0].paise)}</strong>Aarav’s new
                  estimate
                </span>
                <span>
                  <strong>
                    {accepted.length} / {active.length}
                  </strong>
                  current approvals
                </span>
              </div>
              <div className={styles.callout}>
                <Info size={20} />
                <span>
                  {cancelled
                    ? "Previous approvals cleared. Fresh agreement required."
                    : "Try the cancellation before external booking."}
                </span>
              </div>
            </section>
          )}
          {step === 5 && (
            <section
              className={styles.panel}
              aria-label="Live benchmark comparison"
            >
              <div className={styles.panelTop}>
                <span>50 REQUESTS · SEED 42</span>
                <span>Same input set</span>
              </div>
              {result ? (
                <>
                  <h2 className={styles.chartTitle}>Matched travellers</h2>
                  <div className={styles.bars}>
                    {(["baseline", "optimizer"] as const).map((mode) => (
                      <div key={mode}>
                        <span>
                          {mode === "baseline"
                            ? "First come, first served"
                            : "Yatra Sync optimizer"}
                          <strong>
                            {result[mode].matched} / {result[mode].eligible}
                          </strong>
                        </span>
                        <div>
                          <i style={{ width: `${result[mode].matchRate}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.benchmarkRows}>
                    <div>
                      <span>Estimated collective savings</span>
                      <strong>
                        {money(result.baseline.savingPaise)} →{" "}
                        {money(result.optimizer.savingPaise)}
                      </strong>
                    </div>
                    <div>
                      <span>Mean wait</span>
                      <strong>
                        {result.baseline.meanWait} → {result.optimizer.meanWait}{" "}
                        min
                      </strong>
                    </div>
                    <div>
                      <span>Modeled rule violations</span>
                      <strong>
                        {result.baseline.violations} →{" "}
                        {result.optimizer.violations}
                      </strong>
                    </div>
                  </div>
                  <p className={styles.fine}>
                    Computed in this browser. Same seeded graph, modeled fares
                    and hard rules. The optimizer may trade off some metrics.
                    These groups are proposed.
                  </p>
                  <span className={styles.runBadge}>
                    <Check size={14} /> Comparison computed
                  </span>
                </>
              ) : (
                <div className={styles.unrevealed}>
                  <FlaskConical size={36} />
                  <h2>Let the results speak.</h2>
                  <p>Run both algorithms on one reproducible scenario.</p>
                </div>
              )}
            </section>
          )}
          {step === 6 && (
            <div className={styles.finalVisual}>
              <span className={styles.finalOrbit}>
                <Route size={78} strokeWidth={1.25} />
              </span>
              <strong>
                People.
                <br />
                Plan.
                <br />
                <span>Possibility.</span>
              </strong>
              <p>Passenger coordination before you book.</p>
              <span className={styles.finalFine}>
                No live dispatch, identity verification, automatic payments or
                guaranteed savings.
              </span>
            </div>
          )}
        </div>
      </main>
      {message && (
        <div className={styles.message} role="status">
          {message}
          <button onClick={() => setMessage("")} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
      {notes && (
        <aside
          id="presenter-notes"
          className={styles.notes}
          aria-label="Presenter notes"
        >
          <div>
            <span>PRESENTER CUE · {chapter.duration}</span>
            <button
              onClick={() => setNotes(false)}
              aria-label="Close presenter notes"
            >
              <X size={18} />
            </button>
          </div>
          <p>{chapter.note}</p>
        </aside>
      )}
      <footer className={styles.footer}>
        <div className={styles.shortcuts}>
          <Keyboard size={15} />
          <span>← → chapters · N notes</span>
        </div>
        <nav className={styles.chapters} aria-label="Presentation chapters">
          {chapters.map((c, i) => (
            <button
              key={c.label}
              onClick={() => go(i)}
              aria-label={`Chapter ${i + 1}: ${c.label}`}
              aria-current={step === i ? "step" : undefined}
            >
              <i />
              <span>{c.label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.advance}>
          <button
            onClick={() => go(step - 1)}
            disabled={step === 0}
            aria-label="Previous chapter"
          >
            <ArrowLeft size={20} />
          </button>
          <span>{String(step + 1).padStart(2, "0")} / 07</span>
          <button
            onClick={() => go(step + 1)}
            disabled={step === 6}
            aria-label="Next chapter"
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
}
