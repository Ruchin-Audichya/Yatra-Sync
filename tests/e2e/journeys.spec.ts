import {
  test,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";
import { mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
mkdirSync("docs/evidence/yatra-canvas", { recursive: true });
const base = "http://127.0.0.1:3100";
async function post(
  request: APIRequestContext,
  path: string,
  data: unknown = {},
) {
  return request.post(`${base}/api/${path}`, {
    data,
    headers: { Origin: base },
  });
}
async function persona(page: Page, id = "demo-aarav") {
  await page.goto("/demo");
  await page
    .getByRole("button", {
      name: new RegExp(
        id === "demo-aarav"
          ? "Aarav Sharma"
          : id === "demo-meera"
            ? "Meera Jain"
            : id === "demo-ananya"
              ? "Ananya Rao"
              : "Demo Administrator",
      ),
    })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
}
async function create(page: Page) {
  await page
    .getByRole("link", { name: "Plan a journey", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox", { name: /I consent to matching/ }).check();
  await page.getByRole("button", { name: "Find my people" }).click();
  await expect(
    page.getByRole("button", { name: "Invite group" }).first(),
  ).toBeVisible();
}
async function invite(page: Page) {
  await create(page);
  await page.getByRole("button", { name: "Invite group" }).first().click();
  await expect(
    page.getByRole("heading", { name: "A shared plan. Everyone’s say." }),
  ).toBeVisible();
  return page.url().split("/").at(-1)!;
}
async function acceptVisible(page: Page) {
  await page
    .getByRole("checkbox", {
      name: "I agree to this group, departure and fare method.",
    })
    .check();
  await page.getByRole("button", { name: "Accept current terms" }).click();
}
async function reset(request: APIRequestContext) {
  await post(request, "auth/demo", { userId: "demo-admin" });
  expect((await post(request, "demo/reset")).ok()).toBeTruthy();
}
test.beforeEach(async ({ request }) => {
  await reset(request);
});
test("onboarding → persisted request → computed compatible groups", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Some journeys/ }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/landing-desktop.png",
    fullPage: true,
  });
  await persona(page);
  await create(page);
  await expect(page.getByText("TOP COMPATIBLE GROUP")).toBeVisible();
  await page.getByLabel("Sort groups").selectOption("price");
  await page.getByRole("button", { name: "2 riders", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "2 riders", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "All groups", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/discovery-desktop.png",
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Invite group" }).first(),
  ).toBeVisible();
  await expect(page.getByText("SYNTHETIC DEMO", { exact: true })).toBeVisible();
  await page.goto("/app");
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/dashboard-desktop.png",
    fullPage: true,
  });
});
test("individual acceptance → mutual lock → pickup reveal", async ({
  page,
}) => {
  await persona(page);
  const gid = await invite(page);
  await page
    .getByRole("button", { name: "I'm ready to leave.", exact: true })
    .click();
  await expect(page.getByLabel("Message your group")).toHaveValue(
    "I'm ready to leave.",
  );
  const unsent = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(unsent.messages).toHaveLength(0);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.locator(".messages").getByText("I'm ready to leave.", { exact: true }),
  ).toBeVisible();
  const before = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(before.group.plan.pickup).toBe("");
  await acceptVisible(page);
  for (const m of before.members.filter(
    (m: { userId: string }) => m.userId !== "demo-aarav",
  )) {
    await page.getByLabel("Switch synthetic persona").selectOption(m.userId);
    await expect(
      page.getByRole("button", { name: "Accept current terms" }),
    ).toBeVisible();
    await acceptVisible(page);
  }
  await expect(
    page.getByText("Meeting point shared after mutual consent"),
  ).toHaveCount(0);
  const after = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(after.group.status).toBe("CONFIRMED");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/group-confirmed.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/group-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(
    after.members.every(
      (m: { acceptedVersion: number }) =>
        m.acceptedVersion === after.group.version,
    ),
  ).toBeTruthy();
});
test("cancellation invalidates stale terms and recalculates current fares", async ({
  page,
}) => {
  await persona(page);
  const gid = await invite(page);
  const before = await (await page.request.get(`/api/groups/${gid}`)).json();
  await acceptVisible(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Decline / leave group" }).click();
  await expect(
    page.getByRole("heading", { name: "Find co-travellers", exact: true }),
  ).toBeVisible();
  const survivor = before.members.find(
    (m: { userId: string }) => m.userId !== "demo-aarav",
  );
  await post(page.request, "auth/demo", { userId: survivor.userId });
  const current = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(current.group.version).toBeGreaterThan(before.group.version);
  expect(
    current.members.every(
      (m: { acceptedVersion: number }) => m.acceptedVersion === 0,
    ),
  ).toBeTruthy();
  expect(
    current.members.some((m: { userId: string }) => m.userId === "demo-aarav"),
  ).toBeFalsy();
  expect(
    current.group.plan.allocations.reduce(
      (s: number, a: { paise: number }) => s + a.paise,
      0,
    ),
  ).toBe(current.group.plan.farePaise);
});
test("report and block is persisted and visible to permitted administrator", async ({
  page,
}) => {
  await persona(page);
  await create(page);
  await page.goto("/app/reports/new?target=demo-meera");
  await page
    .getByLabel("Your report")
    .fill("Synthetic test: repeated unwanted contact.");
  await page.getByRole("checkbox", { name: /Also block/ }).check();
  await page.getByRole("button", { name: "Submit report" }).click();
  await expect(
    page.getByRole("heading", { name: "Report recorded." }),
  ).toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.matches.every((p: { trips: { ownerId: string }[] }) =>
      p.trips.every((t) => t.ownerId !== "demo-meera"),
    ),
  ).toBeTruthy();
  await page.getByLabel("Switch synthetic persona").selectOption("demo-admin");
  await page.goto("/admin/community");
  await expect(
    page.getByText("Synthetic test: repeated unwanted contact."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark reviewed" }).click();
  await expect(page.getByText("reviewed", { exact: true })).toBeVisible();
});
test("benchmark uses the same synthetic input and exports JSON and CSV", async ({
  page,
}) => {
  await persona(page, "demo-admin");
  await page.goto("/demo/control");
  await page.getByRole("button", { name: "25", exact: true }).click();
  await page.getByRole("button", { name: "Run comparison" }).click();
  await expect(
    page.getByRole("heading", { name: "Baseline vs. optimizer" }),
  ).toBeVisible();
  const [json] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "JSON", exact: true }).click(),
  ]);
  expect(json.suggestedFilename()).toMatch(/synthetic-seed-42.json/);
  const exported = JSON.parse(await readFile((await json.path())!, "utf8"));
  expect(exported.synthetic).toBe(true);
  expect(exported.inputIds).toHaveLength(25);
  const [csv] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV", exact: true }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(/\.csv$/);
  const csvText = await readFile((await csv.path())!, "utf8");
  expect(csvText).toContain("true,42,25,none,optimizer");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/benchmark-studio.png",
    fullPage: true,
  });
  const state = await (await page.request.get("/api/state")).json();
  expect(state.runs[0].baseline.eligible).toBe(
    state.runs[0].optimizer.eligible,
  );
  expect(
    state.runs[0].baseline.violations + state.runs[0].optimizer.violations,
  ).toBe(0);
});
test("external handoff → actual paise → all fare reviews → manual settlement", async ({
  page,
}) => {
  await persona(page);
  const gid = await invite(page);
  const room = await (await page.request.get(`/api/groups/${gid}`)).json();
  for (const m of room.members) {
    await post(page.request, "auth/demo", { userId: m.userId });
    expect(
      (await post(page.request, `groups/${gid}/accept`, { version: 1 })).ok(),
    ).toBeTruthy();
  }
  await post(page.request, "auth/demo", { userId: room.group.hostId });
  await page.reload();
  await page.getByRole("button", { name: "Prepare external booking" }).click();
  await expect(
    page.getByRole("link", { name: /Open Uber website/ }),
  ).toHaveAttribute("href", "https://www.uber.com/in/en/ride/");
  await page.getByRole("button", { name: "I booked externally" }).click();
  await page.getByLabel("Actual cab fare · ₹").fill("640.25");
  await page.getByRole("button", { name: "Recalculate actual shares" }).click();
  await expect(page.getByText("MANUALLY ENTERED ACTUAL FARE")).toBeVisible();
  let updated = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(
    updated.group.plan.allocations.reduce(
      (s: number, a: { paise: number }) => s + a.paise,
      0,
    ),
  ).toBe(64025);
  for (const m of room.members) {
    await post(page.request, "auth/demo", { userId: m.userId });
    expect(
      (
        await post(page.request, `groups/${gid}/fare-accept`, {
          version: updated.group.fareVersion,
        })
      ).ok(),
    ).toBeTruthy();
  }
  await page.reload();
  await page.getByRole("button", { name: "Mark my share paid" }).click();
  await expect(
    page.getByText("Paid · self-reported", { exact: true }),
  ).toBeVisible();
  updated = await (await page.request.get(`/api/groups/${gid}`)).json();
  expect(updated.members.filter((m: { paid: boolean }) => m.paid)).toHaveLength(
    1,
  );
});
test("mobile 360px, Hindi essentials and theme remain usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await persona(page);
  await page.getByRole("button", { name: "Switch language" }).click();
  await expect(
    page
      .getByRole("link", { name: "यात्रा की योजना बनाएँ", exact: true })
      .first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/mobile-hindi-dark.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("link", { name: "मेरी यात्राएँ" })).toBeVisible();
  await page.getByRole("link", { name: "मेरी यात्राएँ" }).click();
  await expect(
    page.getByRole("heading", { name: "मेरी यात्राएँ" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Mobile quick navigation" })
    .getByRole("link", { name: "Fare", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "A fair share of the journey." }),
  ).toBeVisible();
});
test("HTTP rejects cross-site writes and non-member group requests", async ({
  page,
}) => {
  await persona(page);
  const gid = await invite(page);
  const cross = await page.request.post(`/api/groups/${gid}/accept`, {
    data: { version: 1 },
    headers: { Origin: "https://unrelated.invalid" },
  });
  expect(cross.status()).toBe(403);
  await post(page.request, "auth/demo", { userId: "demo-admin" });
  expect((await page.request.get(`/api/groups/${gid}`)).status()).toBe(403);
});

test("concurrent invitations reserve each passenger once and keep pickup private", async ({
  page,
}) => {
  await persona(page);
  await create(page);
  const initial = await (await page.request.get("/api/state")).json();
  expect(initial.matches[0].path.hubs).toEqual([]);
  const body = {
    tripIds: initial.matches[0].trips.map((t: { id: string }) => t.id),
  };
  const responses = await Promise.all([
    post(page.request, "groups", body),
    post(page.request, "groups", body),
  ]);
  expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
  const created = await responses.find((r) => r.status() === 201)!.json();
  expect(created).not.toHaveProperty("plan");
  const room = await (
    await page.request.get(`/api/groups/${created.id}`)
  ).json();
  expect(room.group.plan.pickup).toBe("");
  expect(room.group.plan.path.hubs).toEqual([]);
  expect(
    new Set(room.members.map((m: { userId: string }) => m.userId)).size,
  ).toBe(room.members.length);
  const accepted = await (
    await post(page.request, `groups/${created.id}/accept`, { version: 1 })
  ).json();
  expect(accepted).not.toHaveProperty("plan");
});

test("Yatra Sync fare planner reconciles shares and adapts to mobile", async ({
  page,
}) => {
  await persona(page);
  await page.goto("/app/fare");
  await expect(page).toHaveTitle(/Yatra Sync/);
  await expect(
    page.getByRole("heading", { name: "A fair share of the journey." }),
  ).toBeVisible();
  const total = page.getByLabel("Group fare to explore");
  await total.fill("725.43");
  await page.getByRole("button", { name: "4 riders", exact: true }).click();
  await expect(page.getByTestId("planner-share")).toHaveCount(4);
  const shares = await page.getByTestId("planner-share").allTextContents();
  expect(
    shares.reduce(
      (sum, s) => sum + Math.round(Number(s.replace(/[^0-9.]/g, "")) * 100),
      0,
    ),
  ).toBe(72543);
  await expect(page.getByTestId("planner-total")).toContainText("725.43");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/fare-desktop.png",
    fullPage: true,
  });
  await total.fill("1.234");
  await expect(
    page.getByRole("alert").filter({ hasText: "two decimal places" }),
  ).toContainText("two decimal places");
  await expect(
    page.getByRole("button", { name: "Copy breakdown" }),
  ).toBeDisabled();
  await total.fill("640.25");
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(360);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/fare-mobile.png",
    fullPage: true,
  });
});

