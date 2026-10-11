import { type Page, expect, test } from "@playwright/test";

import { addKeyAtDiagnosticGate, axeClean, onboard } from "./helpers";
import { SENTINEL, stubOpenAi } from "./leak-guard";

/**
 * Journey 5 (implementation-plan.md §6.2): "adding, validating and wiping an API key", on
 * the hermetic lane, where the container lives for one page load, so everything moves by
 * in-app links. OpenAI is stubbed with `page.route`, scripted per step, so each state the
 * key screen can show is reached for real through the real adapter (PRD §8.10, §14;
 * progress.md D100). Every state is audited by axe [R9].
 */

type Answer = { status: number; body: unknown };
const OK: Answer = { status: 200, body: { object: "list", data: [{ id: "gpt-stub", object: "model" }] } };
const refusal = (status: number, code: string): Answer => ({ status, body: { error: { message: code, code } } });

test("journey 5: onboarding's step 5 takes the key and checks it, then the key screen checks, refuses, removes and keeps it for a tab", async ({
  page,
  context,
}) => {
  let answer = OK;
  await stubOpenAi(context, () => answer);

  // Step 5 takes the key in place and checks it at once (D220); the wizard then writes the profile and lands on today.
  await onboard(page, "skip", { key: SENTINEL });
  await expect(page.getByRole("heading", { name: "Today’s plan" })).toBeVisible();

  // The key screen, by the footer's link: the same key, described by its last four only.
  await page.getByRole("link", { name: "Your API key", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Your API key" })).toBeVisible();
  const ending = SENTINEL.slice(-4);
  await expect(page.getByText(`Saved on this device: the key ending in ${ending}.`)).toBeVisible();
  await expect(page.getByText("Where your key is kept")).toBeVisible();
  await axeClean(page);

  // Check: each answer OpenAI can give, in plain words.
  const check = async (next: Answer, says: string) => {
    answer = next;
    await page.getByRole("button", { name: "Check the key" }).click();
    await expect(page.getByRole("status").filter({ hasText: says })).toBeVisible();
    await axeClean(page);
  };
  await check(OK, "This key works. OpenAI accepted it.");
  await check(refusal(401, "invalid_api_key"), "OpenAI did not accept this key.");
  await check(refusal(429, "insufficient_quota"), "has reached its usage limit or has no credit left");
  await check(refusal(500, "server_error"), "OpenAI returned an error (500).");
  await check({ status: 200, body: { object: "list" } }, "was not what Palier expected");

  // Remove: the form comes back, focused, and says so.
  const field = page.getByLabel("OpenAI API key");
  await page.getByRole("button", { name: "Remove the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The key has been removed" })).toBeVisible();
  await expect(field).toBeFocused();

  // A blank save is caught, and says what to do.
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Paste a key first." })).toBeVisible();

  // Save: the field is masked, then emptied, and the key is described by its last four only. The key screen
  // waits for its own check, unlike onboarding's step.
  await expect(field).toHaveAttribute("type", "password");
  await field.fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Saved on this device: the key ending in ${ending}.`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your key", exact: true })).toBeFocused();
  await expect(page.getByRole("status").filter({ hasText: "Checking with OpenAI" })).toHaveCount(0);
  await axeClean(page);

  // For this tab only.
  await page.getByRole("button", { name: "Remove the key" }).click();
  await field.fill(SENTINEL);
  await page.getByRole("checkbox", { name: /for this tab only/ }).check();
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(`Held for this tab only: the key ending in ${ending}.`)).toBeVisible();
  answer = OK;
  await page.getByRole("button", { name: "Check the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();

  // A wipe takes the key too.
  await page.getByRole("link", { name: "Your data", exact: true }).click();
  await page.getByRole("button", { name: "Delete everything" }).click();
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByText("Everything on this device has been deleted.")).toBeVisible();
  await page.getByRole("link", { name: "Your API key", exact: true }).click();
  await expect(field).toBeVisible();
  await expect(page.getByText(/the key ending in/)).toHaveCount(0);
});

/** From `/en/start`, through the first three steps with their defaults, to the key, step 4 (D224). */
const toKeyStep = async (page: Page) => {
  const next = page.getByRole("button", { name: "Continue" });
  await expect(next).toBeEnabled();
  for (let i = 0; i < 3; i++) await next.click();
};

/** From the key step on to the placement, the last step, choosing it and finishing. */
const placeAndFinish = async (page: Page, placement: "diagnostic" | "skip") => {
  await expect(page.getByRole("heading", { level: 2, name: "Where are you now?" })).toBeFocused();
  await page.getByRole("radio", { name: placement === "diagnostic" ? /Take the diagnostic/ : /Skip for now/ }).check();
  await page.getByRole("button", { name: placement === "diagnostic" ? "Start the diagnostic" : "Start practising" }).click();
};

test("the key step says why a key, what it costs and how to get one, with the video, before the placement (D220, D224)", async ({
  page,
}) => {
  await page.goto("/en/start");
  await toKeyStep(page);
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Add your OpenAI key" })).toBeFocused();

  // Why and what it costs come first, closed until asked, so the video is in view on arrival (D222).
  const disclosures = page.locator("details > summary");
  await expect(disclosures.nth(0)).toHaveText("Why your own key");
  await expect(disclosures.nth(1)).toHaveText("What it costs");
  await expect(page.getByRole("heading", { level: 3 }).first()).toHaveText("How to get one");
  await expect(page.getByText("It keeps Palier free.", { exact: false })).toBeHidden();
  await expect(page.locator("video")).toBeInViewport({ ratio: 1 });

  await disclosures.nth(0).click();
  await expect(page.getByText("It keeps Palier free.", { exact: false })).toBeVisible();
  // Where the key goes names the one exception, studio mode's route (D173, D186).
  await expect(page.getByText("goes to OpenAI, and once to Palier’s server for each studio conversation", { exact: false })).toBeVisible();

  // The costs are pricing.json's, priced, never a zero and never a placeholder.
  await disclosures.nth(1).click();
  const costs = page.locator("details", { hasText: "What it costs" }).getByRole("listitem");
  await expect(costs).toHaveCount(5);
  await expect(costs.first()).toHaveText(/^Diagnostic result: about US\$\d+\.\d+ each$/);
  await expect(page.getByText(/^Spoken practice: about US\$\d+\.\d+ a minute$/)).toBeVisible();

  // The video loads nothing until asked, and is served from this origin as an mp4.
  const video = page.locator("video");
  await expect(video).toHaveAttribute("preload", "none");
  await expect(video).toHaveAttribute("poster", /\/_next\/static\/media\/openai-explainer-poster\..*\.webp$/);
  const src = await page.locator("video source").getAttribute("src");
  expect(src).toBe("/media/openai-explainer.mp4");
  const served = await page.request.get(src ?? "", { headers: { range: "bytes=0-1023" } });
  expect([200, 206]).toContain(served.status());
  expect(served.headers()["content-type"]).toBe("video/mp4");

  // The same steps, written out, open on demand; OpenAI's pages open in a new tab.
  await page.getByText("Read the steps instead").click();
  await expect(page.getByText("Come back here and paste it into the field below.")).toBeVisible();
  await expect(page.getByRole("link", { name: /OpenAI’s limits page/ })).toHaveAttribute("target", "_blank");
  await axeClean(page);

  // Passed over, the wizard goes on to the placement, the last step, and from there to today.
  await page.getByRole("button", { name: "Not now, continue without a key" }).click();
  await expect(page.getByText("Step 5 of 5")).toBeVisible();
  await placeAndFinish(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
});

test("the key step says so at once when OpenAI refuses the key pasted there", async ({ page, context }) => {
  await stubOpenAi(context, () => refusal(429, "insufficient_quota"));
  await page.goto("/en/start");
  await toKeyStep(page);
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "has reached its usage limit or has no credit left" })).toBeVisible();
  await axeClean(page);
});

for (const [name, size] of [
  ["a taller window", { width: 1440, height: 900 }],
  ["a phone", { width: 390, height: 844 }],
] as const) {
  test(`the key step opens with the whole video and its heading in view on ${name} (D222)`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto("/en/start");
    await toKeyStep(page);
    await expect(page.getByRole("heading", { level: 2, name: "Add your OpenAI key" })).toBeFocused();
    await expect(page.getByRole("heading", { level: 2, name: "Add your OpenAI key" })).toBeInViewport();
    await expect(page.locator("video")).toBeInViewport({ ratio: 1 });
  });
}

test("a key saved in the key step, then the diagnostic chosen last, leads straight to the diagnostic's launcher (D224)", async ({
  page,
  context,
}) => {
  await stubOpenAi(context);
  await page.goto("/en/start");
  await toKeyStep(page);
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByRole("status").filter({ hasText: "This key works." })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  // Back from the placement finds the key step still holding the key.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await placeAndFinish(page, "diagnostic");
  await expect(page).toHaveURL(/\/en\/diagnostic$/);
  // The key is held, so the launcher stands where the gate would.
  await expect(page.getByRole("button", { name: /^Start the .* diagnostic$/ })).toBeVisible();
});

test("with a key already held, onboarding leaves the key step out and counts four steps", async ({ page, context }) => {
  await stubOpenAi(context);
  await page.goto("/en/settings/key");
  await page.getByLabel("OpenAI API key").fill(SENTINEL);
  await page.getByRole("button", { name: "Save the key" }).click();
  await expect(page.getByText(/^Saved on this device/)).toBeVisible();
  // In-app, since the hermetic container lives for one page load: today sends a new user to onboarding (D224).
  await page.getByRole("link", { name: "Today", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/start$/);
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  const next = page.getByRole("button", { name: "Continue" });
  for (let i = 0; i < 3; i++) await next.click();
  // From the goal straight to the placement; and back from it to the goal, never to a hidden key step.
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "How much time a day?" })).toBeFocused();
  await next.click();
  await placeAndFinish(page, "skip");
  await expect(page).toHaveURL(/\/en\/home$/);
});

test("the key guide shows the video and the seven steps, and links back to the key", async ({ page }) => {
  await page.goto("/en/settings/key/guide");
  await expect(page.getByRole("heading", { level: 1, name: "Create an OpenAI key" })).toBeVisible();
  await expect(page.locator("video source")).toHaveAttribute("src", "/media/openai-explainer.mp4");
  await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(7);
  await expect(page.getByRole("link", { name: /OpenAI’s limits page/ })).toHaveAttribute(
    "href",
    /^https:\/\/platform\.openai\.com\//,
  );
  await axeClean(page);
});

test("with the key passed over, choosing the diagnostic last lands on it, and it asks for the key first (ADR 25, D224)", async ({
  page,
}) => {
  await onboard(page, "diagnostic");
  await expect(page).toHaveURL(/\/en\/diagnostic$/);
  // No question is asked before the key is held: the gate stands where the launcher would.
  await expect(page.getByRole("button", { name: /^Start the .* diagnostic$/ })).toHaveCount(0);
  await expect(page.getByText("Drills, mock exams and your progress all work without a key.")).toBeVisible();
  await addKeyAtDiagnosticGate(page, SENTINEL);
  await expect(page).toHaveURL(/\/en\/diagnostic$/);
  await axeClean(page);
});

test("the key screen and its guide render in French too, at parity", async ({ page }) => {
  await page.goto("/fr/settings/key");
  await expect(page.getByRole("heading", { level: 1, name: "Votre clé d’API" })).toBeVisible();
  await expect(page.getByLabel("Clé d’API OpenAI")).toBeVisible();
  await axeClean(page);
  await page.goto("/fr/settings/key/guide");
  await expect(page.getByRole("heading", { level: 1, name: "Créer une clé OpenAI" })).toBeVisible();
  await axeClean(page);
});

test("the spend section: an empty meter, a cap refused, set and removed, and the per-feature table (PRD §8.10, D101–D104)", async ({
  page,
}) => {
  await page.goto("/en/settings/key");
  await expect(page.getByRole("heading", { name: "What you have spent" })).toBeVisible();

  // Nothing spent on this device yet: three zeroes, and no cap.
  const meter = page.locator(".app-meter");
  for (const window of ["This session", "This week", "This month"]) {
    await expect(meter.getByText(window, { exact: true })).toBeVisible();
  }
  await expect(meter.getByText("US$0.00")).toHaveCount(3);
  await expect(page.getByText("Spending is counted on each device separately.")).toBeVisible();
  await expect(page.getByText("No cap is set.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set a hard limit on OpenAI’s limits page" })).toHaveAttribute(
    "href",
    /^https:\/\/platform\.openai\.com\//,
  );
  await axeClean(page);

  // A cap that is not an amount is refused, and says why.
  const cap = page.getByLabel("Monthly cap, in US dollars");
  const setCap = page.getByRole("button", { name: "Set the cap" });
  await setCap.click();
  await expect(page.getByRole("status").filter({ hasText: "Type an amount first." })).toBeVisible();
  await cap.fill("five");
  await setCap.click();
  await expect(page.getByRole("status").filter({ hasText: "That is not an amount." })).toBeVisible();
  await cap.fill("0");
  await setCap.click();
  await expect(page.getByRole("status").filter({ hasText: "A cap must be more than zero." })).toBeVisible();
  await axeClean(page);

  // Set, then removed.
  await cap.fill("12,50");
  await setCap.click();
  await expect(page.getByRole("status").filter({ hasText: "The cap is set." })).toBeVisible();
  await expect(page.getByText("Your cap is US$12.50 a month. This month is at 0 percent of it.")).toBeVisible();
  await axeClean(page);
  await page.getByRole("button", { name: "Remove the cap" }).click();
  await expect(page.getByRole("status").filter({ hasText: "The cap has been removed." })).toBeVisible();
  await expect(page.getByText("No cap is set.")).toBeVisible();

  // The per-feature table: a caption, column headers, and a figure for every feature.
  const table = page.getByRole("table", { name: "Estimated cost of one typical use" });
  await expect(table.getByRole("columnheader")).toHaveText(["Feature", "What it does", "Typical cost"]);
  for (const feature of ["Writing feedback", "Fresh practice items"]) {
    const row = table.getByRole("row").filter({ has: page.getByRole("rowheader", { name: feature }) });
    await expect(row.getByRole("cell").last()).toHaveText(/^US\$\d+\.\d{2,4}$/);
  }
  await axeClean(page);
});

test("the spend section renders in French too, at parity", async ({ page }) => {
  await page.goto("/fr/settings/key");
  await expect(page.getByRole("heading", { name: "Ce que vous avez dépensé" })).toBeVisible();
  await expect(page.getByLabel("Plafond mensuel, en dollars américains")).toBeVisible();
  await expect(page.getByRole("table", { name: "Coût estimé d’une utilisation typique" })).toBeVisible();
  await expect(page.locator(".app-meter").getByText(/0,00\s\$\sUS/)).toHaveCount(3);
  await axeClean(page);
});
