"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  Flag,
  LogOut,
  Check,
  Info,
  ArrowUpRight,
  Trash2,
} from "lucide-react";
import { useApp } from "./context";
import { Avatar, Status } from "./product";
import { api, date, time } from "@/lib/client";
import type { adminReports } from "@/lib/service";
export function AccountScreen() {
  const { data, act, busy, t } = useApp();
  const [name, setName] = useState(data.user.name),
    [gender, setGender] = useState(data.user.gender),
    [sharing, setSharing] = useState(data.user.sharing);
  const [deletion, setDeletion] = useState(false);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR DETAILS. YOUR CHOICES.</div>
          <h1>{t("profile")}</h1>
          <p>Keep your profile simple and your preferences up to date.</p>
        </div>
        <button
          className="button secondary"
          onClick={() => act("auth/logout", {}, "Signed out.", "/")}
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
      <div className="two-column">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            act(
              "profile",
              { name, gender, sharing },
              "Profile and consent preferences saved.",
            );
          }}
        >
          <div className="profile-heading">
            <Avatar name={data.user.name} />
            <div>
              <h2>{data.user.name}</h2>
              <p>
                {data.user.synthetic
                  ? "Synthetic demo persona"
                  : "Local account · unverified community member"}
              </p>
            </div>
          </div>
          <label>
            Display name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={60}
            />
          </label>
          <label>
            Email address
            <input value={data.user.email} disabled />
          </label>
          <label>
            Voluntary gender self-declaration
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as typeof gender)}
            >
              <option value="unspecified">Prefer not to say</option>
              <option value="woman">Woman</option>
              <option value="man">Man</option>
            </select>
            <small>This is not identity verification.</small>
          </label>
          <label className="check-label consent-box">
            <input
              type="checkbox"
              checked={sharing}
              onChange={(e) => setSharing(e.target.checked)}
            />
            <span>
              I opt in to sharing and discovery within my community. Withdrawal
              excludes my request from recommendations.
            </span>
          </label>
          <p className="muted small-text">
            Leave or complete your current group before changing matching
            preferences. Adult confirmation is recorded at registration.
          </p>
          <button className="button" disabled={busy}>
            <Check size={16} />
            {t("save")}
          </button>
        </form>
        <div>
          <div className="panel">
            <ShieldCheck size={27} />
            <h2>Trust is earned, not a badge.</h2>
            <p className="muted">
              No email, government ID, campus affiliation or driver verification
              service is configured. Your status remains unverified. Demo users
              are synthetic.
            </p>
            <Link href="/safety" className="text-link">
              Read our safety approach <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="panel spaced">
            <h3>Privacy & deletion</h3>
            <p className="muted small-text">
              Request a manual review to delete your personal data. Group
              records and reports may require review. This submits a request,
              not instant erasure.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={deletion}
                onChange={(e) => setDeletion(e.target.checked)}
              />
              I want to request account deletion.
            </label>
            <button
              className="button secondary danger-text"
              disabled={!deletion || busy}
              onClick={() =>
                act(
                  "privacy/delete-request",
                  {},
                  "Deletion request submitted for manual review.",
                )
              }
            >
              <Trash2 size={15} />
              Submit deletion request
            </button>
            <p>
              <Link href="/privacy" className="text-link">
                Privacy notice <ArrowUpRight size={13} />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
export function ReportScreen() {
  const { data, act, busy, t } = useApp();
  const [target, setTarget] = useState(""),
    [body, setBody] = useState(""),
    [block, setBlock] = useState(false),
    [done, setDone] = useState(false);
  useEffect(() => {
    setTarget(new URLSearchParams(window.location.search).get("target") ?? "");
  }, []);
  const people = Array.from(
    new Map(
      data.matches
        .flatMap((p) => p.trips)
        .filter((t) => t.ownerId !== data.user.id)
        .map((t) => [t.ownerId, { id: t.ownerId, name: t.name }]),
    ).values(),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR COMFORT MATTERS</div>
          <h1>{t("report")}</h1>
          <p>Report concerns to your community administrator.</p>
        </div>
      </div>
      <div className="narrow-panel panel">
        {done ? (
          <div className="empty">
            <ShieldCheck size={34} />
            <h2>Report recorded.</h2>
            <p>
              Your report is stored for manual community review. A block
              immediately excludes future matching and messaging with that
              person.
            </p>
            <Link href="/app" className="button secondary">
              Back to overview
            </Link>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await act(
                  "reports",
                  { body, targetId: target || undefined, block },
                  "Report recorded for manual review.",
                )
              )
                setDone(true);
            }}
          >
            <Flag size={27} />
            <h2>Tell us what happened.</h2>
            <label>
              Traveller (optional)
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">General concern</option>
                {target && !people.some((p) => p.id === target) && (
                  <option value={target}>Selected group traveller</option>
                )}
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("reportBody")}
              <textarea
                required
                minLength={8}
                maxLength={2000}
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the concern. Avoid unnecessary sensitive information."
              />
            </label>
            <label className="check-label consent-box">
              <input
                type="checkbox"
                checked={block}
                disabled={!target}
                onChange={(e) => setBlock(e.target.checked)}
              />
              {t("block")}
            </label>
            <div className="callout warning">
              <Info size={17} />
              <span>
                This is not an emergency channel. For immediate danger, contact
                local emergency services.
              </span>
            </div>
            <button className="button spaced" disabled={busy}>
              <Flag size={16} />
              {t("reportSubmit")}
            </button>
          </form>
        )}
      </div>
    </>
  );
}
export function AdminScreen() {
  const { data, act, busy } = useApp();
  const reports = useQuery({
    queryKey: ["reports", data.user.id],
    queryFn: () => api<ReturnType<typeof adminReports>>("admin/reports"),
    enabled: data.user.role === "demo_admin",
  });
  if (data.user.role !== "demo_admin")
    return (
      <div className="empty">
        <h1>Administrator access required.</h1>
        <Link className="button secondary" href="/app">
          My dashboard
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">COMMUNITY CARE</div>
          <h1>Moderation console</h1>
          <p>Manual triage for the synthetic JECRC community.</p>
        </div>
      </div>
      <div className="panel">
        <h2>Reports & data-deletion requests</h2>
        {reports.isLoading && <p>Loading reports…</p>}
        {reports.error && <p role="alert">{reports.error.message}</p>}
        {reports.data?.length === 0 && (
          <div className="empty">
            <ShieldCheck size={28} />
            <p>No reports in this community.</p>
          </div>
        )}
        {reports.data?.map((r) => (
          <article className="report-item" key={r.id}>
            <div className="section-title">
              <Status value={r.status} />
              <small>
                {date(r.created)} · {time(r.created)}
              </small>
            </div>
            <p>{r.body}</p>
            <small className="muted">
              Reporter reference: {r.userId}
              {r.targetId ? ` · Target: ${r.targetId}` : ""}
            </small>
            {r.status === "open" && (
              <div>
                <button
                  className="button secondary small spaced"
                  disabled={busy}
                  onClick={() =>
                    act(
                      `admin/reports/${r.id}/review`,
                      {},
                      "Report marked reviewed. No automatic sanction or deletion applied.",
                    )
                  }
                >
                  <Check size={14} />
                  Mark reviewed
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
      <div className="callout spaced">
        <Info size={18} />
        <span>
          Memberships remain unverified. Institutional invitation/domain
          administration and real email verification require production setup.
        </span>
      </div>
    </>
  );
}