test("canvas identity stays usable across five viewport sizes", async ({
  page,
}) => {
  test.setTimeout(180000);
  await persona(page);
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/app",
      "/app/matches",
      "/app/fare",
      "/app/trips/new",
      "/app/profile",
      "/app/history",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (route === "/") {
        await expect
          .poll(() =>
            page
              .locator(".artwork-frame img")
              .evaluate(
                (img) =>
                  (img as HTMLImageElement).complete &&
                  (img as HTMLImageElement).naturalWidth > 0,
              ),
          )
          .toBeTruthy();
        await page.screenshot({
          path: `docs/evidence/yatra-canvas/landing-${width}.png`,
          fullPage: width < 800,
        });
      }
      if (width === 390 && route === "/app/matches")
        await page.screenshot({
          path: "docs/evidence/yatra-canvas/discovery-mobile.png",
          fullPage: true,
        });
    }
  }
  await page.goto("/");
  const primary = page.getByRole("link", { name: "Find people on your route" });
  await primary.focus();
  await primary.press("Enter");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/demo");
  await expect(
    page.getByRole("button", { name: /Aarav Sharma/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/onboarding-desktop.png",
    fullPage: true,
  });
});

test("commute shortcuts, manual surge comparison and mobile layout", async ({
  page,
}) => {
  await persona(page);
  await page.getByLabel("Solo cab quote · ₹", { exact: true }).fill("480");
  await page.getByLabel("Whole shared cab quote · ₹").fill("540");
  await expect(page.locator(".quote-result")).toContainText("₹270");
  await expect(page.locator(".quote-result")).toContainText("₹210");
  await page.getByText("Include tolls, parking or other extras").click();
  await page.getByLabel("Extra cost for the whole cab · ₹").fill("60");
  await expect(page.locator(".quote-result")).toContainText("₹300");
  await page.getByLabel("Whole shared cab quote · ₹").fill("1000");
  await expect(
    page.getByText(/Sharing does not lower your cost/),
  ).toBeVisible();
  await page.getByLabel("Whole shared cab quote · ₹").fill("540");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/commute-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/commute-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Airport", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Starting hub", exact: true }),
  ).toHaveValue("malviya");
  await page.getByRole("button", { name: "In 5 min", exact: true }).click();
  const now = Date.now();
  await page.getByRole("button", { name: "Find people on this route" }).click();
  await expect(
    page.getByRole("combobox", { name: "Starting point", exact: true }),
  ).toHaveValue("malviya");
  await expect(
    page.getByRole("combobox", { name: "Destination", exact: true }),
  ).toHaveValue("airport");
  const departure = await page
    .getByLabel("Earliest departure · IST")
    .inputValue();
  expect(Date.parse(`${departure}:00+05:30`) - now).toBeGreaterThan(4 * 60000);
  expect(Date.parse(`${departure}:00+05:30`) - now).toBeLessThan(7 * 60000);
});

