import { expect, type Page, test } from "@playwright/test";

/**
 * The motion switches, as a browser computes them (PRD §10.5, progress.md D160): a button's
 * state change takes §10.5's 120ms and the band meter fills over 400ms, and both are instant
 * under `prefers-reduced-motion` and anywhere inside `[data-mode="exam"]`. The elements are made
 * on the page, with the real stylesheets, so each rule is read where it is applied.
 */

const motionOf = (page: Page) =>
  page.evaluate(() => {
    // Built with DOM calls, not HTML strings, which Trusted Types refuses on a production build.
    const make = (exam: boolean) => {
      const root = document.createElement("div");
      if (exam) root.dataset["mode"] = "exam";
      const button = document.createElement("button");
      button.className = "pl-btn";
      const fill = document.createElement("div");
      fill.className = "pl-band-meter__fill";
      root.append(button, fill);
      document.body.append(root);
      return { button: getComputedStyle(button).transitionDuration, fill: getComputedStyle(fill).animationName };
    };
    return { plain: make(false), exam: make(true) };
  });

test("motion runs at §10.5's durations, never in exam mode", async ({ page }) => {
  await page.goto("/en");
  const { plain, exam } = await motionOf(page);
  expect(plain.button).toMatch(/^0\.12s/);
  expect(plain.fill).toBe("pl-fill-in");
  expect(exam).toEqual({ button: "0s", fill: "none" });
});

test("under prefers-reduced-motion, nothing moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/en");
  const { plain, exam } = await motionOf(page);
  expect(plain).toEqual({ button: "0s", fill: "none" });
  expect(exam).toEqual({ button: "0s", fill: "none" });
});
