import { describe, expect, it } from "vitest";

import { REPORT_REASONS, REPOSITORY_URL, exportFileName, reportIssueUrl } from "./report";

describe("reportIssueUrl", () => {
  const url = new URL(
    reportIssueUrl({ itemId: "01HITEM0000000000000001", reason: "key-wrong", reasonLabel: "The key looks wrong", bankVersion: 1 }),
  );

  it("opens a new issue on the project's repository", () => {
    expect(`${url.origin}${url.pathname}`).toBe(`${REPOSITORY_URL}/issues/new`);
  });

  it("names the reason code and the item in the title, which is what the retirement rule counts", () => {
    expect(url.searchParams.get("title")).toBe("Item report: key-wrong (01HITEM0000000000000001)");
  });

  it("carries the item, the reason in words and the bank version in the body", () => {
    const body = url.searchParams.get("body") ?? "";
    expect(body).toContain("`01HITEM0000000000000001`");
    expect(body).toContain("The key looks wrong (`key-wrong`)");
    expect(body).toContain("**Bank version:** 1");
  });

  it("labels the issue so reports can be filtered by reason", () => {
    expect(url.searchParams.get("labels")).toBe("item-report,reason:key-wrong");
  });

  it("says so when the bank version is not known", () => {
    const body = new URL(reportIssueUrl({ itemId: "x", reason: "unclear", reasonLabel: "Unclear", bankVersion: null })).searchParams.get("body");
    expect(body).toContain("**Bank version:** unknown");
  });

  it("offers exactly §13.0's four reasons", () => {
    expect(REPORT_REASONS).toEqual(["key-wrong", "multiple-answers", "french-off", "unclear"]);
  });
});

describe("exportFileName", () => {
  it("dates the file by the export's own timestamp", () => {
    expect(exportFileName("2026-09-24T18:30:00.000Z")).toBe("palier-export-2026-09-24.json");
  });
});
