import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./Button.js";
import { Card } from "./Card.js";
import { Callout } from "./Callout.js";
import { EmptyState } from "./EmptyState.js";
import { Glyph } from "./Glyph.js";
import { OptionRow } from "./OptionRow.js";
import { ProgressRail } from "./ProgressRail.js";

afterEach(cleanup);

describe("Button", () => {
  it("renders a non-submitting button carrying the variant class", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("pl-btn--danger");
  });

  it("defaults to the primary variant", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button").className).toContain("pl-btn--primary");
  });

  it("merges a caller className", () => {
    render(<Button className="mt-4">Go</Button>);
    expect(screen.getByRole("button").className).toBe("pl-btn pl-btn--primary mt-4");
  });
});

describe("Card", () => {
  it("is a surface carrying the card class", () => {
    const { container } = render(<Card>Body</Card>);
    expect(container.querySelector(".pl-card")).not.toBeNull();
  });

  it("merges a caller className", () => {
    const { container } = render(<Card className="p-8">Body</Card>);
    expect(container.firstElementChild?.className).toBe("pl-card p-8");
  });
});

describe("OptionRow", () => {
  it("is a radio that reports its selection to assistive tech", () => {
    render(
      <OptionRow selected={true} onSelect={() => {}}>
        Le subjonctif
      </OptionRow>,
    );
    const radio = screen.getByRole("radio");
    expect(radio.getAttribute("aria-checked")).toBe("true");
  });

  it("calls onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <OptionRow selected={false} onSelect={onSelect}>
        Le subjonctif
      </OptionRow>,
    );
    fireEvent.click(screen.getByRole("radio"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("shows a glyph and a text label once revealed correct, so colour is not the only signal", () => {
    render(
      <OptionRow selected={true} outcome="correct" statusLabel="Correct">
        Le subjonctif
      </OptionRow>,
    );
    const radio = screen.getByRole("radio");
    expect(radio.className).toContain("pl-option--correct");
    expect(radio.querySelector("svg")).not.toBeNull();
    expect(screen.getByText("Correct")).not.toBeNull();
  });

  it("takes itself out of the tab order when not the active roving target", () => {
    render(
      <OptionRow selected={false} active={false}>
        Le subjonctif
      </OptionRow>,
    );
    expect(screen.getByRole("radio").getAttribute("tabindex")).toBe("-1");
  });
});

describe("ProgressRail", () => {
  it("exposes its progress to assistive tech", () => {
    render(<ProgressRail current={3} total={12} label="Session progress" />);
    const bar = screen.getByRole("progressbar", { name: "Session progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("3");
    expect(bar.getAttribute("aria-valuemax")).toBe("12");
  });
});

describe("Callout", () => {
  it("renders the tone class and its body", () => {
    render(<Callout tone="info">A tip</Callout>);
    expect(screen.getByText("A tip").parentElement?.className).toContain("pl-callout--info");
  });
});

describe("EmptyState", () => {
  it("renders the heading and an optional action", () => {
    render(
      <EmptyState heading="Nothing due" action={<Button>Start</Button>}>
        You are all caught up
      </EmptyState>,
    );
    expect(screen.getByRole("heading", { name: "Nothing due" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Start" })).not.toBeNull();
  });

  it("renders an illustration when given one", () => {
    render(<EmptyState heading="Nothing due" illustration={<img alt="Coco" src="/coco.svg" />} />);
    expect(screen.getByRole("img", { name: "Coco" })).not.toBeNull();
  });
});

describe("Glyph", () => {
  it("renders each named glyph, hidden from assistive tech", () => {
    const { container } = render(
      <div>
        <Glyph name="check" />
        <Glyph name="cross" />
        <Glyph name="info" />
        <Glyph name="star" />
      </div>,
    );
    const svgs = container.querySelectorAll("svg[aria-hidden]");
    expect(svgs).toHaveLength(4);
  });
});
