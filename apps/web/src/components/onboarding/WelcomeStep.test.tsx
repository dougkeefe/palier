import { describe, expect, it, vi } from "vitest";

import { html, links } from "../../__tests__/render";
import { WelcomeStep } from "./WelcomeStep";

const nav = vi.hoisted(() => ({ pathname: "/start" }));
vi.mock("../../i18n/navigation", async () => (await import("../../__tests__/render")).fakeNavigation(nav));

describe("WelcomeStep (D269, D272)", () => {
  it("welcomes in one line, says what Palier is, and asks no question", () => {
    const markup = html(<WelcomeStep headingRef={null} progress={null} onNext={() => undefined} ready bring={<p>bring</p>} />);
    expect(markup).toContain("Welcome to Palier");
    expect(markup).toContain("Practice for the Public Service Commission’s Second Language Evaluation");
    expect(markup).not.toContain('type="radio"');
  });

  it("carries the non-affiliation statement, and nothing else under the lead (R5, D272)", () => {
    const markup = html(<WelcomeStep headingRef={null} progress={null} onNext={() => undefined} ready bring={<p>bring</p>} />);
    expect(markup).toContain("app-nonaffiliation--inline");
    expect(markup).not.toContain("<ul");
    expect(markup).not.toContain("Free practice");
  });

  it("links nowhere, since settings wait until onboarding is done, and ends with the quiet ways to bring progress in (D271)", () => {
    const markup = html(<WelcomeStep headingRef={null} progress={null} onNext={() => undefined} ready bring={<p>bring</p>} />);
    expect(links(markup)).toEqual([]);
    expect(markup.endsWith("<p>bring</p></div>")).toBe(true);
    expect(markup.indexOf("Continue")).toBeLessThan(markup.indexOf("<p>bring</p>"));
  });

  it("waits until the app is ready before its way on works, as every other step's does", () => {
    const waiting = html(<WelcomeStep headingRef={null} progress={null} onNext={() => undefined} ready={false} bring={null} />);
    const ready = html(<WelcomeStep headingRef={null} progress={null} onNext={() => undefined} ready bring={null} />);
    expect(waiting).toMatch(/<button[^>]*disabled=""[^>]*>Continue/);
    expect(ready).not.toMatch(/<button[^>]*disabled=""/);
  });
});
