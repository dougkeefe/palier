import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BandMeter } from "./BandMeter.js";
import { Button } from "./Button.js";
import { Card } from "./Card.js";
import { Callout } from "./Callout.js";
import { EmptyState } from "./EmptyState.js";
import { Glyph } from "./Glyph.js";
import { OptionRow } from "./OptionRow.js";
import { Passage } from "./Passage.js";
import { ProgressRail } from "./ProgressRail.js";
import { Sheet } from "./Sheet.js";

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

describe("BandMeter", () => {
  it("exposes the estimate as a meter whose value text states the interval", () => {
    render(
      <BandMeter
        label="C-level items"
        valueText="52% correct, likely 40–64%"
        estimate={{ accuracy: 0.52, low: 0.4, high: 0.64 }}
      />,
    );
    const meter = screen.getByRole("meter", { name: "C-level items" });
    expect(meter.getAttribute("aria-valuenow")).toBe("52");
    expect(meter.getAttribute("aria-valuetext")).toBe("52% correct, likely 40–64%");
  });

  it("draws no bar at all while the evidence is insufficient, only the text (R10)", () => {
    render(<BandMeter label="B-level items" valueText="8 more answers needed" estimate={null} />);
    expect(screen.queryByRole("meter")).toBeNull();
    expect(screen.getByText("8 more answers needed")).toBeTruthy();
  });
});

describe("Sheet", () => {
  it("is a region named by its heading, which can take focus", () => {
    render(
      <Sheet tone="incorrect" heading="Not quite">
        Why
      </Sheet>,
    );
    const region = screen.getByRole("region", { name: "Not quite" });
    expect(region.className).toContain("pl-sheet--incorrect");
    expect(screen.getByRole("heading", { name: "Not quite" }).getAttribute("tabindex")).toBe("-1");
  });

  it("renders its action when given one, and a glyph only for a toned sheet", () => {
    const { container } = render(
      <Sheet tone="neutral" heading="Done" action={<button type="button">Next</button>}>
        Body
      </Sheet>,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeTruthy();
    expect(container.querySelector(".pl-sheet__glyph")).toBeNull();
  });
});

describe("Passage", () => {
  it("is a labelled region in the passage's language, one paragraph per blank-line block", () => {
    render(<Passage title="Note" body={"Premier.\n\nDeuxième.\n\n\n"} lang="fr" label="Reading passage" />);
    const region = screen.getByRole("region", { name: "Reading passage" });
    expect(region.getAttribute("lang")).toBe("fr");
    expect(region.querySelectorAll("p")).toHaveLength(2);
  });
});
