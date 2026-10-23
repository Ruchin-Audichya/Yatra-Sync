import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as service from "@/lib/service";
import * as v from "@/lib/validation";
import { AppError, rateLimit } from "@/lib/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const cookie = "yatri_session";
function response(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
function error(err: unknown) {
  if (err instanceof AppError)
    return response({ error: err.message }, err.status);
  if (err instanceof z.ZodError)
    return response({ error: err.issues.map((i) => i.message).join(" ") }, 400);
  if (err instanceof SyntaxError)
    return response({ error: "Invalid JSON request." }, 400);
  return response(
    { error: "The request could not be completed. Refresh and try again." },
    500,
  );
}
function groupSummary(group: { id: string; status: string; version: number }) {
  return { id: group.id, status: group.status, version: group.version };
}
function session(token: string) {
  const res = response({ ok: true });
  res.cookies.set(cookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
  return res;
}
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await params;
    const route = path.join("/");
    if (route === "health") return response(service.health());
    if (route === "public") return response(service.publicInfo());
    const user = service.authenticate(req.cookies.get(cookie)?.value);
    if (!user) return response({ error: "Sign in to continue." }, 401);
    if (route === "state") return response(service.state(user));
    if (path[0] === "groups" && path.length === 2)
      return response(service.groupRoom(user, path[1]));
    if (route === "admin/reports") return response(service.adminReports(user));
    return response({ error: "Endpoint not found." }, 404);
  } catch (e) {
    return error(e);
  }
}
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    // All browser writes require same-origin JSON. No wildcard CORS or client-trusted roles.
    const origin = req.headers.get("origin");
    let originUrl: URL;
    try {
      originUrl = new URL(origin ?? "");
    } catch {
      return response({ error: "Same-origin request required." }, 403);
    }
    if (
      !["http:", "https:"].includes(originUrl.protocol) ||
      originUrl.protocol !== new URL(req.url).protocol ||
      originUrl.host !== req.headers.get("host")
    )
      return response({ error: "Same-origin request required." }, 403);
    if (!req.headers.get("content-type")?.startsWith("application/json"))
      return response({ error: "JSON required." }, 415);
    const raw = await req.text();
    if (raw.length > 16000)
      return response({ error: "Request is too large." }, 413);
    const body: unknown = JSON.parse(raw);
    const { path } = await params;
    const route = path.join("/");
    if (["auth/login", "auth/register", "auth/demo"].includes(route))
      rateLimit(`auth:${req.headers.get("x-real-ip") ?? "local"}`, 60);
    if (route === "auth/login") {
      const b = v.loginInput.parse(body);
      return session(service.signIn(b.email, b.password));
    }
    if (route === "auth/register")
      return session(service.register(v.registerInput.parse(body)));
    if (route === "auth/demo")
      return session(
        service.demoSession(
          z.object({ userId: z.string() }).parse(body).userId,
        ),
      );
    if (route === "auth/logout") {
      const token = req.cookies.get(cookie)?.value;
      if (token) service.signOut(token);
      const res = response({ ok: true });
      res.cookies.delete(cookie);
      return res;
    }
    const user = service.authenticate(req.cookies.get(cookie)?.value);
    if (!user) return response({ error: "Sign in to continue." }, 401);
    rateLimit(`write:${user.id}`, 100);
    if (route === "trips")
      return response(service.createTrip(user, v.tripInput.parse(body)), 201);
    if (path[0] === "trips" && path.length === 3 && path[2] === "edit")
      return response(
        service.createTrip(user, v.tripInput.parse(body), path[1]),
      );
    if (path[0] === "trips" && path[2] === "cancel")
      return response(service.cancelTrip(user, path[1]));
    if (route === "groups") {
      const b = v.groupInput.parse(body);
      return response(
        groupSummary(service.createGroup(user, b.tripIds, b.departure)),
        201,
      );
    }
    if (path[0] === "groups" && path.length === 3) {
      const gid = path[1];
      switch (path[2]) {
        case "accept":
          return response(
            groupSummary(
              service.acceptGroup(
                user,
                gid,
                v.versionInput.parse(body).version,
              ),
            ),
          );
        case "leave":
          return response(groupSummary(service.leaveGroup(user, gid)));
        case "replace":
          return response(
            groupSummary(
              service.replaceMember(
                user,
                gid,
                z.object({ tripId: z.string() }).parse(body).tripId,
              ),
            ),
          );
        case "transition":
          return response(
            service.transition(user, gid, v.transitionInput.parse(body)),
          );
        case "messages":
          return response(
            service.sendMessage(user, gid, v.messageInput.parse(body).body),
          );
        case "fare": {
          const b = v.fareInput.parse(body);
          return response(service.updateFare(user, gid, b.paise, b.version));
        }
        case "fare-accept":
          return response(
            service.reviewFare(user, gid, v.versionInput.parse(body).version),
          );
        case "settlement":
          return response(
            service.markPaid(
              user,
              gid,
              z.object({ paid: z.boolean() }).parse(body).paid,
            ),
          );
      }
    }
    if (route === "reports") {
      const b = v.reportInput.parse(body);
      return response(service.report(user, b.body, b.targetId, b.block));
    }
    if (route === "profile")
      return response(
        service.profile(
          user,
          z
            .object({
              name: z.string().trim().min(2).max(60),
              gender: z.enum(["woman", "man", "unspecified"]),
              sharing: z.boolean(),
            })
            .parse(body),
        ),
      );
    if (route === "privacy/delete-request")
      return response(service.deleteRequest(user));
    if (route === "notifications/read")
      return response(service.markNotifications(user));
    if (route === "demo/benchmark") {
      const b = v.simulationInput.parse(body);
      return response(service.simulate(user, b.count, b.seed, b.disruption));
    }
    if (route === "demo/reset") {
      const result = service.resetDemo(user);
      const res = response(result);
      res.cookies.delete(cookie);
      return res;
    }
    if (route === "demo/outage")
      return response(
        service.setOutage(
          user,
          z.object({ value: z.boolean() }).parse(body).value,
        ),
      );
    if (route === "demo/delay")
      return response(
        service.delayTrip(
          user,
          z.object({ minutes: z.number().int().min(1).max(120) }).parse(body)
            .minutes,
        ),
      );
    if (path[0] === "admin" && path[1] === "reports" && path[3] === "review")
      return response(service.resolveReport(user, path[2]));
    return response({ error: "Endpoint not found." }, 404);
  } catch (e) {
    return error(e);
  }
}
