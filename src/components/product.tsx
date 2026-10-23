"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  ArrowUpRight,
  ArrowRight,
  Route,
  LayoutDashboard,
  Users,
  Bell,
  ShieldCheck,
  FlaskConical,
  ChevronDown,
  Plus,
  Sun,
  Moon,
  Menu,
  X,
  MapPin,
  Wallet,
  Check,
  SlidersHorizontal,
  HelpCircle,
  UserRound,
  Play,
} from "lucide-react";
import { api, ApiError, time, date } from "@/lib/client";
import { hubName } from "@/domain/graph";
import { money } from "@/domain/fare";
import type { publicInfo } from "@/lib/service";
import { AppContext, copy, type State, type Act } from "./context";
import { Schematic } from "./map";
import { TripForm, TripDetails, MatchList } from "./trips";
import { GroupRoom } from "./room";
import { ControlRoom } from "./control";
import { AccountScreen, ReportScreen, AdminScreen } from "./settings";
import { FarePlanner } from "./fare-planner";
import { CommuteLauncher, QuoteCheck } from "./commute";
export function Product({ path }: { path: string }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: true },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Experience path={path} />
    </QueryClientProvider>
  );
}
export function Brand() {
  return (
    <span className="brand">
      <span className="brand-icon">
        <svg
          viewBox="0 0 40 44"
          width="35"
          height="38"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M26 16c7-1 13 6 9 12-3 5-11 8-13 13l-7-9c3-6 10-8 12-12"
            fill="#00b6b0"
          />
          <path
            d="M17 2C8 2 3 8 3 15c0 9 9 17 14 23 5-6 14-14 14-23C31 8 26 2 17 2Z"
            fill="#5146ff"
            stroke="var(--surface)"
            strokeWidth="2"
          />
          <circle cx="17" cy="15" r="6" fill="var(--surface)" />
        </svg>
      </span>
      <span className="brand-name">
        Yatra <span>Sync</span>
        <small>BETTER COMPANY. FAIRER JOURNEYS.</small>
      </span>
    </span>
  );
}
function Experience({ path }: { path: string }) {
  const router = useRouter(),
    qc = useQueryClient();
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState<{ message: string; error: boolean } | null>(
      null,
    ),
    [lang, setLang] = useState<"en" | "hi">("en"),
    [dark, setDark] = useState(false),
    [prefsLoaded, setPrefsLoaded] = useState(false),
    [menu, setMenu] = useState(false);
  const { data, isLoading, error } = useQuery<State | null>({
    queryKey: ["state"],
    queryFn: async () => {
      try {
        return await api<State>("state");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    refetchInterval: 5000,
  });
  const pub = useQuery({
    queryKey: ["public"],
    queryFn: () => api<ReturnType<typeof publicInfo>>("public"),
  });
  useEffect(() => {
    setLang(
      (localStorage.getItem("yatra-language") ??
        localStorage.getItem("yatri-language")) === "hi"
        ? "hi"
        : "en",
    );
    setDark(
      (localStorage.getItem("yatra-theme") ??
        localStorage.getItem("yatri-theme")) === "dark",
    );
    setPrefsLoaded(true);
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  useEffect(() => {
    if (!prefsLoaded) return;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.setItem("yatra-theme", dark ? "dark" : "light");
  }, [dark, prefsLoaded]);
  useEffect(() => {
    if (!prefsLoaded) return;
    document.documentElement.lang = lang;
    localStorage.setItem("yatra-language", lang);
  }, [lang, prefsLoaded]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const act: Act = async <T,>(
    endpoint: string,
    body: unknown,
    message?: string,
    href?: string,
  ) => {
    setBusy(true);
    try {
      const result = await api<T>(endpoint, body);
      await qc.invalidateQueries();
      if (message) setNotice({ message, error: false });
      if (href) router.push(href);
      return result;
    } catch (e) {
      setNotice({
        message: e instanceof Error ? e.message : "Something went wrong.",
        error: true,
      });
      return null;
    } finally {
      setBusy(false);
    }
  };
  const t = (key: string) => copy[key]?.[lang === "en" ? 0 : 1] ?? key;
  const privatePath =
    path.startsWith("/app") ||
    path.startsWith("/admin") ||
    path.startsWith("/demo/control") ||
    path.startsWith("/demo/benchmark");
  const themeControls = (
    <>
      <button
        className="icon-btn language"
        onClick={() => setLang(lang === "en" ? "hi" : "en")}
        aria-label="Switch language"
      >
        {lang === "en" ? "हिं" : "EN"}
      </button>
      <button
        className="icon-btn"
        onClick={() => setDark(!dark)}
        aria-label="Toggle color theme"
      >
        {dark ? <Sun size={19} /> : <Moon size={19} />}
      </button>
    </>
  );
  const toast = notice && (
    <div
      role={notice.error ? "alert" : "status"}
      className={`toast ${notice.error ? "toast-error" : ""}`}
    >
      <span>{notice.error ? "!" : <Check size={17} />}</span>
      {notice.message}
      <button onClick={() => setNotice(null)} aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
  if (!privatePath)
    return (
      <>
        <header className="public-header">
          <Link href="/">
            <Brand />
          </Link>
          <nav>
            <Link href="/how-it-works">How it works</Link>
            <Link href="/safety">Safety first</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <div className="flex">
            {themeControls}
            <Link
              className="button secondary small"
              href={data ? "/app" : "/login"}
            >
              {data ? "My dashboard" : "Sign in"}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </header>
        {path === "/demo" && (
          <div className="judge-launch">
            <div>
              <span className="eyebrow">THE JUDGE EXPERIENCE</span>
              <strong>
                One story. Three minutes. A better way to go together.
              </strong>
              <p>
                Present the idea, run the matching engine, explore the fare and
                show recovery. An isolated synthetic sandbox.
              </p>
            </div>
            <Link href="/demo/present" className="button">
              Present to judges <Play size={17} />
            </Link>
          </div>
        )}
        {path === "/demo" || path === "/login" || path === "/register" ? (
          <Auth
            path={path}
            act={act}
            busy={busy}
            personas={pub.data?.personas ?? []}
            demo={pub.data?.demo ?? false}
          />
        ) : path === "/safety" ||
          path === "/privacy" ||
          path === "/how-it-works" ? (
          <Info path={path} />
        ) : (
          <Landing signedIn={!!data} demo={pub.data?.demo ?? false} />
        )}
        <footer className="public-footer">
          <Brand />
          <span>Find your route. Share your ride. Split your fare.</span>
          <div>
            <Link href="/privacy">Privacy</Link>
            <Link href="/safety">Safety</Link>
          </div>
        </footer>
        {toast}
      </>
    );
  if (isLoading)
    return (
      <div className="full-state">
        <Brand />
        <span className="spinner" />
        Loading your journeys…
      </div>
    );
  if (error)
    return (
      <div className="full-state">
        <Brand />
        <h1>Couldn’t connect to your local server.</h1>
        <p>{error.message}</p>
        <button className="button" onClick={() => qc.invalidateQueries()}>
          Try again
        </button>
      </div>
    );
  if (!data)
    return (
      <>
        <header className="public-header">
          <Link href="/">
            <Brand />
          </Link>
          {themeControls}
        </header>
        <Auth
          path="/login"
          act={act}
          busy={busy}
          personas={pub.data?.personas ?? []}
          demo={pub.data?.demo ?? false}
        />
        {toast}
      </>
    );
  const nav = [
    { href: "/app", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/app/matches", label: t("matches"), icon: Users },
    { href: "/app/history", label: t("trips"), icon: Route },
    { href: "/app/notifications", label: t("notifications"), icon: Bell },
  ];
  const currentRoom = data.groups.find(
    (g) =>
      !["CANCELLED", "DECLINED", "EXPIRED", "COMPLETED_SELF_REPORTED"].includes(
        g.status,
      ),
  );
  const title =
    path === "/app/fare"
      ? "FairSplit fare planner"
      : path.includes("/groups/")
        ? "Your travel circle"
        : path.includes("/trips/new")
          ? t("create")
          : path.includes("/trips/")
            ? "Journey details"
            : path === "/app/matches"
              ? t("matches")
              : path.includes("/history")
                ? t("trips")
                : path.includes("/notifications")
                  ? t("notifications")
                  : path.includes("/profile") || path.includes("/settings")
                    ? t("profile")
                    : path.includes("/reports")
                      ? t("report")
                      : path.startsWith("/demo")
                        ? "Demo studio"
                        : path.startsWith("/admin")
                          ? "Community console"
                          : "Overview";
  return (
    <AppContext.Provider value={{ data, act, busy, lang, t }}>
      <div className="app-layout">
        {menu && (
          <button
            className="sidebar-scrim"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <aside
          className={`sidebar ${menu ? "sidebar-open" : ""}`}
          inert={!menu}
        >
          <Link href="/app" className="sidebar-brand">
            <Brand />
          </Link>
          <div className="community-switch">
            <span className="community-avatar">
              {data.user.synthetic ? "JU" : "LC"}
            </span>
            <div>
              <strong>
                {data.user.synthetic ? "JECRC community" : "Local community"}
              </strong>
              <small>
                {data.user.synthetic
                  ? "Jaipur · Demo community"
                  : "Unverified membership"}
              </small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="nav-caption">YOUR WORKSPACE</div>
          <nav className="main-nav">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setMenu(false)}
                className={
                  path === n.href ||
                  (n.href === "/app/history" && path.includes("/trips/"))
                    ? "active"
                    : ""
                }
              >
                <n.icon size={19} />
                {n.label}
                {n.href === "/app/notifications" &&
                  data.notifications.some((n) => !n.read) && (
                    <span className="nav-dot" />
                  )}
              </Link>
            ))}
          </nav>
          <nav className="main-nav">
            <Link
              href="/app/fare"
              onClick={() => setMenu(false)}
              className={path === "/app/fare" ? "active" : ""}
            >
              <Wallet size={19} />
              FairSplit calculator
            </Link>
          </nav>
          <div className="nav-caption nav-second">COMMUNITY</div>
          <nav className="main-nav">
            <Link
              href="/app/profile"
              className={path === "/app/profile" ? "active" : ""}
            >
              <UserRound size={19} />
              {t("profile")}
            </Link>
            <Link href="/safety">
              <ShieldCheck size={19} />
              {t("safety")}
            </Link>
            {data.demo && data.user.synthetic && (
              <Link
                href="/demo/control"
                className={path.startsWith("/demo") ? "active" : ""}
              >
                <FlaskConical size={19} />
                Demo studio<span className="nav-beta">LAB</span>
              </Link>
            )}
            {data.user.role === "demo_admin" && (
              <Link href="/admin/community">
                <SlidersHorizontal size={19} />
                Moderation
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="small-note">
              <ShieldCheck size={22} />
              <strong>
                A little trust.
                <br />A better journey.
              </strong>
              <p>Meet in public. Share only when you’re ready.</p>
              <Link href="/safety">
                Travel thoughtfully <ArrowUpRight size={13} />
              </Link>
            </div>
            <Link href="/app/profile" className="sidebar-user">
              <Avatar name={data.user.name} />
              <div>
                <strong>{data.user.name}</strong>
                <small>
                  {data.user.synthetic
                    ? "Synthetic demo persona"
                    : "Unverified member"}
                </small>
              </div>
              <ChevronDown size={14} />
            </Link>
          </div>
        </aside>
        <div className="main-column">
          <header className="topbar">
            <div className="header-brand-group">
              <button
                className="icon-btn mobile-menu"
                onClick={() => setMenu(true)}
                aria-label="Open navigation"
              >
                <Menu size={22} />
              </button>
              <Link href="/app" aria-label="Yatra Sync home">
                <Brand />
              </Link>
              <span className="header-hub">
                <i />
                Jaipur
                <br />
                <strong>Community corridors</strong>
              </span>
            </div>
            <nav className="desktop-nav" aria-label="Main navigation">
              <Link
                href="/app"
                aria-current={path === "/app" ? "page" : undefined}
              >
                Overview
              </Link>
              <Link
                href="/app/matches"
                aria-current={path === "/app/matches" ? "page" : undefined}
              >
                Discover rides
              </Link>
              <Link
                href="/app/trips/new"
                aria-current={path === "/app/trips/new" ? "page" : undefined}
              >
                {t("create")}
              </Link>
              <Link
                href={
                  currentRoom ? `/app/groups/${currentRoom.id}` : "/app/history"
                }
                aria-current={
                  path.includes("/groups/") || path === "/app/history"
                    ? "page"
                    : undefined
                }
              >
                Travel rooms{" "}
                {currentRoom && (
                  <span className="nav-count">
                    {
                      data.groups.filter(
                        (g) =>
                          ![
                            "CANCELLED",
                            "DECLINED",
                            "EXPIRED",
                            "COMPLETED_SELF_REPORTED",
                          ].includes(g.status),
                      ).length
                    }
                  </span>
                )}
              </Link>
              <Link
                href="/app/fare"
                aria-current={path === "/app/fare" ? "page" : undefined}
              >
                FairSplit
              </Link>
              {data.demo && data.user.synthetic ? (
                <Link
                  href="/demo/control"
                  aria-current={path.startsWith("/demo") ? "page" : undefined}
                >
                  Demo studio
                </Link>
              ) : (
                <Link href="/safety">Safety</Link>
              )}
            </nav>
            <div className="top-actions">
              {data.demo && data.user.synthetic && (
                <label className="persona-select">
                  <span className="synthetic-dot" />
                  <select
                    aria-label="Switch synthetic persona"
                    value={data.user.id}
                    disabled={busy}
                    onChange={(e) =>
                      act(
                        "auth/demo",
                        { userId: e.target.value },
                        "Switched synthetic persona",
                      )
                    }
                  >
                    {data.personas.map((p) => (
                      <option value={p.id} key={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {themeControls}
              <Link
                href="/app/profile"
                className="icon-btn account-icon"
                aria-label="Open my profile"
              >
                <UserRound size={19} />
              </Link>
              <Link
                href="/app/notifications"
                className="icon-btn notification-icon"
                aria-label="Open notifications"
              >
                <Bell size={19} />
                {data.notifications.some((n) => !n.read) && <i />}
              </Link>
            </div>
          </header>
          {data.user.synthetic && (
            <div className="demo-strip">
              <FlaskConical size={13} />
              <strong>{t("synthetic")}</strong>
              <span>
                People, routes & fares are illustrative. No live bookings or
                payments.
              </span>
              <Link href="/demo/control">
                Open studio <ArrowUpRight size={12} />
              </Link>
            </div>
          )}
          <main className="page-content" key={path} aria-label={title}>
            {path === "/app" ? (
              <Dashboard />
            ) : path === "/app/trips/new" ? (
              <TripForm />
            ) : path.startsWith("/app/trips/") ? (
              <TripDetails tripId={path.split("/")[3]} />
            ) : path === "/app/matches" ? (
              <MatchList />
            ) : path.startsWith("/app/groups/") ? (
              <GroupRoom groupId={path.split("/")[3]} />
            ) : path === "/app/fare" ? (
              <FarePlanner />
            ) : path === "/app/history" ? (
              <History />
            ) : path === "/app/notifications" ? (
              <Notifications />
            ) : path === "/app/profile" || path === "/app/settings" ? (
              <AccountScreen />
            ) : path === "/app/reports/new" ? (
              <ReportScreen />
            ) : path.startsWith("/demo/") ? (
              <ControlRoom />
            ) : path.startsWith("/admin/") ? (
              <AdminScreen />
            ) : (
              <div className="empty">
                <h1>This page has moved.</h1>
                <Link className="button" href="/app">
                  Open overview
                </Link>
              </div>
            )}
          </main>
          <footer className="app-footer">
            <span>Made for the journeys we share.</span>
            <div>
              <Link href="/privacy">Privacy</Link>
              <Link href="/safety">Safety & help</Link>
              <span>
                Jaipur, India <span className="tiny-teal">↗</span>
              </span>
            </div>
          </footer>
          <nav className="mobile-tabbar" aria-label="Mobile quick navigation">
            {[
              {
                href: "/app",
                label: "Home",
                icon: LayoutDashboard,
                active: path === "/app",
              },
              {
                href: "/app/matches",
                label: "Discover",
                icon: Users,
                active: path === "/app/matches",
              },
              {
                href: "/app/history",
                label: "Journeys",
                icon: Route,
                active:
                  path.includes("/history") ||
                  path.includes("/groups/") ||
                  path.includes("/trips/"),
              },
              {
                href: "/app/fare",
                label: "Fare",
                icon: Wallet,
                active: path === "/app/fare",
              },
              {
                href: "/app/profile",
                label: "Profile",
                icon: UserRound,
                active: path === "/app/profile",
              },
            ].map(({ href, label, icon: Icon, active }) => (
              <Link
                href={href}
                key={href}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
      {busy && <div className="loading-line" />}
      {toast}
    </AppContext.Provider>
  );
}
export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar ${small ? "avatar-small" : ""}`}
      style={{
        background: ["#dfebe7", "#eee6dc", "#e3e5f4", "#e8dfea"][
          name.length % 4
        ],
      }}
    >
      {name
        .split(" ")
        .slice(0, 2)
        .map((x) => x[0])
        .join("")}
    </span>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <span
      className={`status status-${value === "active" || value === "CONFIRMED" ? "green" : value === "CANCELLED" || value === "cancelled" ? "muted" : "amber"}`}
    >
      <i />
      {value.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
function Dashboard() {
  const { data, t } = useContextApp();
  const [route, setRoute] = useState({
    origin: "sitapura",
    destination: "malviya",
  });
  const trip = data.trips.find(
    (x) => ["active", "committed"].includes(x.status) && x.expires > data.now,
  );
  const current = data.groups.find(
    (g) =>
      !["CANCELLED", "EXPIRED", "DECLINED", "COMPLETED_SELF_REPORTED"].includes(
        g.status,
      ),
  );
  const first = data.matches[0],
    own = first?.allocations.find((a) => a.ownerId === data.user.id);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="live-dot" />
            SAME DIRECTION. BETTER EVERY DAY.
          </div>
          <h1>
            Good to see you, {data.user.name.split(" ")[0]}
            <span className="greeting-dot">.</span>
          </h1>
          <p>
            Leaving work, catching a train, heading home. Find your people
            before you book.
          </p>
        </div>
        <Link
          className="button"
          href={trip ? `/app/trips/${trip.id}` : "/app/trips/new"}
        >
          <Plus size={18} />
          {trip ? "View my journey" : t("create")}
        </Link>
      </div>
      <div className="dashboard-grid">
        <section className="dashboard-left">
          {current ? (
            <section className="panel upcoming">
              <div className="section-title">
                <h3>Your circle is waiting</h3>
                <Status value={current.status} />
              </div>
              <p>
                {current.passengers} request holders · {time(current.departure)}{" "}
                IST
              </p>
              <Link href={`/app/groups/${current.id}`} className="text-link">
                Review group & respond <ArrowRight size={16} />
              </Link>
            </section>
          ) : null}

          <CommuteLauncher trip={trip} route={route} onRouteChange={setRoute} />
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon">
                <Users size={20} />
              </span>
              <div>
                <span>Compatible proposals</span>
                <strong>
                  {data.matches.length.toString().padStart(2, "0")}
                </strong>
                <small>
                  {trip
                    ? "Within your hard limits"
                    : "Plan a route to discover"}
                </small>
              </div>
            </div>
            <div className="stat-card">
              <span className="stat-icon blue">
                <Wallet size={20} />
              </span>
              <div>
                <span>Your estimated share</span>
                <strong>{own ? money(own.paise) : "—"}</strong>
                <small>Illustrative fare estimate</small>
              </div>
            </div>
          </div>
          <div className="planner-trust">
            <ShieldCheck size={20} />
            <span>
              <strong>Everyone gets a say.</strong>
              <small>Meeting details unlock only after mutual consent.</small>
            </span>
            <Link href="/safety" aria-label="Read about mutual consent">
              <ArrowUpRight size={19} />
            </Link>
          </div>
        </section>
        <div className="commute-right">
          <section className="dashboard-map">
            <div className="map-insight">
              <span>
                <i />
                YOUR CORRIDOR AT A GLANCE
              </span>
              <span className="pill">Illustrative graph</span>
            </div>
            <Schematic
              origin={trip?.origin ?? route.origin}
              destination={trip?.destination ?? route.destination}
              large
            />
            <div className="map-card">
              <span className="map-card-icon">
                <Route size={24} />
              </span>
              <div>
                <strong>The Jaipur corridor</strong>
                <span>9 public hubs. A shared sense of direction.</span>
              </div>
              <Link
                className="button small"
                href={trip ? "/app/matches" : "/app/trips/new"}
              >
                {trip ? "Explore matches" : "Choose a route"}
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </section>
          <QuoteCheck />
        </div>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">GOOD ROUTES. GOOD COMPANY.</span>
          <h2>{t("matches")}</h2>
          <p>
            Compatible people, transparent costs, and a plan you all agree on.
          </p>
        </div>
        <Link href="/app/matches" className="text-link">
          View all matches <ArrowRight size={17} />
        </Link>
      </div>
      <MatchList compact />
      <div className="how-grid">
        {[
          {
            n: "01",
            title: "Tell us your route",
            text: "Your departure window, seats and comfort limits.",
            icon: MapPin,
          },
          {
            n: "02",
            title: "Find your circle",
            text: "Review the fit. Agree on the same plan, together.",
            icon: Users,
          },
          {
            n: "03",
            title: "Book. Go. Split.",
            text: "Use your cab app. Review every rupee with your group.",
            icon: Wallet,
          },
        ].map((x) => (
          <div key={x.n}>
            <span className="step-num">{x.n}</span>
            <x.icon size={22} />
            <h3>{x.title}</h3>
            <p>{x.text}</p>
          </div>
        ))}
      </div>
      <div className="trust-line">
        <ShieldCheck size={18} />
        <span>
          Made for coordination, built around consent. No automatic bookings or
          payments.
        </span>
        <Link href="/safety">
          Our approach <ArrowUpRight size={14} />
        </Link>
      </div>
    </>
  );
}
function useContextApp() {
  return useAppBridge();
}
import { useApp as useAppBridge } from "./context";
function History() {
  const { data, t, act } = useContextApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY JOURNEY, IN ONE PLACE</div>
          <h1>{t("trips")}</h1>
          <p>Requests, travel circles and self-reported trip history.</p>
        </div>
        <Link href="/app/trips/new" className="button">
          <Plus size={17} />
          {t("create")}
        </Link>
      </div>
      <div className="panel">
        <h2>Trip requests</h2>
        {!data.trips.length && (
          <div className="empty">
            <Route size={28} />
            <p>No requests yet. Let’s plan your first journey.</p>
          </div>
        )}
        {data.trips.map((trip) => (
          <div className="list-row" key={trip.id}>
            <span className="row-icon">
              <Route size={20} />
            </span>
            <div className="grow">
              <strong>
                {hubName(trip.origin)} → {hubName(trip.destination)}
              </strong>
              <small>
                {date(trip.earliest)} · {time(trip.earliest)} · {trip.seats}{" "}
                seat(s)
              </small>
            </div>
            <Status
              value={
                trip.expires < data.now && trip.status === "active"
                  ? "expired"
                  : trip.status
              }
            />
            <Link
              href={`/app/trips/${trip.id}`}
              className="button secondary small"
            >
              Details
            </Link>
            {trip.status === "active" && (
              <button
                className="icon-btn danger-text"
                title="Cancel request"
                onClick={() => {
                  if (window.confirm("Cancel this request?"))
                    act(`trips/${trip.id}/cancel`, {}, "Request cancelled.");
                }}
              >
                <X size={17} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="panel spaced">
        <h2>Travel circles</h2>
        {!data.groups.length && (
          <p className="muted">Your group invitations will appear here.</p>
        )}
        {data.groups.map((g) => (
          <div className="list-row" key={g.id}>
            <Users size={21} />
            <div className="grow">
              <strong>
                {g.passengers} passengers · {time(g.departure)}
              </strong>
              <small>{money(g.farePaise)} group total</small>
            </div>
            <Status value={g.status} />
            <Link className="text-link" href={`/app/groups/${g.id}`}>
              Open <ArrowUpRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
function Notifications() {
  const { data, act, t } = useContextApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">STAY IN THE LOOP</div>
          <h1>{t("notifications")}</h1>
          <p>Your invitations, group changes and fare reviews.</p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            act("notifications/read", {}, "All notifications marked read.")
          }
        >
          Mark all read
        </button>
      </div>
      <div className="panel">
        {!data.notifications.length && (
          <div className="empty">
            <Bell size={30} />
            <h3>You’re all caught up.</h3>
            <p>We’ll show invitations and group changes here.</p>
          </div>
        )}
        {data.notifications.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            className={`list-row notification-row ${!n.read ? "unread" : ""}`}
          >
            <span className="row-icon">
              <Bell size={18} />
            </span>
            <div className="grow">
              <strong>{n.body}</strong>
              <small>
                {date(n.created)} · {time(n.created)}
              </small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </div>
    </>
  );
}
function Auth({
  path,
  act,
  busy,
  personas,
  demo,
}: {
  path: string;
  act: Act;
  busy: boolean;
  personas: ReturnType<typeof publicInfo>["personas"];
  demo: boolean;
}) {
  const register = path === "/register";
  return (
    <div className="auth-layout">
      <div className="auth-intro">
        <span className="eyebrow">YOUR PEOPLE. YOUR ROUTE.</span>
        <h1>
          Good journeys
          <br />
          start <em>together.</em>
        </h1>
        <p>
          A little coordination can go a long way. Find your community before
          you book your cab.
        </p>
        <div className="auth-art">
          <Image
            loading="eager"
            src="/art/jaipur-route-hero.webp"
            alt="Imagined Jaipur architecture and a shared cab journey"
            width={1536}
            height={1024}
            sizes="(max-width: 800px) 100vw, 45vw"
          />
        </div>
        <span>
          <ShieldCheck size={17} /> Adults 18+ · Consent at every step
        </span>
      </div>
      <div className="auth-form panel">
        <h2>
          {path === "/demo"
            ? "Take Yatra Sync for a spin"
            : register
              ? "Join the journey"
              : "Welcome back"}
        </h2>
        <p>
          {path === "/demo"
            ? "Explore a real local workflow with synthetic people and illustrative fares."
            : register
              ? "Create a local account. Membership remains unverified."
              : "Sign in to your local community."}
        </p>
        {path !== "/demo" && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              await act(
                register ? "auth/register" : "auth/login",
                register
                  ? {
                      name: f.get("name"),
                      email: f.get("email"),
                      password: f.get("password"),
                      gender: f.get("gender"),
                      adult: f.get("adult") === "on",
                      sharing: f.get("sharing") === "on",
                    }
                  : { email: f.get("email"), password: f.get("password") },
                register ? "Account created." : "Welcome back.",
                "/app",
              );
            }}
          >
            {register && (
              <label>
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={register ? 10 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "At least 10 characters" : "Your password"
                }
              />
            </label>
            {register && (
              <>
                <label>
                  Optional self-declared gender
                  <select name="gender">
                    <option value="unspecified">Prefer not to say</option>
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                  </select>
                </label>
                <label className="check-label">
                  <input type="checkbox" required name="adult" />I confirm that
                  I am 18 or older.
                </label>
                <label className="check-label">
                  <input type="checkbox" required name="sharing" />I consent to
                  community discovery and have read the{" "}
                  <Link href="/privacy">privacy notice</Link>.
                </label>
              </>
            )}
            <button className="button wide" disabled={busy}>
              {register ? "Create account" : "Sign in"}
              <ArrowRight size={17} />
            </button>
            <p className="form-footer">
              {register ? "Already have an account?" : "New here?"}{" "}
              <Link href={register ? "/login" : "/register"}>
                {register ? "Sign in" : "Create an account"}
              </Link>
            </p>
          </form>
        )}
        {demo && (
          <div className="demo-personas">
            <div className="divider">
              <span>SYNTHETIC DEMO · NO PERSONAL DATA</span>
            </div>
            {personas.map((p) => (
              <button
                key={p.id}
                className="persona-card"
                disabled={busy}
                onClick={() =>
                  act(
                    "auth/demo",
                    { userId: p.id },
                    "Entered synthetic demo.",
                    "/app",
                  )
                }
              >
                <Avatar name={p.name} />
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.label}</small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))}
          </div>
        )}
        {path === "/demo" && !demo && (
          <p className="callout">
            Demo personas are disabled. Set DEMO_MODE=true in development, or
            create a local account.
          </p>
        )}
      </div>
    </div>
  );
}
function Landing({ signedIn, demo }: { signedIn: boolean; demo: boolean }) {
  return (
    <>
      <main className="landing">
        <div className="landing-copy">
          <span className="landing-kicker">
            <span className="live-dot" /> GOOD COMPANY IS GOING YOUR WAY
          </span>
          <h1>
            Some journeys
            <br />
            are better
            <br />
            <em>together.</em>
            <span className="landing-spark">✳</span>
          </h1>
          <p>
            Office to home. Station to city. Find people heading your way,
            <br className="desktop-only" /> share an Ola or Uber cab, and split
            the fare fairly.
          </p>
          <div className="landing-actions">
            <Link
              href={signedIn ? "/app" : "/register"}
              className="button large"
            >
              Find people on your route <ArrowUpRight size={20} />
            </Link>
            {demo && (
              <Link href="/demo" className="text-link">
                Explore the demo <ArrowRight size={17} />
              </Link>
            )}
          </div>
          <div className="landing-proof">
            <span>
              <Users size={18} /> Small groups, up to 4
            </span>
            <span>
              <ShieldCheck size={18} /> Everyone opts in
            </span>
          </div>
        </div>
        <div className="landing-artwork">
          <div className="artwork-caption">
            <span>A LITTLE COMPANY. A DIFFERENT JOURNEY.</span>
            <span>JAIPUR / 01</span>
          </div>
          <div className="artwork-frame">
            <Image
              src="/art/jaipur-route-hero.webp"
              alt="Generated Jaipur travel artwork with pink sandstone architecture, connected route points and a white cab"
              width={1536}
              height={1024}
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 800px) 100vw, 55vw"
            />
          </div>
          <div className="route-ticket">
            <span className="ticket-stamp">
              <Route size={24} />
            </span>
            <div>
              <small>A COMMUNITY CORRIDOR</small>
              <strong>
                Jaipur Junction <span>↗</span> JECRC University
              </strong>
              <p>Find a shared direction. Agree on the details.</p>
            </div>
            <Link
              href={
                signedIn ? "/app/trips/new?from=junction&to=jecrc" : "/demo"
              }
              aria-label="Explore the Jaipur community corridor"
            >
              <ArrowUpRight size={24} />
            </Link>
          </div>
          <p className="artwork-credit">
            A city of possibilities. A little company along the way.
          </p>
        </div>
      </main>
      <section className="landing-how">
        <div>
          <span className="eyebrow">LESS PLANNING. MORE GOING.</span>
          <h2>
            Your cab app books the ride.
            <br />
            We help you find the people.
          </h2>
        </div>
        <div className="how-grid">
          {[
            [
              "01",
              "Tell us where",
              "Choose your hubs, time window and travel preferences.",
            ],
            [
              "02",
              "Agree together",
              "Review compatible groups and accept the same plan.",
            ],
            [
              "03",
              "Go your way",
              "Book externally, share the journey and review the fare.",
            ],
          ].map(([n, title, text]) => (
            <div key={n}>
              <span className="step-num">{n}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <p className="landing-disclaimer">
          Yatra Sync coordinates passengers. It does not dispatch cabs, verify
          companions, collect payments, or guarantee savings.
        </p>
      </section>
    </>
  );
}
function Info({ path }: { path: string }) {
  const safety = path === "/safety",
    privacy = path === "/privacy";
  return (
    <main className="info-page">
      <span className="eyebrow">BUILT ON CLARITY</span>
      <h1>
        {safety
          ? "A thoughtful way to travel."
          : privacy
            ? "Your journey. Your choices."
            : "From your route to your circle."}
      </h1>
      <p className="lead">
        {safety
          ? "Sharing a journey starts with consent and sensible precautions."
          : privacy
            ? "We collect only what this local coordination workflow needs."
            : "Plan before you book. Every passenger reviews the same group terms."}
      </p>
      <div className="info-grid">
        {(safety
          ? [
              [
                "People, not promises",
                "Companions and community memberships are unverified unless independent verification is actually configured. Synthetic personas are clearly labelled. Women-only matching uses voluntary self-declarations and is not identity verification.",
              ],
              [
                "Meet thoughtfully",
                "Use public meeting points, review your companions and use permitted providers. Meeting details appear after everyone accepts. Yatra Sync does not guarantee personal safety, rides, fares or drivers.",
              ],
              [
                "You stay in control",
                "Decline invitations, leave before booking, block travellers and report abuse. After booking, raise a dispute. This is not an emergency service; use local emergency services for immediate danger.",
              ],
              [
                "Booking stays with you",
                "A nominated passenger books in the provider app. All booking, trip and settlement statuses are self-reported. No money is collected or transferred by Yatra Sync.",
              ],
            ]
          : privacy
            ? [
                [
                  "What is stored",
                  "Local account name, email, hashed password, age/sharing consents, hub-based travel requests, group decisions, messages, reports and manual fare records are stored in SQLite on this machine. No phone numbers, continuous GPS or card details are collected.",
                ],
                [
                  "Who can see it",
                  "Opted-in community travellers can see relevant trip summaries and display names. Only permitted group members can access their room. Reports are restricted to their community administrator. Synthetic people never appear in real-account discovery.",
                ],
                [
                  "Your choices",
                  "You can withdraw future matching consent and submit a data-deletion request in your profile. Group records may need review for participant disputes. Deletion requests require manual administrator review; there is no claim of automatic erasure.",
                ],
                [
                  "Before a real launch",
                  "Production requires verified institutional access, a retention policy, secure hosting, monitoring and professional review of applicable Indian privacy and transport rules. This local demo makes no certification claim.",
                ],
              ]
            : [
                [
                  "1 · Plan a journey",
                  "Pick a seeded origin/destination, departure window, wait and detour limits, luggage and seats. Estimates are labelled and remain separate from actual fares.",
                ],
                [
                  "2 · Review your circle",
                  "The deterministic engine checks directed route overlap, pickup walking, capacity, timing, preferences, blocks and fare benefit. A score explains compatibility, not probability.",
                ],
                [
                  "3 · Say yes together",
                  "Every rider must affirmatively accept the same current composition, time and fare method. A cancellation changes the version and requires fresh consent.",
                ],
                [
                  "4 · Book externally & review the fare",
                  "The nominated host opens the provider separately. Enter the actual fare, review exact paise shares and manually mark your own settlement. No payment success is verified.",
                ],
              ]
        ).map(([title, text]) => (
          <article className="panel" key={title}>
            <ShieldCheck size={25} />
            <h2>{title}</h2>
            <p>{text}</p>
          </article>
        ))}
      </div>
      <Link href="/app/reports/new" className="button secondary">
        <HelpCircle size={17} />
        Report a concern
      </Link>
    </main>
  );
}
