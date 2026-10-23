"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Users,
  ShieldCheck,
  MapPin,
  Clock3,
  Check,
  Send,
  Flag,
  Wallet,
  Info,
  Copy,
  ExternalLink,
  RefreshCw,
  UserPlus,
  X,
  Route,
} from "lucide-react";
import { useApp } from "./context";
import { Avatar, Status } from "./product";
import { AllocationMeter } from "./fare-planner";
import { api, time, date } from "@/lib/client";
import { hubName } from "@/domain/graph";
import { money } from "@/domain/fare";
import type { groupRoom } from "@/lib/service";
type Room = ReturnType<typeof groupRoom>;
export function GroupRoom({ groupId }: { groupId: string }) {
  const { data, act, busy, t } = useApp();
  const router = useRouter();
  const q = useQuery({
    queryKey: ["room", groupId, data.user.id],
    queryFn: () => api<Room>(`groups/${groupId}`),
    refetchInterval: 4000,
  });
  const [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [actual, setActual] = useState(""),
    [reference, setReference] = useState(""),
    [copied, setCopied] = useState(false);
  if (q.isLoading)
    return (
      <div className="empty">
        <span className="spinner" />
        <p>Loading current group terms…</p>
      </div>
    );
  if (q.error || !q.data)
    return (
      <div className="empty panel">
        <Users size={32} />
        <h1>This circle is unavailable.</h1>
        <p>{q.error?.message ?? "Try another group."}</p>
        <Link className="button secondary" href="/app/history">
          My journeys
        </Link>
      </div>
    );
  const { group: g, members, messages, events, replacements } = q.data;
  const me = members.find((m) => m.userId === data.user.id)!;
  const accepted = members.filter(
    (m) => m.acceptedVersion === g.version,
  ).length;
  const host = members.find((m) => m.userId === g.hostId)!;
  const own = g.plan.allocations.find((a) => a.ownerId === data.user.id);
  const isHost = g.hostId === data.user.id;
  const beforeBooking = ["ACCEPTING", "CONFIRMED", "BOOKING_PENDING"].includes(
      g.status,
    ),
    booked = [
      "BOOKED_SELF_REPORTED",
      "IN_PROGRESS_SELF_REPORTED",
      "COMPLETED_SELF_REPORTED",
    ].includes(g.status),
    archived = ["CANCELLED", "EXPIRED", "DECLINED"].includes(g.status);
  const allFare = members.every((m) => m.fareAcceptedVersion === g.fareVersion);
  const action = (name: string, body: unknown, feedback?: string) =>
    act(`groups/${groupId}/${name}`, body, feedback);
  const progress = [
    "ACCEPTING",
    "CONFIRMED",
    "BOOKING_PENDING",
    "BOOKED_SELF_REPORTED",
    "IN_PROGRESS_SELF_REPORTED",
    "COMPLETED_SELF_REPORTED",
  ];
  const stage = progress.indexOf(g.status);
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(
        `Yatra Sync · ${g.actualPaise === null ? "Estimated" : "Manually entered actual"} total ${money(g.actualPaise ?? g.plan.farePaise)}\n${g.plan.allocations.map((a) => `${a.name}: ${money(a.paise)}`).join("\n")}\nPay the nominated booking member ${host.name} directly after checking recipient details. All settlement is self-reported.`,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR TRAVEL CIRCLE · TERMS V{g.version}</div>
          <h1>A shared plan. Everyone’s say.</h1>
          <p>
            {date(g.plan.departure)} · {time(g.plan.departure)} IST ·{" "}
            {members.length} passengers ·{" "}
            {data.user.synthetic ? "Synthetic demo" : "Unverified members"}
          </p>
        </div>
        <Status value={g.status} />
      </div>
      <div className="room-summary">
        <div>
          <Route size={23} />
          <span>
            <small>YOUR SHARED CORRIDOR</small>
            <strong>
              {hubName(g.plan.trips[0].origin)} <ArrowRight size={16} />{" "}
              {hubName(g.plan.trips[0].destination)}
            </strong>
          </span>
        </div>
        <div>
          <Clock3 size={20} />
          <span>
            <small>AGREED DEPARTURE</small>
            <strong>{time(g.plan.departure)} IST</strong>
          </span>
        </div>
        <div className="room-summary-fare">
          <Wallet size={20} />
          <span>
            <small>
              {g.actualPaise === null
                ? "YOUR ESTIMATED SHARE"
                : "YOUR ACTUAL-FARE SHARE"}
            </small>
            <strong>{money(own?.paise ?? 0)}</strong>
          </span>
        </div>
      </div>
      <div className="group-progress">
        {[
          "Review & agree",
          "Group confirmed",
          "Book externally",
          "Booked · self-reported",
          "On the way",
          "Completed",
        ].map((s, i) => (
          <div key={s} className={stage >= i ? "done" : ""}>
            <span>{stage > i ? <Check size={13} /> : i + 1}</span>
            <small>{s}</small>
          </div>
        ))}
      </div>
      {archived && (
        <div className="callout warning">
          <Info size={20} />
          <span>
            This group is {g.status.toLowerCase()}. Prior shares and approvals
            are void. Find a new group from your active request.
          </span>
        </div>
      )}
      <div className="room-layout">
        <div className="room-main">
          <section className="panel group-plan">
            <div className="section-title">
              <h2>The journey we’re sharing</h2>
              <span className="pill">
                {Math.round(g.plan.overlap * 100)}% shared corridor
              </span>
            </div>
            <div className="review-route">
              <div>
                <span className="eyebrow">STARTING CORRIDOR</span>
                <h3>{hubName(g.plan.trips[0].origin)}</h3>
              </div>
              <ArrowRight size={22} />
              <div>
                <span className="eyebrow">DEPARTURE</span>
                <h3>{time(g.plan.departure)} IST</h3>
              </div>
            </div>
            <div className="meeting-point">
              <span className="row-icon">
                <MapPin size={21} />
              </span>
              <div>
                <strong>
                  {g.plan.pickup
                    ? hubName(g.plan.pickup)
                    : "Meeting point shared after mutual consent"}
                </strong>
                <small>
                  {g.plan.pickup
                    ? "Public hub · illustrative location; verify on the ground."
                    : "Every passenger must accept the current terms first."}
                </small>
              </div>
              {g.plan.pickup ? <Check size={20} /> : <ShieldCheck size={20} />}
            </div>
            <div className="mini-constraints">
              <span>
                <Clock3 size={14} />
                {Math.round(g.plan.maxWait)} min max wait
              </span>
              <span>
                <Route size={14} />
                {g.plan.maxDetour} min max detour
              </span>
              <span>
                <MapPin size={14} />
                {g.plan.maxWalk} m max walk
              </span>
            </div>
            <div className="members-heading">
              <h3>Your circle</h3>
              <span>
                {accepted}/{members.length} current acceptances
              </span>
            </div>
            {members.map((m) => (
              <div className="member-row" key={m.userId}>
                <Avatar name={m.name} />
                <div className="grow">
                  <strong>
                    {m.name}
                    {m.userId === data.user.id && (
                      <span className="muted"> (you)</span>
                    )}
                  </strong>
                  <small>
                    {m.userId === g.hostId ? "Nominated booking member · " : ""}
                    {hubName(
                      g.plan.trips.find((t) => t.ownerId === m.userId)!
                        .destination,
                    )}
                  </small>
                </div>
                <Status
                  value={
                    m.acceptedVersion === g.version
                      ? "CONFIRMED"
                      : "awaiting consent"
                  }
                />
                {m.userId !== data.user.id && (
                  <Link
                    href={`/app/reports/new?target=${encodeURIComponent(m.userId)}`}
                    aria-label={`Report ${m.name}`}
                    className="icon-btn"
                  >
                    <Flag size={15} />
                  </Link>
                )}
              </div>
            ))}
            {g.status === "ACCEPTING" && me.acceptedVersion !== g.version && (
              <div className="consent-panel">
                <h3>Review the same plan, together.</h3>
                <p>
                  Your consent covers this composition, departure, public pickup
                  method, nominated booking member ({host.name}), and distance ×
                  seat fare method. Changes require fresh consent.
                </p>
                <label className="check-label">
                  <input
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    type="checkbox"
                  />
                  {t("consent")}
                </label>
                <button
                  className="button"
                  disabled={!consent || busy}
                  onClick={async () => {
                    const ok = await action(
                      "accept",
                      { version: g.version },
                      "Current group terms accepted.",
                    );
                    if (ok) setConsent(false);
                  }}
                >
                  <Check size={16} />
                  {t("accept")}
                </button>
              </div>
            )}
            {g.status === "ACCEPTING" && me.acceptedVersion === g.version && (
              <div className="callout">
                <Check size={18} />
                <span>
                  You’ve accepted version {g.version}. Waiting for the remaining
                  passengers.
                </span>
              </div>
            )}
            {beforeBooking && (
              <div className="group-bottom-actions">
                <button
                  className="text-link danger-text"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Leave this circle? Remaining passengers must review recalculated terms. Your trip will return to discovery.",
                      )
                    )
                      action(
                        "leave",
                        {},
                        "Left group. Matches are ready again.",
                      ).then((ok) => {
                        if (ok) router.push("/app/matches");
                      });
                  }}
                >
                  <X size={15} />
                  {t("leave")}
                </button>
                <small>
                  Prior approvals are invalidated after a passenger change.
                </small>
              </div>
            )}
          </section>
          {replacements.length > 0 && beforeBooking && (
            <section className="panel spaced">
              <div className="section-title">
                <h3>Room for a replacement?</h3>
                <UserPlus size={20} />
              </div>
              <p className="muted small-text">
                These active requests fit the remaining group. Inviting changes
                terms and resets everyone’s consent.
              </p>
              {replacements.map((r) => (
                <div className="list-row" key={r.id}>
                  <Avatar name={r.name} small />
                  <strong className="grow">{r.name}</strong>
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() =>
                      action(
                        "replace",
                        { tripId: r.id },
                        "Replacement invited. Everyone must accept new terms.",
                      )
                    }
                  >
                    Invite <UserPlus size={14} />
                  </button>
                </div>
              ))}
            </section>
          )}
          <section className="panel spaced thread-panel">
            <div className="section-title chat-title">
              <h2>Coordinate with your circle</h2>
              <span className="pill">Group only</span>
            </div>
            <p className="muted small-text">
              Keep sensitive details off the thread. Report or block unwanted
              contact.
            </p>
            <div className="messages" aria-live="polite">
              {!messages.length && (
                <div className="empty small-empty">
                  <Users size={24} />
                  <p>Say hello and agree on the little details.</p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  className={`message ${m.userId === data.user.id ? "own-message" : ""}`}
                  key={m.id}
                >
                  <Avatar name={m.name} small />
                  <div>
                    <span>
                      {m.name} <small>{time(m.created)}</small>
                    </span>
                    <p>{m.body}</p>
                  </div>
                </div>
              ))}
            </div>
            {!archived && g.status !== "COMPLETED_SELF_REPORTED" && (
              <div
                className="commute-intents chat-prompts"
                aria-label="Suggested messages"
              >
                {[
                  "I'm ready to leave.",
                  "Where should we meet?",
                  "Please confirm the cab quote before booking.",
                ].map((text) => (
                  <button
                    type="button"
                    key={text}
                    onClick={() => setMessage(text)}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
            <form
              className="message-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await action("messages", { body: message })) setMessage("");
              }}
            >
              <input
                aria-label="Message your group"
                placeholder="Say hello to your co-travellers…"
                required
                maxLength={1000}
                value={message}
                disabled={archived || g.status === "COMPLETED_SELF_REPORTED"}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button
                className="button"
                aria-label="Send message"
                disabled={
                  busy ||
                  !message.trim() ||
                  archived ||
                  g.status === "COMPLETED_SELF_REPORTED"
                }
              >
                <Send size={18} />
              </button>
            </form>
          </section>
          <section className="panel spaced">
            <h3>The group timeline</h3>
            <div className="timeline">
              {events.map((e) => (
                <div key={e.id}>
                  <i />
                  <div>
                    <strong>{e.kind.replaceAll("_", " ").toLowerCase()}</strong>
                    <p>{e.body}</p>
                    <small>{time(e.created)}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="room-side">
          <section className="panel fare-panel">
            <div className="section-title">
              <h2>The fair share</h2>
              <Wallet size={22} />
            </div>
            <span className="eyebrow">
              {g.actualPaise === null
                ? "ILLUSTRATIVE GROUP ESTIMATE"
                : "MANUALLY ENTERED ACTUAL FARE"}
            </span>
            <div className="total-fare">
              {money(g.actualPaise ?? g.plan.farePaise)}
            </div>
            {g.actualPaise !== null && (
              <p className="muted small-text">
                Original group estimate: {money(g.plan.farePaise)}
              </p>
            )}
            <p className="muted small-text">
              Standalone route distance × seats, capped at comparable solo
              estimates when feasible. Leftover paise are assigned
              deterministically.
            </p>
            <AllocationMeter
              amounts={g.plan.allocations.map((a) => a.paise)}
              names={g.plan.allocations.map((a) => a.name.split(" ")[0])}
            />
            <div className="fare-lines">
              {g.plan.allocations.map((a) => (
                <div key={a.ownerId}>
                  <span>
                    {a.name.split(" ")[0]}
                    {a.ownerId === data.user.id ? " (you)" : ""}
                    <small>
                      {hubName(
                        g.plan.trips.find((t) => t.id === a.tripId)!
                          .destination,
                      )}
                    </small>
                  </span>
                  <strong>{money(a.paise)}</strong>
                </div>
              ))}
            </div>
            <div className="fare-total">
              <span>Exact total</span>
              <strong>
                {money(g.plan.allocations.reduce((s, a) => s + a.paise, 0))}
              </strong>
            </div>
            {g.plan.beneficial ? (
              <div className="fare-benefit">
                <Check size={16} />
                {own?.savingPaise !== null
                  ? own?.savingPaise === 0
                    ? "At your solo estimate"
                    : `${money(own?.savingPaise ?? 0)} below your solo estimate`
                  : "Comparable solo caps respected"}
              </div>
            ) : (
              <div className="callout warning">
                Not economically beneficial to all. Review changed actual-fare
                shares; no universal savings claim.
              </div>
            )}
            {booked && (
              <>
                <form
                  className="actual-fare-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (/^\d+(\.\d{1,2})?$/.test(actual))
                      action(
                        "fare",
                        {
                          paise: Math.round(Number(actual) * 100),
                          version: g.version,
                        },
                        "Actual fare updated. All members must review again.",
                      );
                  }}
                >
                  <label>
                    {t("actual")}
                    <input
                      required
                      inputMode="decimal"
                      pattern="[0-9]+(\.[0-9]{1,2})?"
                      value={actual}
                      onChange={(e) => setActual(e.target.value)}
                      placeholder="e.g. 640.25"
                    />
                  </label>
                  <button className="button secondary wide" disabled={busy}>
                    <RefreshCw size={15} />
                    {t("recalculate")}
                  </button>
                </form>
                {g.actualPaise !== null && (
                  <div className="fare-review">
                    <p>
                      {
                        members.filter(
                          (m) => m.fareAcceptedVersion === g.fareVersion,
                        ).length
                      }
                      /{members.length} reviewed actual fare v{g.fareVersion}
                    </p>
                    <button
                      className="button wide"
                      disabled={
                        busy || me.fareAcceptedVersion === g.fareVersion
                      }
                      onClick={() =>
                        action(
                          "fare-accept",
                          { version: g.fareVersion },
                          "Current actual-fare shares accepted.",
                        )
                      }
                    >
                      <Check size={16} />
                      {me.fareAcceptedVersion === g.fareVersion
                        ? "You reviewed this fare"
                        : t("acceptFare")}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
          <section className="panel spaced booking-panel">
            <span className="row-icon warm">
              <ExternalLink size={20} />
            </span>
            <h3>Booking stays in your hands.</h3>
            <p>{t("booking")}</p>
            <div className="booking-host">
              <Avatar name={host.name} small />
              <span>
                <small>Nominated booking member</small>
                <strong>{host.name}</strong>
              </span>
            </div>
            {g.status === "ACCEPTING" && (
              <div className="callout">
                <Info size={16} />
                <span>Everyone must accept before booking handoff.</span>
              </div>
            )}
            {g.status === "CONFIRMED" &&
              (isHost ? (
                <button
                  className="button wide"
                  disabled={busy}
                  onClick={() =>
                    action(
                      "transition",
                      { version: g.version, status: "BOOKING_PENDING" },
                      "Ready for manual external booking.",
                    )
                  }
                >
                  {t("prepare")} <ArrowUpRight size={15} />
                </button>
              ) : (
                <p className="callout">
                  Waiting for {host.name.split(" ")[0]} to prepare the booking.
                </p>
              ))}
            {g.status === "BOOKING_PENDING" && (
              <>
                <a
                  className="button secondary wide"
                  href={
                    g.provider === "ola"
                      ? "https://www.olacabs.com/"
                      : "https://www.uber.com/in/en/ride/"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open {g.provider === "ola" ? "Ola" : "Uber"} website{" "}
                  <ExternalLink size={15} />
                </a>
                <p className="muted small-text">
                  Check local availability, passenger/luggage capacity and
                  provider permissions. Opening this link does not book a cab.
                </p>
                {isHost && (
                  <>
                    <label>
                      Trip reference (optional, self-reported)
                      <input
                        maxLength={100}
                        value={reference}
                        onChange={(e) => setReference(e.target.value)}
                        placeholder="Share only what the group needs"
                      />
                    </label>
                    <button
                      className="button wide"
                      disabled={busy}
                      onClick={() =>
                        action(
                          "transition",
                          {
                            version: g.version,
                            status: "BOOKED_SELF_REPORTED",
                            reference,
                          },
                          "External booking marked self-reported.",
                        )
                      }
                    >
                      {t("booked")} <Check size={16} />
                    </button>
                  </>
                )}
              </>
            )}
            {g.reference && (
              <p className="callout">User-provided reference: {g.reference}</p>
            )}
            {g.status === "BOOKED_SELF_REPORTED" && isHost && (
              <button
                className="button wide"
                disabled={busy}
                onClick={() =>
                  action(
                    "transition",
                    { version: g.version, status: "IN_PROGRESS_SELF_REPORTED" },
                    "Trip started · self-reported.",
                  )
                }
              >
                Mark trip started <ArrowRight size={15} />
              </button>
            )}
            {g.status === "IN_PROGRESS_SELF_REPORTED" && isHost && (
              <button
                className="button wide"
                disabled={busy}
                onClick={() =>
                  action(
                    "transition",
                    { version: g.version, status: "COMPLETED_SELF_REPORTED" },
                    "Trip completed · self-reported.",
                  )
                }
              >
                Mark trip completed <Check size={15} />
              </button>
            )}
            {g.status === "COMPLETED_SELF_REPORTED" && (
              <div className="callout">
                <Check size={17} />
                Trip completion is self-reported.
              </div>
            )}
            {booked && g.status !== "COMPLETED_SELF_REPORTED" && (
              <button
                className="text-link danger-text spaced"
                disabled={busy}
                onClick={() =>
                  action(
                    "transition",
                    { version: g.version, status: "DISPUTED" },
                    "Dispute recorded. Submit details in a report.",
                  )
                }
              >
                Raise a trip dispute <Flag size={14} />
              </button>
            )}
          </section>
          <section className="panel spaced">
            <div className="section-title">
              <h3>Manual settlement</h3>
              <Wallet size={19} />
            </div>
            <p className="muted small-text">
              {t("payment")} Confirm {host.name}’s recipient details directly
              before paying. No UPI details are stored here.
            </p>
            {g.actualPaise === null ? (
              <p className="callout">
                Enter the actual fare after booking, then everyone reviews their
                share.
              </p>
            ) : (
              <>
                <div className="settlement-list">
                  {members.map((m) => (
                    <div key={m.userId}>
                      <span>{m.name.split(" ")[0]}</span>
                      <span className={`pill ${m.paid ? "pill-green" : ""}`}>
                        {m.paid
                          ? "Paid · self-reported"
                          : "Unpaid · self-reported"}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  className="button secondary wide"
                  disabled={busy || !allFare}
                  onClick={() =>
                    action(
                      "settlement",
                      { paid: !me.paid },
                      "Your manual settlement mark was updated.",
                    )
                  }
                >
                  {me.paid ? t("unpaid") : t("paid")}
                </button>
                {!allFare && (
                  <small className="muted">
                    Every passenger must accept the current actual fare first.
                  </small>
                )}
              </>
            )}
            <button className="text-link spaced" onClick={copySummary}>
              <Copy size={14} />
              {copied ? "Copied fare summary" : "Copy fare summary"}
            </button>
          </section>
        </aside>
      </div>
    </>
  );
}
