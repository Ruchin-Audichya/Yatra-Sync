"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeftRight,
  BriefcaseBusiness,
  TrainFront,
  Plane,
  Repeat2,
  Clock3,
  Wallet,
} from "lucide-react";
import { useApp } from "./context";
import { hubs, hubName } from "@/domain/graph";
import { money } from "@/domain/fare";
import { recentRoutes, parseQuote, compareQuote } from "@/domain/commute";
import { time } from "@/lib/client";
import type { Trip } from "@/domain/types";

export function CommuteLauncher({
  trip,
  route,
  onRouteChange,
}: {
  trip?: Trip;
  route: { origin: string; destination: string };
  onRouteChange: (route: { origin: string; destination: string }) => void;
}) {
  const { data } = useApp();
  const router = useRouter();
  const { origin, destination } = route;
  const [leave, setLeave] = useState("15");
  const recent = recentRoutes(data.trips);
  return (
    <section className="panel commute-launcher">
      <div className="section-title">
        <span className="eyebrow">YOUR NEXT JOURNEY</span>
        <span className="pill">Jaipur · 9 hubs</span>
      </div>
      <h2>{trip ? "Your route is ready." : "Where are you heading?"}</h2>
      <p className="muted">
        {trip
          ? "Find compatible people, agree on the plan, then book together."
          : "Before you book a cab, find people going your way."}
      </p>
      {trip ? (
        <>
          <div className="commute-active">
            <strong>{hubName(trip.origin)}</strong>
            <ArrowRight size={18} />
            <strong>{hubName(trip.destination)}</strong>
          </div>
          <p className="commute-meta">
            <Clock3 size={16} /> {time(trip.earliest)}–{time(trip.latest)} IST ·{" "}
            {trip.seats} seat(s) · {trip.luggage} luggage
          </p>
          <Link className="button wide" href="/app/matches">
            Find my co-travellers <ArrowRight size={18} />
          </Link>
          <Link className="text-link spaced" href={`/app/trips/${trip.id}`}>
            Review my route & limits <ArrowRight size={15} />
          </Link>
        </>
      ) : (
        <>
          <div className="commute-intents" aria-label="Journey shortcuts">
            {[
              {
                name: "Office",
                from: "sitapura",
                to: "malviya",
                Icon: BriefcaseBusiness,
              },
              {
                name: "Station",
                from: "junction",
                to: "malviya",
                Icon: TrainFront,
              },
              { name: "Airport", from: "malviya", to: "airport", Icon: Plane },
            ].map(({ name, from, to, Icon }) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onRouteChange({ origin: from, destination: to });
                }}
                aria-pressed={origin === from && destination === to}
              >
                <Icon size={16} />
                {name}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              router.push(
                `/app/trips/new?${new URLSearchParams({ from: origin, to: destination, leave })}`,
              );
            }}
          >
            <div className="commute-route-inputs">
              <label>
                Starting hub
                <select
                  value={origin}
                  onChange={(e) =>
                    onRouteChange({ origin: e.target.value, destination })
                  }
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="commute-swap"
                aria-label="Swap starting hub and destination"
                onClick={() => {
                  onRouteChange({ origin: destination, destination: origin });
                }}
              >
                <ArrowLeftRight size={18} />
              </button>
              <label>
                Going to
                <select
                  value={destination}
                  onChange={(e) =>
                    onRouteChange({ origin, destination: e.target.value })
                  }
                >
                  {hubs.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="commute-departure">
              <legend>When can you leave?</legend>
              <div className="commute-intents">
                {[
                  ["5", "In 5 min"],
                  ["15", "In 15 min"],
                  ["30", "In 30 min"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={leave === value}
                    onClick={() => setLeave(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            {origin === destination && (
              <p role="alert" className="error-text">
                Choose a different destination.
              </p>
            )}
            <button className="button wide" disabled={origin === destination}>
              Find people on this route <ArrowRight size={18} />
            </button>
            <small className="commute-footnote">
              Review your limits before sharing. Nothing is posted yet.
            </small>
          </form>
          {recent.length > 0 && (
            <div className="commute-recents">
              <span className="eyebrow">
                <Repeat2 size={14} /> GOING THAT WAY AGAIN?
              </span>
              {recent.map((r) => (
                <div className="commute-recent" key={r.id}>
                  <div>
                    <strong>
                      {hubName(r.origin)} → {hubName(r.destination)}
                    </strong>
                    <small>
                      Your route & comfort limits. Fresh timing and quote.
                    </small>
                  </div>
                  <div>
                    <Link
                      href={`/app/trips/new?repeat=${encodeURIComponent(r.id)}`}
                    >
                      Repeat <ArrowRight size={14} />
                    </Link>
                    <Link
                      href={`/app/trips/new?repeat=${encodeURIComponent(r.id)}&reverse=1`}
                    >
                      Return <Repeat2 size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

export function QuoteCheck() {
  const [solo, setSolo] = useState(""),
    [shared, setShared] = useState(""),
    [extra, setExtra] = useState("0"),
    [riders, setRiders] = useState(2);
  const soloPaise = parseQuote(solo),
    sharedPaise = parseQuote(shared),
    extraPaise = extra === "0" ? 0 : parseQuote(extra);
  const result =
    soloPaise !== null && sharedPaise !== null && extraPaise !== null
      ? compareQuote(soloPaise, sharedPaise, riders, extraPaise)
      : null;
  return (
    <section className="panel quote-check">
      <div className="section-title">
        <span className="eyebrow">
          <Wallet size={15} /> BEFORE YOU BOOK
        </span>
        <span className="pill">Your quotes</span>
      </div>
      <h2>High fare? Do the maths.</h2>
      <p className="muted">
        Compare quotes from your cab app for the same pickup and drop-off.
      </p>
      <div className="field-grid">
        <label>
          Solo cab quote · ₹
          <input
            inputMode="decimal"
            value={solo}
            onChange={(e) => setSolo(e.target.value)}
            placeholder="e.g. 480"
            aria-invalid={!!solo && soloPaise === null}
          />
        </label>
        <label>
          Whole shared cab quote · ₹
          <input
            inputMode="decimal"
            value={shared}
            onChange={(e) => setShared(e.target.value)}
            placeholder="e.g. 540"
            aria-invalid={!!shared && sharedPaise === null}
          />
        </label>
      </div>
      <fieldset className="commute-departure">
        <legend>People sharing · including you</legend>
        <div className="commute-intents">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              aria-pressed={riders === n}
              onClick={() => setRiders(n)}
            >
              {n} people
            </button>
          ))}
        </div>
      </fieldset>
      <details className="quote-extras">
        <summary>Include tolls, parking or other extras</summary>
        <label>
          Extra cost for the whole cab · ₹
          <input
            inputMode="decimal"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            aria-invalid={extraPaise === null}
          />
        </label>
      </details>
      {((!!solo && soloPaise === null) ||
        (!!shared && sharedPaise === null) ||
        extraPaise === null) && (
        <p role="alert" className="error-text">
          Use amounts up to ₹10,00,000 with at most two decimals. Quotes must be
          greater than zero.
        </p>
      )}
      <div
        className={`quote-result ${result && result.saving <= 0 ? "quote-caution" : ""}`}
        aria-live="polite"
      >
        {result ? (
          <>
            <div>
              <small>Your equal share</small>
              <strong>{money(result.share)}</strong>
            </div>
            <div>
              <small>
                {result.saving > 0
                  ? "Less than your solo quote"
                  : result.saving === 0
                    ? "Same as going solo"
                    : "More than going solo"}
              </small>
              <strong>{money(Math.abs(result.saving))}</strong>
            </div>
          </>
        ) : (
          <p>Add both quotes to see your share and potential saving.</p>
        )}
      </div>
      {result && (
        <p className="quote-threshold">
          {result.saving > 0
            ? "Sharing could help here."
            : "Sharing does not lower your cost at these quotes."}{" "}
          {result.breakEven > 0
            ? `The whole cab quote must stay below ${money(result.breakEven)} for the average share to beat your solo quote, with these extras.`
            : "Extras alone reach the group's combined solo cost."}
        </p>
      )}
      <small className="commute-footnote">
        Manual comparison, not live pricing. Equal seats and the same route
        assumed. Quotes can change before booking.
      </small>
      <Link className="text-link spaced" href="/app/fare">
        Different drop-offs? Split by distance <ArrowRight size={15} />
      </Link>
    </section>
  );
}
