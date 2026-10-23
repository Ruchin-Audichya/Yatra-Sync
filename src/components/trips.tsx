"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Route,
  MapPin,
  Clock3,
  Users,
  ShieldCheck,
  Check,
  Info,
  SlidersHorizontal,
  TrainFront,
  Pencil,
  X,
  ChevronDown,
  Wallet,
} from "lucide-react";
import { useApp } from "./context";
import { Avatar, Status } from "./product";
import { Schematic } from "./map";
import { hubName, hubs, shortestPath } from "@/domain/graph";
import { repeatPreferences } from "@/domain/commute";
import { money, scenarioFare } from "@/domain/fare";
import { date, time, datetimeLocal, fromLocal } from "@/lib/client";
import type { Trip, Plan, GroupData } from "@/domain/types";
export function TripForm({ initial }: { initial?: Trip }) {
  const { data, act, busy, t } = useApp(),
    router = useRouter();
  const [prefillNote, setPrefillNote] = useState("");
  const [step, setStep] = useState(1),
    [origin, setOrigin] = useState(initial?.origin ?? "jecrc"),
    [destination, setDestination] = useState(
      initial?.destination ?? "junction",
    );
  const base = Math.ceil((data.now + 15 * 60000) / 300000) * 300000;
  const [earliest, setEarliest] = useState(
      datetimeLocal(initial?.earliest ?? base),
    ),
    [latest, setLatest] = useState(
      datetimeLocal(initial?.latest ?? base + 30 * 60000),
    );
  const [maxWait, setMaxWait] = useState(initial?.maxWait ?? 20),
    [maxDetour, setMaxDetour] = useState(initial?.maxDetour ?? 12),
    [maxWalk, setMaxWalk] = useState(initial?.maxWalk ?? 500),
    [seats, setSeats] = useState(initial?.seats ?? 1),
    [luggage, setLuggage] = useState<Trip["luggage"]>(
      initial?.luggage ?? "small",
    ),
    [provider, setProvider] = useState<Trip["provider"]>(
      initial?.provider ?? "any",
    ),
    [womenOnly, setWomenOnly] = useState(initial?.womenOnly ?? false);
  const [fare, setFare] = useState(
      initial?.soloPaise !== null && initial?.soloPaise !== undefined
        ? (initial.soloPaise / 100).toFixed(2)
        : "",
    ),
    [fareError, setFareError] = useState(""),
    [train, setTrain] = useState(initial?.trainNumber ?? ""),
    [arrival, setArrival] = useState(
      initial?.trainArrival ? datetimeLocal(initial.trainArrival) : "",
    ),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    if (initial) return;
    const q = new URLSearchParams(window.location.search);
    const previous = data.trips.find((trip) => trip.id === q.get("repeat"));
    if (previous) {
      const prefs = repeatPreferences(previous, q.get("reverse") === "1");
      setOrigin(prefs.origin);
      setDestination(prefs.destination);
      setMaxWait(prefs.maxWait);
      setMaxWalk(prefs.maxWalk);
      setMaxDetour(prefs.maxDetour);
      setSeats(prefs.seats);
      setLuggage(prefs.luggage);
      setProvider(prefs.provider);
      setWomenOnly(prefs.womenOnly && data.user.gender === "woman");
      setPrefillNote(
        "Your route and comfort limits are filled in. Check today's timing and add a fresh cab quote; previous quotes and train details are not reused.",
      );
    } else {
      const from = q.get("from"),
        to = q.get("to");
      if (from && hubs.some((h) => h.id === from)) setOrigin(from);
      if (to && hubs.some((h) => h.id === to)) setDestination(to);
    }
    const lead = Number(q.get("leave"));
    if ([5, 15, 30].includes(lead)) {
      const start = Math.ceil((Date.now() + lead * 60000) / 60000) * 60000;
      setEarliest(datetimeLocal(start));
      setLatest(datetimeLocal(start + 15 * 60000));
    }
    // Apply URL defaults once; background polling must not overwrite edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const scenario = scenarioFare(shortestPath(origin, destination)?.meters ?? 0);
  const selectedFare = fare === "" ? scenario : Math.round(Number(fare) * 100);
  const existing =
    !initial &&
    data.trips.find(
      (x) => ["active", "committed"].includes(x.status) && x.expires > data.now,
    );
  if (existing)
    return (
      <>
        <div className="page-heading">
          <div>
            <h1>One journey at a time.</h1>
            <p>
              You already have an active request. Manage it before creating
              another.
            </p>
          </div>
        </div>
        <Link className="button" href={`/app/trips/${existing.id}`}>
          Open current journey <ArrowRight size={16} />
        </Link>
      </>
    );
  async function submit() {
    setFareError("");
    if (!consent) return;
    if (
      !Number.isFinite(selectedFare) ||
      selectedFare < 0 ||
      !/^\d*(\.\d{0,2})?$/.test(fare)
    ) {
      setFareError(
        "Enter a non-negative amount with at most two decimal places.",
      );
      return;
    }
    const body = {
      origin,
      destination,
      earliest: fromLocal(earliest),
      latest: fromLocal(latest),
      maxWait,
      maxDetour,
      maxWalk,
      seats,
      luggage,
      provider,
      womenOnly,
      soloPaise: selectedFare,
      ...(train ? { trainNumber: train } : {}),
      ...(arrival ? { trainArrival: fromLocal(arrival) } : {}),
    };
    const result = await act<Trip>(
      initial ? `trips/${initial.id}/edit` : "trips",
      body,
      initial
        ? "Journey updated."
        : "Your journey is ready. Let’s find your people.",
    );
    if (result) router.push("/app/matches");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A GOOD JOURNEY STARTS HERE</div>
          <h1>{initial ? "Fine-tune your journey" : t("create")}</h1>
          <p>Your limits matter. We’ll find groups that respect them.</p>
        </div>
        <Link href="/app" className="text-link">
          <X size={17} />
          Close
        </Link>
      </div>
      {prefillNote && (
        <p className="callout">
          <Info size={18} />
          {prefillNote}
        </p>
      )}
      <div className="wizard-layout">
        <div className="panel wizard">
          <div className="wizard-progress">
            {["Your route", "Your preferences", "Review & share"].map(
              (label, i) => (
                <div key={label} className={step >= i + 1 ? "done" : ""}>
                  <span>{step > i + 1 ? <Check size={15} /> : i + 1}</span>
                  <strong>{label}</strong>
                </div>
              ),
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step < 3) setStep(step + 1);
              else submit();
            }}
          >
            {step === 1 && (
              <>
                <div className="form-section-heading">
                  <span className="row-icon">
                    <Route size={22} />
                  </span>
                  <div>
                    <h2>{t("routeTitle")}</h2>
                    <p>Pick a public hub. No exact home address needed.</p>
                  </div>
                </div>
                <div
                  className="commute-intents spaced"
                  aria-label="Departure presets"
                >
                  {[5, 15, 30].map((minutes) => (
                    <button
                      type="button"
                      key={minutes}
                      onClick={() => {
                        const start =
                          Math.ceil((Date.now() + minutes * 60000) / 60000) *
                          60000;
                        setEarliest(datetimeLocal(start));
                        setLatest(datetimeLocal(start + 15 * 60000));
                      }}
                    >
                      Leave in {minutes} min
                    </button>
                  ))}
                </div>
                <div className="field-grid">
                  <label>
                    {t("origin")}
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                    >
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("destination")}
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                    >
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("earliest")}
                    <input
                      type="datetime-local"
                      required
                      value={earliest}
                      onChange={(e) => setEarliest(e.target.value)}
                    />
                  </label>
                  <label>
                    {t("latest")}
                    <input
                      type="datetime-local"
                      required
                      value={latest}
                      min={earliest}
                      onChange={(e) => setLatest(e.target.value)}
                    />
                  </label>
                </div>
                <details className="train-helper">
                  <summary>
                    <TrainFront size={17} />
                    Arriving by train? <span>Manual arrival assist</span>
                  </summary>
                  <div className="field-grid">
                    <label>
                      Train number (optional)
                      <input
                        value={train}
                        onChange={(e) => setTrain(e.target.value)}
                        maxLength={12}
                        placeholder="e.g. 12956"
                      />
                    </label>
                    <label>
                      Expected arrival · IST
                      <input
                        type="datetime-local"
                        value={arrival}
                        onChange={(e) => setArrival(e.target.value)}
                      />
                    </label>
                  </div>
                  <button
                    className="button secondary small"
                    type="button"
                    disabled={!arrival}
                    onClick={() => {
                      const ready = fromLocal(arrival) + 15 * 60000;
                      setEarliest(datetimeLocal(ready));
                      setLatest(datetimeLocal(ready + 30 * 60000));
                    }}
                  >
                    Apply arrival + 15 min buffer
                  </button>
                  <small>User-entered arrival. No live train feed.</small>
                </details>
                <div className="callout">
                  <Info size={17} />
                  <span>
                    All times use Asia/Kolkata. Seeded distances and travel
                    times are illustrative.
                  </span>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <div className="form-section-heading">
                  <span className="row-icon">
                    <SlidersHorizontal size={22} />
                  </span>
                  <div>
                    <h2>{t("limitsTitle")}</h2>
                    <p>Every recommendation must fit these hard constraints.</p>
                  </div>
                </div>
                <div className="field-grid">
                  <label>
                    {t("wait")}
                    <input
                      type="number"
                      min={0}
                      max={120}
                      required
                      value={maxWait}
                      onChange={(e) => setMaxWait(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {t("detour")}
                    <input
                      type="number"
                      min={0}
                      max={60}
                      required
                      value={maxDetour}
                      onChange={(e) => setMaxDetour(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    {t("walk")}
                    <select
                      value={maxWalk}
                      onChange={(e) => setMaxWalk(Number(e.target.value))}
                    >
                      {[0, 250, 500, 1000, 1500, 2000].map((v) => (
                        <option key={v} value={v}>
                          {v} m
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("seats")}
                    <select
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value))}
                    >
                      {[1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>
                          {v} seat(s)
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {t("luggage")}
                    <select
                      value={luggage}
                      onChange={(e) =>
                        setLuggage(e.target.value as Trip["luggage"])
                      }
                    >
                      <option value="small">Small · backpack</option>
                      <option value="medium">Medium · cabin bag</option>
                      <option value="large">Large · suitcase</option>
                    </select>
                  </label>
                  <label>
                    {t("provider")}
                    <select
                      value={provider}
                      onChange={(e) =>
                        setProvider(e.target.value as Trip["provider"])
                      }
                    >
                      <option value="any">Flexible</option>
                      <option value="uber">Uber</option>
                      <option value="ola">Ola</option>
                    </select>
                  </label>
                </div>
                <label className="check-label preference-check">
                  <input
                    type="checkbox"
                    checked={womenOnly}
                    disabled={data.user.gender !== "woman"}
                    onChange={(e) => setWomenOnly(e.target.checked)}
                  />
                  <span>
                    Women-only group requested
                    <small>
                      Uses voluntary self-declarations. No identity
                      verification.
                    </small>
                  </span>
                </label>
                {data.user.gender !== "woman" && (
                  <small className="muted">
                    Available after voluntary self-declaration as a woman in
                    your profile.
                  </small>
                )}
                <label className="fare-field">
                  {t("solo")}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fare}
                    placeholder={(scenario / 100).toFixed(2)}
                    onChange={(e) => setFare(e.target.value)}
                  />
                  <small>
                    Optional manual quote. Blank uses illustrative graph
                    estimate of {money(scenario)}. No official provider prices.
                  </small>
                </label>
              </>
            )}
            {step === 3 && (
              <>
                <div className="form-section-heading">
                  <span className="row-icon">
                    <Check size={22} />
                  </span>
                  <div>
                    <h2>{t("reviewTitle")}</h2>
                    <p>Review before sharing with your opted-in community.</p>
                  </div>
                </div>
                <div className="review-route">
                  <div>
                    <span className="eyebrow">FROM</span>
                    <h3>{hubName(origin)}</h3>
                  </div>
                  <ArrowRight size={22} />
                  <div>
                    <span className="eyebrow">TO</span>
                    <h3>{hubName(destination)}</h3>
                  </div>
                </div>
                <div className="review-grid">
                  <div>
                    <span>Departure window</span>
                    <strong>
                      {date(fromLocal(earliest))}
                      <br />
                      {time(fromLocal(earliest))} – {time(fromLocal(latest))}
                    </strong>
                  </div>
                  <div>
                    <span>Your hard limits</span>
                    <strong>
                      {maxWait} min wait · {maxDetour} min detour
                      <br />
                      {maxWalk} m pickup walk
                    </strong>
                  </div>
                  <div>
                    <span>Passengers & luggage</span>
                    <strong>
                      {seats} seat(s) · {luggage} bags
                    </strong>
                  </div>
                  <div>
                    <span>Solo estimate</span>
                    <strong>
                      {money(selectedFare)}{" "}
                      <small>
                        {fare === "" ? "Illustrative" : "User-entered"}
                      </small>
                    </strong>
                  </div>
                </div>
                <label className="check-label consent-box">
                  <input
                    required
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>{t("discoveryConsent")}</span>
                </label>
                {fareError && (
                  <p role="alert" className="error-text">
                    {fareError}
                  </p>
                )}
                <p className="muted small-text">
                  Your request expires at your latest departure. You may edit or
                  cancel while unreserved.
                </p>
              </>
            )}
            <div className="wizard-actions">
              {step > 1 ? (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setStep(step - 1)}
                >
                  <ArrowLeft size={16} />
                  {t("back")}
                </button>
              ) : (
                <Link href="/app" className="text-link">
                  Cancel
                </Link>
              )}
              <button
                className="button"
                disabled={busy || (step === 1 && origin === destination)}
              >
                {step === 3 ? (initial ? t("save") : t("find")) : t("next")}
                <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </div>
        <aside className="wizard-side">
          <Schematic
            origin={origin}
            destination={destination}
            onSelect={(id) => {
              if (step === 1) setDestination(id);
            }}
          />
          <div className="panel">
            <ShieldCheck size={24} />
            <h3>Small details. Better matches.</h3>
            <p>
              A realistic departure window and luggage choice help everyone make
              a plan that works.
            </p>
            <small>
              Hub map is illustrative. No GPS or continuous tracking.
            </small>
          </div>
        </aside>
      </div>
    </>
  );
}
export function TripDetails({ tripId }: { tripId: string }) {
  const { data, act, t } = useApp();
  const [edit, setEdit] = useState(false);
  const trip = data.trips.find((t) => t.id === tripId);
  if (!trip)
    return (
      <div className="empty">
        <h1>Journey not found.</h1>
        <p>This request is unavailable to your account.</p>
        <Link href="/app/history" className="button">
          My journeys
        </Link>
      </div>
    );
  if (edit) return <TripForm initial={trip} />;
  const group = data.groups.find(
    (g) => !["CANCELLED", "EXPIRED", "DECLINED"].includes(g.status),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR JOURNEY</div>
          <h1>
            {hubName(trip.origin)} <span className="muted">→</span>{" "}
            {hubName(trip.destination)}
          </h1>
          <p>
            {date(trip.earliest)} · {time(trip.earliest)} – {time(trip.latest)}{" "}
            IST
          </p>
        </div>
        <Status value={trip.status} />
      </div>
      <div className="two-column">
        <div>
          <div className="panel">
            <h2>The plan at a glance</h2>
            <div className="review-grid">
              <div>
                <span>Wait tolerance</span>
                <strong>{trip.maxWait} minutes</strong>
              </div>
              <div>
                <span>Detour tolerance</span>
                <strong>{trip.maxDetour} minutes</strong>
              </div>
              <div>
                <span>Seats & bags</span>
                <strong>
                  {trip.seats} · {trip.luggage}
                </strong>
              </div>
              <div>
                <span>Maximum pickup walk</span>
                <strong>{trip.maxWalk} m</strong>
              </div>
              <div>
                <span>Solo estimate</span>
                <strong>
                  {trip.soloPaise === null
                    ? "Not provided"
                    : money(trip.soloPaise)}
                </strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>
                  {trip.provider === "any" ? "Flexible" : trip.provider}
                </strong>
              </div>
            </div>
            <div className="action-wrap">
              {trip.status === "active" && (
                <>
                  <Link className="button" href="/app/matches">
                    Find co-travellers <Users size={16} />
                  </Link>
                  <button
                    className="button secondary"
                    onClick={() => setEdit(true)}
                  >
                    <Pencil size={16} />
                    Edit request
                  </button>
                </>
              )}
              {trip.status === "committed" && group && (
                <Link className="button" href={`/app/groups/${group.id}`}>
                  Open travel circle <ArrowRight size={16} />
                </Link>
              )}
              {["active", "committed"].includes(trip.status) && (
                <button
                  className="button ghost danger-text"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this request? Any pending group terms will be recalculated.",
                      )
                    )
                      act(
                        `trips/${trip.id}/cancel`,
                        {},
                        "Request cancelled.",
                        "/app/history",
                      );
                  }}
                >
                  {t("cancel")}
                </button>
              )}
            </div>
          </div>
          <div className="callout spaced">
            <Info size={18} />
            <span>
              Fare is an illustrative or user-entered estimate. Your cab
              provider sets the actual fare.
            </span>
          </div>
        </div>
        <Schematic origin={trip.origin} destination={trip.destination} />
      </div>
    </>
  );
}
export function MatchList({ compact = false }: { compact?: boolean }) {
  const { data, t } = useApp();
  const [sort, setSort] = useState("fit"),
    [size, setSize] = useState(0);
  const trip = data.trips.find(
    (t) => t.status === "active" && t.expires > data.now,
  );
  const group = data.groups.find(
    (g) =>
      !["CANCELLED", "EXPIRED", "DECLINED", "COMPLETED_SELF_REPORTED"].includes(
        g.status,
      ),
  );
  const plans = compact
    ? data.matches.slice(0, 2)
    : data.matches
        .filter((p) => !size || p.trips.length === size)
        .slice()
        .sort((a, b) =>
          sort === "price"
            ? (a.allocations.find((x) => x.ownerId === data.user.id)?.paise ??
                0) -
              (b.allocations.find((x) => x.ownerId === data.user.id)?.paise ??
                0)
            : sort === "departure"
              ? a.departure - b.departure
              : 0,
        );
  const route = trip ? shortestPath(trip.origin, trip.destination) : null;
  const results = (
    <>
      {!plans.length ? (
        <div className="panel empty empty-matches">
          <div className="empty-icon">
            <Users size={30} />
          </div>
          <h3>
            {group
              ? "Your circle is waiting for you"
              : trip
                ? "No compatible group right now"
                : "Your people start with your plan"}
          </h3>
          <p>
            {group
              ? "Review your invitation or current group before joining another."
              : size && data.matches.length
                ? "No proposed groups match that size. Try another group-size filter."
                : data.matchReason}
          </p>
          <Link
            className="button secondary"
            href={
              group
                ? `/app/groups/${group.id}`
                : trip
                  ? `/app/trips/${trip.id}`
                  : "/app/trips/new"
            }
          >
            {group
              ? "Open travel circle"
              : trip
                ? "Adjust my request"
                : t("create")}
            <ArrowUpRight size={16} />
          </Link>
          {trip && !group && (
            <small className="muted">
              Suggestions refresh every 5 seconds. Keep your real deadline in
              mind.
            </small>
          )}
        </div>
      ) : (
        <div className={compact ? "match-grid" : "match-full-list"}>
          {plans.map((p, i) => (
            <MatchCard
              key={p.trips.map((t) => t.id).join()}
              plan={p}
              index={i}
              compact={compact}
            />
          ))}
        </div>
      )}
    </>
  );
  if (compact) return results;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Route size={15} />
            SAME DIRECTION. A BETTER WAY TO GO.
          </div>
          <h1>{t("matches")}</h1>
          <p>Your corridor, your comfort limits. Find a circle that fits.</p>
        </div>
        {trip && (
          <Link href={`/app/trips/${trip.id}`} className="button secondary">
            <SlidersHorizontal size={17} />
            Edit my request
          </Link>
        )}
      </div>
      <div className="discovery-layout">
        <section className="discovery-results">
          {trip && (
            <section className="panel route-query">
              <div className="section-title">
                <span className="eyebrow">YOUR JOURNEY PARAMETERS</span>
                <span className="pill">Request active</span>
              </div>
              <div className="route-stop-fields">
                <div className="route-stop">
                  <span className="stop-node" />
                  <div>
                    <small>ORIGIN</small>
                    <strong>{hubName(trip.origin)}</strong>
                  </div>
                  <TrainFront size={19} />
                </div>
                <div className="route-stop">
                  <span className="stop-node destination-node" />
                  <div>
                    <small>DROP-OFF</small>
                    <strong>{hubName(trip.destination)}</strong>
                  </div>
                  <MapPin size={19} />
                </div>
              </div>
              <div className="planner-details">
                <div>
                  <Clock3 size={17} />
                  <span>
                    <small>DEPARTURE WINDOW</small>
                    <strong>
                      {time(trip.earliest)} – {time(trip.latest)}
                    </strong>
                  </span>
                </div>
                <div>
                  <Users size={17} />
                  <span>
                    <small>YOUR PARTY</small>
                    <strong>
                      {trip.seats} seat(s) · {trip.luggage} luggage
                    </strong>
                  </span>
                </div>
              </div>
              <div className="constraint-chips">
                <span>
                  <Check size={13} />
                  {trip.maxWait} min max wait
                </span>
                <span>
                  <Route size={13} />
                  {trip.maxDetour} min max detour
                </span>
                <span>
                  <MapPin size={13} />
                  {trip.maxWalk} m max walk
                </span>
              </div>
            </section>
          )}
          <div className="discovery-tools">
            <div>
              <strong>
                {plans.length} compatible{" "}
                {plans.length === 1 ? "group" : "groups"}
              </strong>
              <small>Every hard constraint checked</small>
            </div>
            <label>
              Sort groups
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="fit">Recommended fit</option>
                <option value="price">Lowest estimated share</option>
                <option value="departure">Earliest departure</option>
              </select>
            </label>
          </div>
          {data.matches.length > 0 && (
            <fieldset className="group-size-filter">
              <legend>Group size</legend>
              {[0, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setSize(n)}
                  aria-pressed={size === n}
                  className={size === n ? "selected" : ""}
                >
                  {n ? `${n} riders` : "All groups"}
                </button>
              ))}
            </fieldset>
          )}
          {results}
        </section>
        <aside className="discovery-map-column">
          <div className="discovery-map">
            <div className="map-insight">
              <span>
                <i />
                DIRECTED CORRIDOR EXPLORER
              </span>
              <span className="pill">Jaipur</span>
            </div>
            <Schematic
              origin={trip?.origin ?? "jecrc"}
              destination={trip?.destination ?? "junction"}
              large
            />
            <div className="map-card">
              <div>
                <small>YOUR STANDALONE ROUTE</small>
                <strong>
                  {route
                    ? `${(route.meters / 1000).toFixed(1)} km · ${route.minutes} min`
                    : "9 public meeting hubs"}
                </strong>
                <span>Illustrative graph · verify actual travel details</span>
              </div>
              <Link className="button small" href="/app/fare">
                Explore FairSplit <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <div className="discovery-promises">
            <div>
              <Users size={21} />
              <strong>Consent, together</strong>
              <p>Every rider reviews the same current group terms.</p>
            </div>
            <div>
              <Wallet size={21} />
              <strong>A transparent split</strong>
              <p>See the estimates. Review the actual fare before settling.</p>
            </div>
            <div>
              <ShieldCheck size={21} />
              <strong>Your details, protected</strong>
              <p>Meeting points unlock after everyone accepts.</p>
            </div>
          </div>
        </aside>
      </div>
      <div className="callout spaced">
        <Info size={18} />
        <span>
          Compatibility is a deterministic ranking, not a probability. Routes,
          times and estimates are illustrative. Booking and payments remain in
          your hands.
        </span>
      </div>
    </>
  );
}
function MatchCard({
  plan,
  index,
  compact,
}: {
  plan: Plan;
  index: number;
  compact: boolean;
}) {
  const { data, act, busy, t } = useApp(),
    router = useRouter();
  const own = plan.allocations.find((a) => a.ownerId === data.user.id)!;
  const [departure, setDeparture] = useState(plan.departure),
    [expanded, setExpanded] = useState(false);
  const others = plan.trips.filter((t) => t.ownerId !== data.user.id);
  async function invite() {
    const g = await act<GroupData>(
      "groups",
      { tripIds: plan.trips.map((t) => t.id), departure },
      "Invitation created. Everyone must explicitly accept.",
    );
    if (g) router.push(`/app/groups/${g.id}`);
  }
  return (
    <article className={`match-card ${index === 0 ? "best-match" : ""}`}>
      <div className="match-card-top">
        <span className={`match-tag ${index === 0 ? "teal" : ""}`}>
          {index === 0 ? "TOP COMPATIBLE GROUP" : `OPTION ${index + 1}`}
        </span>
        <span className="score">
          {plan.score}
          <small>/100 fit</small>
        </span>
      </div>
      <div className="match-people">
        <div className="avatar-stack">
          {plan.trips.map((t) => (
            <Avatar key={t.id} name={t.name} />
          ))}
        </div>
        <div>
          <h3>
            {others.map((t) => t.name.split(" ")[0]).join(", ")}{" "}
            <span className="muted">& you</span>
          </h3>
          <span>
            {plan.trips.length} passengers ·{" "}
            {plan.trips.reduce((s, t) => s + t.seats, 0)} seats ·{" "}
            {data.user.synthetic ? "Synthetic people" : "Unverified members"}
          </span>
        </div>
      </div>
      <div className="match-route">
        <MapPin size={15} />
        <span>{hubName(plan.trips[0].origin)}</span>
        <ArrowRight size={14} />
        <strong>
          {hubName(plan.path.hubs.at(-1) ?? plan.trips[0].destination)}
        </strong>
      </div>
      {!compact && (
        <div className="match-roster">
          {plan.trips.map((member) => (
            <div key={member.id}>
              <Avatar name={member.name} small />
              <span>
                <strong>
                  {member.name}
                  {member.ownerId === data.user.id ? " (you)" : ""}
                </strong>
                <small>To {hubName(member.destination)}</small>
              </span>
              <span className="pill">{member.seats} seat(s)</span>
            </div>
          ))}
        </div>
      )}
      <div className="match-metrics">
        <span>
          <Route size={15} />
          <strong>{Math.round(plan.overlap * 100)}%</strong> shared corridor
        </span>
        <span>
          <Clock3 size={15} />
          <strong>{Math.round(plan.maxWait)} min</strong> max wait
        </span>
        <span>
          <Check size={15} />
          <strong>{plan.maxDetour} min</strong> detour
        </span>
      </div>
      {!compact && (
        <div className="seat-capacity">
          <span>
            {[0, 1, 2, 3].map((i) => (
              <i
                key={i}
                className={
                  i < plan.trips.reduce((sum, t) => sum + t.seats, 0)
                    ? "filled"
                    : ""
                }
              />
            ))}
          </span>
          <small>
            {plan.trips.reduce((sum, t) => sum + t.seats, 0)} of 4 passenger
            seats planned
          </small>
        </div>
      )}
      {!compact && (
        <label className="departure-select">
          Suggested departure · inside every hard limit
          <select
            value={departure}
            onChange={(e) => setDeparture(Number(e.target.value))}
          >
            {plan.departureOptions.map((d) => (
              <option value={d} key={d}>
                {time(d)} IST · max wait{" "}
                {Math.round(
                  Math.max(...plan.trips.map((t) => (d - t.earliest) / 60000)),
                )}{" "}
                min
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="match-card-bottom">
        <div>
          <small>YOUR ESTIMATED SHARE</small>
          <strong>
            {money(own.paise)}
            <span> / trip</span>
          </strong>
          {own.savingPaise !== null && (
            <span className="saving">
              {own.savingPaise === 0
                ? "At your solo estimate"
                : `${money(own.savingPaise)} below your solo estimate`}
            </span>
          )}
        </div>
        <button
          className="button secondary small"
          onClick={invite}
          disabled={busy}
        >
          {t("invite")} <ArrowUpRight size={15} />
        </button>
      </div>
      <button
        className="explain-button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <Info size={13} />
        Why this group fits <ChevronDown size={14} />
      </button>
      {expanded && (
        <div className="match-explanation">
          {plan.reasons.map((r) => (
            <span key={r}>
              <Check size={13} />
              {r}
            </span>
          ))}
          <p>
            Distance × seat proportional split, with solo caps when feasible.
            Shared estimate {money(plan.farePaise)}; exact paise reconciliation.
            Pickup revealed after consent.
          </p>
        </div>
      )}
    </article>
  );
}