test("return journey reuses owned history but refreshes quote and times", async ({
  page,
}) => {
  await persona(page);
  const now = Date.now();
  const made = await post(page.request, "trips", {
    origin: "sitapura",
    destination: "malviya",
    earliest: now + 600000,
    latest: now + 2400000,
    maxWait: 10,
    maxDetour: 8,
    maxWalk: 250,
    seats: 1,
    luggage: "medium",
    provider: "uber",
    womenOnly: false,
    soloPaise: 48000,
  });
  expect(made.ok()).toBeTruthy();
  const trip = await made.json();
  expect(
    (await post(page.request, `trips/${trip.id}/cancel`)).ok(),
  ).toBeTruthy();
  await page.reload();
  await page.getByRole("link", { name: "Return", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Starting point", exact: true }),
  ).toHaveValue("malviya");
  await expect(
    page.getByRole("combobox", { name: "Destination", exact: true }),
  ).toHaveValue("sitapura");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Maximum wait · minutes")).toHaveValue("10");
  await expect(page.getByLabel("Provider preference")).toHaveValue("uber");
  await expect(page.getByLabel("Your current solo cab quote · ₹")).toHaveValue(
    "",
  );
});

test("judge presentation computes matches and invalidates simulated consent after replacement", async ({
  page,
}) => {
  await page.goto("/demo/present");
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/judge-opening.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Start the story" }).click();
  await page.getByRole("button", { name: "Find their match" }).click();
  await expect(
    page.getByRole("button", { name: "Match computed" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Chapter 4:/ }).click();
  for (const name of ["Aarav", "Meera", "Kabir", "Ananya"])
    await page
      .getByRole("button", { name: `Simulate ${name} consent` })
      .click();
  await expect(
    page.getByText("Ready in sandbox", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Chapter 5:/ }).click();
  await page.getByRole("button", { name: "Simulate Kabir leaving" }).click();
  await page.getByRole("button", { name: "Suggest a replacement" }).click();
  await page.getByRole("button", { name: /Chapter 4:/ }).click();
  await expect(
    page.getByText("SHARED TERMS · VERSION 3", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Simulate Nisha consent" }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByText(/^0 of 4 simulated approvals/)).toBeVisible();
  await page.screenshot({
    path: "docs/evidence/yatra-canvas/judge-consent.png",
    fullPage: true,
  });
});
