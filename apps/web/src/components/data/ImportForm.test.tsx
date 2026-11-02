// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { type Container, createContainer } from "../../lib/container";
import { readStudyProfile, writeStudyProfile } from "../../lib/study";
import { ImportForm } from "./ImportForm";

const held = vi.hoisted(() => ({ container: null as Container | null }));
vi.mock("../ContainerProvider", () => ({
  useContainer: () => (held.container === null ? { status: "loading" } : { status: "ready", container: held.container }),
}));

beforeEach(() => {
  held.container = createContainer({ hermetic: true });
});
afterEach(cleanup);

const choose = (contents: string) =>
  fireEvent.change(screen.getByLabelText("Choose an export file"), {
    target: { files: [new File([contents], "export.json", { type: "application/json" })] },
  });

describe("ImportForm (D270)", () => {
  it("brings an export's settings in, the study profile with them, and tells the caller", async () => {
    const source = createContainer({ hermetic: true });
    const profile = {
      targets: { reading: "B", writing: "C", oral: "B" },
      current: { reading: null, writing: null, oral: null },
      dailyGoalMinutes: 10,
      testDate: null,
    } as const;
    await writeStudyProfile(source.settings, profile);
    const onImported = vi.fn();
    render(provided(<ImportForm onImported={onImported} />, "en"));
    choose(JSON.stringify(await source.useCases.exportData()));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    await vi.waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(await readStudyProfile(held.container!.settings)).toEqual(profile);
  });

  it("says a file that is not an export is not one, and tells the caller nothing", async () => {
    const onImported = vi.fn();
    render(provided(<ImportForm onImported={onImported} />, "en"));
    choose("{}");
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(onImported).not.toHaveBeenCalled();
  });

  it("keeps the import's success when the caller's own follow-up fails", async () => {
    const source = createContainer({ hermetic: true });
    render(provided(<ImportForm onImported={() => Promise.reject(new Error("the profile could not be read"))} />, "en"));
    choose(JSON.stringify(await source.useCases.exportData()));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(await screen.findByText(/^Imported/)).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText(/could not be/i)).toBeNull();
    expect(screen.getByText(/^Imported/)).toBeTruthy();
  });
});
