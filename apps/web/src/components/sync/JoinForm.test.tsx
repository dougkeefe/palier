// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { provided } from "../../__tests__/render";
import { JoinForm } from "./JoinForm";

const held = vi.hoisted(() => ({ pairDevice: vi.fn(), settle: vi.fn() }));
vi.mock("../ContainerProvider", () => ({
  useContainer: () => ({ status: "ready", container: { useCases: { pairDevice: held.pairDevice } } }),
}));
vi.mock("./SyncRunner", () => ({ useSync: () => ({ settle: held.settle }) }));

beforeEach(() => {
  held.pairDevice.mockReset();
  held.settle.mockReset();
});
afterEach(cleanup);

const enter = (code: string) => {
  fireEvent.change(screen.getByLabelText("Code"), { target: { value: code } });
  fireEvent.click(screen.getByRole("button", { name: "Link this device" }));
};

describe("JoinForm (D270)", () => {
  it("says a code that is not one is not, without asking the server", () => {
    render(provided(<JoinForm />, "en"));
    enter("no");
    expect(screen.getByText(/That does not look like a code/)).toBeTruthy();
    expect(held.pairDevice).not.toHaveBeenCalled();
  });

  it("links with a code, says how much came over, and tells the caller once it has settled", async () => {
    held.pairDevice.mockResolvedValue({ status: "synced", pulled: 3 });
    const onJoined = vi.fn();
    render(provided(<JoinForm onJoined={onJoined} />, "en"));
    enter("abc234");
    expect(await screen.findByText("This device is linked. 3 records came over.")).toBeTruthy();
    expect(held.pairDevice).toHaveBeenCalledWith(expect.objectContaining({ code: "ABC234" }));
    expect(held.settle).toHaveBeenCalledWith({ status: "synced", pulled: 3 });
    expect(onJoined).toHaveBeenCalledWith(true);
  });

  it("tells the caller when the link was made but its first exchange could not sync, so nothing is claimed to have come over", async () => {
    held.pairDevice.mockResolvedValue({ status: "unavailable" });
    const onJoined = vi.fn();
    render(provided(<JoinForm onJoined={onJoined} />, "en"));
    enter("abc234");
    await vi.waitFor(() => expect(onJoined).toHaveBeenCalledWith(false));
  });

  it("keeps saying the device is linked when the caller's own follow-up fails", async () => {
    held.pairDevice.mockResolvedValue({ status: "synced", pulled: 2 });
    render(provided(<JoinForm onJoined={() => Promise.reject(new Error("the profile could not be read"))} />, "en"));
    enter("abc234");
    expect(await screen.findByText("This device is linked. 2 records came over.")).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("This device is linked. 2 records came over.")).toBeTruthy();
  });

  it("says so when the code is refused, and does not tell the caller anything came over", async () => {
    held.pairDevice.mockRejectedValue(Object.assign(new Error("refused"), { name: "PairCodeRejectedError" }));
    const onJoined = vi.fn();
    render(provided(<JoinForm onJoined={onJoined} />, "en"));
    enter("abc234");
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(onJoined).not.toHaveBeenCalled();
  });
});
