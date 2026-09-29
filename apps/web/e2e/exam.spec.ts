import { expect, test } from "@playwright/test";

import { axeClean } from "./helpers";

/**
 * The mock exam against the hermetic container (the fixture bank's 25-item reading
 * form, which is unsupervised). Hermetic state lives for one page load, so this moves
 * by in-app navigation only, from the picker to the results. The reload and network
 * drop are journey 3, in `exam-offline.spec.ts`.
 */
test("a mock exam runs from the picker to its results, by keyboard, with the navigator, flags and the submit dialog", async ({
  page,
}) => {
  await page.goto("/en/exam");
  // The fixture bank ships no supervised form, and the picker says so rather than hiding it.
  await expect(page.getByText("Not in this item bank yet").first()).toBeVisible();
  await page.getByRole("radio", { name: /Unsupervised/ }).check();
  await expect(page.getByText("25 items · 45 min")).toBeVisible();
  await page.getByRole("checkbox", { name: /Extra time/ }).check();
  await expect(page.getByText("25 items · 67.5 min")).toBeVisible();
  await page.getByRole("button", { name: "Start the exam" }).click();

  await expect(page).toHaveURL(/\/en\/exam\/run\?run=/);
  await expect(page.locator("[data-mode='exam']")).toBeVisible();
  await expect(page.getByRole("group", { name: "Time left" })).toContainText("67:");

  // Selecting is answering: 2 answers item 1, and F flags it. Enter goes on.
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  await expect(page.getByText("Flagged", { exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator(".app-exam__count")).toHaveText("Item 2 of 25 · 1 answered");
  await axeClean(page);

  // The navigator shows item 1's state in words, and jumps back to it.
  await page.getByRole("button", { name: "All items" }).click();
  const navigator = page.getByRole("dialog", { name: "All items" });
  await expect(navigator.getByRole("button", { name: "Item 1: answered, flagged" })).toBeVisible();
  await axeClean(page);
  await navigator.getByRole("button", { name: "Item 1: answered, flagged" }).click();
  await expect(navigator).toBeHidden();
  await expect(page.locator(".app-exam__count")).toHaveText("Item 1 of 25 · 1 answered");
  await expect(page.getByRole("radio", { checked: true })).toBeFocused();

  // Submit with 24 unanswered: the dialog says so, and Keep working goes back.
  await page.getByRole("button", { name: "Submit the exam" }).click();
  const dialog = page.getByRole("dialog", { name: "Submit the exam?" });
  await expect(dialog).toContainText("24 items are not answered.");
  await expect(dialog).toContainText("1 item is flagged for review.");
  await axeClean(page);
  await dialog.getByRole("button", { name: "Keep working" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Submit the exam" }).click();
  await dialog.getByRole("button", { name: "Submit", exact: true }).click();

  await expect(page).toHaveURL(/\/en\/exam\/results\?run=/);
  await expect(page.getByRole("heading", { name: "Exam results" })).toBeVisible();
  await expect(page.getByText(/^Level [XABCE]$/)).toBeVisible();
  // The band never stands without the statement that it is not official (R5, D145).
  await expect(page.locator(".app-result .app-nonaffiliation")).toContainText("not affiliated");
  await expect(page.getByText(/of 25 correct\./)).toBeVisible();
  await expect(page.getByText("Taken with extra time.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Every item" })).toBeVisible();
  await axeClean(page);

  // Every item starts with the same button, whether the submit queued it or not, so no
  // wrong pilot stands out as the one wrong answer left unqueued (D84 ruling 9, D89).
  await expect(page.locator(".app-review-entry")).toHaveCount(25);
  await expect(page.locator(".app-review-entry button", { hasText: "Add to review queue" })).toHaveCount(25);

  // The walkthrough opens an item, and adds it to the review queue in one tap.
  // Item 2 was left unanswered, so nothing queued it at submit.
  const entry = page.locator(".app-review-entry").nth(1);
  await entry.locator(".app-review-entry__summary").click();
  await entry.getByRole("button", { name: "Add to review queue" }).click();
  await expect(entry.getByText("In your review queue")).toBeVisible();
  await axeClean(page);
});
