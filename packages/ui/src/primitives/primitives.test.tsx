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
import { Mascot } from "./Mascot.js";
import { StreakFlame } from "./StreakFlame.js";
import { Toast } from "./Toast.js";
import { TrendChart } from "./TrendChart.js";
import { Timer } from "./Timer.js";
import { Dialog } from "./Dialog.js";
import { VoiceForm } from "./VoiceForm.js";

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

  it("draws the arrow disc by class, so the label alone names the button", () => {
    render(<Button arrow="next">Continue</Button>);
    const button = screen.getByRole("button", { name: "Continue" });
    expect(button.className).toBe("pl-btn pl-btn--primary pl-btn--arrow");
    expect(button.textContent).toBe("Continue");
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

  it("carries its tone as a modifier", () => {
    const { container } = render(<Card tone="deep">Body</Card>);
    expect(container.firstElementChild?.className).toBe("pl-card pl-card--deep");
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
        <Glyph name="clock" />
        <Glyph name="flag" />
      </div>,
    );
    const svgs = container.querySelectorAll("svg[aria-hidden]");
    expect(svgs).toHaveLength(6);
  });
});

describe("TrendChart", () => {
  const P = { accuracy: 0.5, low: 0.4, high: 0.6 };

  it("is hidden from assistive technology, since a table beside it carries the figures", () => {
    const { container } = render(<TrendChart points={[P, P]} startLabel="13 Jul" endLabel="3 Oct" />);
    const chart = container.querySelector(".pl-trend-chart");
    expect(chart?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector("svg")?.getAttribute("focusable")).toBe("false");
  });

  it("draws a line and a shaded interval per run, a dot per week, and the first and last week's names", () => {
    const { container } = render(<TrendChart points={[P, P, null, P]} startLabel="13 Jul" endLabel="3 Oct" />);
    expect(container.querySelectorAll("polyline")).toHaveLength(2);
    expect(container.querySelectorAll("polygon")).toHaveLength(2);
    expect(container.querySelectorAll("circle")).toHaveLength(3);
    expect(container.querySelectorAll("line")).toHaveLength(3);
    expect(container.textContent).toBe("13 Jul3 Oct");
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

describe("Toast", () => {
  it("is a polite status message carrying its tone", () => {
    render(<Toast tone="correct">Imported</Toast>);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.className).toContain("pl-callout--correct");
    expect(status.textContent).toContain("Imported");
  });
});

describe("Mascot", () => {
  it("is decorative, hidden from assistive technology", () => {
    const { container } = render(<Mascot />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("sleeps by default, and cheers with its wings up and the celebration class when asked", () => {
    const asleep = render(<Mascot />).container.querySelector("svg");
    const cheer = render(<Mascot pose="cheer" />).container.querySelector("svg");
    expect(asleep?.getAttribute("class")).toBe("pl-mascot");
    expect(cheer?.getAttribute("class")).toBe("pl-mascot pl-celebrate");
    expect(cheer?.querySelectorAll("path").length).not.toBe(asleep?.querySelectorAll("path").length);
    // No style attribute anywhere: the strict CSP would refuse it.
    expect(cheer?.querySelector("[style]")).toBeNull();
  });
});

describe("StreakFlame", () => {
  it("is decorative, lit in the accent when today is done and an outline when not", () => {
    const lit = render(<StreakFlame lit />).container.querySelector("svg");
    const unlit = render(<StreakFlame lit={false} />).container.querySelector("svg");
    expect(lit?.getAttribute("aria-hidden")).toBe("true");
    expect(lit?.getAttribute("class")).toContain("pl-streak-flame--lit");
    expect(lit?.querySelector("path")?.getAttribute("fill")).toBe("var(--accent)");
    expect(unlit?.getAttribute("class")).toBe("pl-streak-flame");
    expect(unlit?.querySelector("path")?.getAttribute("fill")).toBe("none");
  });
});

describe("Timer", () => {
  it("shows the time in a labelled group, announcing only the caller's once-a-minute line", () => {
    render(<Timer label="Time left" text="42:07" tone="normal" announcement="42 minutes left" />);
    const group = screen.getByRole("group", { name: "Time left" });
    expect(group?.textContent).toContain("42:07");
    expect(group.querySelector("[aria-live='polite']")?.textContent).toContain("42 minutes left");
    expect(group.querySelector("svg")).toBeNull();
  });

  it("gives a low-time clock a glyph and words as well as its colour class", () => {
    render(<Timer label="Time left" text="1:59" tone="urgent" toneLabel="Under 2 minutes" announcement="1 minute left" />);
    const group = screen.getByRole("group", { name: "Time left" });
    expect(group?.classList.contains("pl-timer--urgent")).toBe(true);
    expect(group?.textContent).toContain("Under 2 minutes");
    expect(group.querySelector("svg[aria-hidden]")).not.toBeNull();
  });
});

describe("Dialog", () => {
  // jsdom has no modal dialogs, so stand in for the two methods the component calls.
  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
  HTMLDialogElement.prototype.showModal = showModal;
  HTMLDialogElement.prototype.close = close;

  afterEach(() => {
    showModal.mockClear();
    close.mockClear();
  });

  it("opens modally when open, labelled by its heading, with its actions after its body", () => {
    render(
      <Dialog open onClose={() => undefined} heading="Submit the exam?" actions={<button type="button">Submit</button>}>
        <p>3 unanswered</p>
      </Dialog>,
    );
    expect(showModal).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole("dialog", { name: "Submit the exam?" });
    expect(dialog?.classList.contains("pl-dialog--center")).toBe(true);
    expect(dialog.querySelector(".pl-dialog__actions")?.textContent).toContain("Submit");
  });

  it("stays closed when not open, and places a drawer at the side", () => {
    const { container } = render(
      <Dialog open={false} onClose={() => undefined} heading="Items" placement="side">
        <p>list</p>
      </Dialog>,
    );
    expect(showModal).not.toHaveBeenCalled();
    expect(container.querySelector("dialog")?.classList.contains("pl-dialog--side")).toBe(true);
    expect(container.querySelector(".pl-dialog__actions")).toBeNull();
  });

  it("closes when the caller closes it, reports the close, and gives focus back to the opener", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const { rerender } = render(
      <Dialog open onClose={onClose} heading="Items">
        <p>list</p>
      </Dialog>,
    );
    (document.querySelector("dialog button") as HTMLElement | null)?.focus();
    rerender(
      <Dialog open={false} onClose={onClose} heading="Items">
        <p>list</p>
      </Dialog>,
    );

    expect(close).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("gives focus back as soon as the caller closes it, without waiting for the close event", () => {
    // A browser fires "close" a task later; stand in for one that has not fired yet.
    close.mockImplementationOnce(function (this: HTMLDialogElement) {
      this.removeAttribute("open");
    });
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const { rerender } = render(
      <Dialog open onClose={() => undefined} heading="Items">
        <button type="button">inside</button>
      </Dialog>,
    );
    (document.querySelector("dialog button") as HTMLElement | null)?.focus();
    rerender(
      <Dialog open={false} onClose={() => undefined} heading="Items">
        <button type="button">inside</button>
      </Dialog>,
    );

    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("gives focus back and reports it when the dialog closes itself, as on Escape", () => {
    const onClose = vi.fn();
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    render(
      <Dialog open onClose={onClose} heading="Items">
        <button type="button">inside</button>
      </Dialog>,
    );
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    (dialog.querySelector("button") as HTMLElement).focus();
    dialog.dispatchEvent(new Event("close"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe("VoiceForm (D184)", () => {
  it("is hidden from assistive technology, and scales each layer by its voice once a frame", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => frames.push(callback));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const levels = vi.fn(() => ({ examiner: 0.3, candidate: 0 }));
    const { container, unmount } = render(<VoiceForm levels={levels} still={false} />);
    const form = container.firstElementChild as HTMLElement;
    expect(form.getAttribute("aria-hidden")).toBe("true");

    frames.shift()?.(0);
    expect(levels).toHaveBeenCalledTimes(1);
    expect(Number(form.style.getPropertyValue("--pl-voice-examiner"))).toBeGreaterThan(1);
    expect(form.style.getPropertyValue("--pl-voice-candidate")).toBe("1");

    unmount();
    expect(cancelAnimationFrame).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("runs no loop and reads no level when still", () => {
    const request = vi.fn();
    vi.stubGlobal("requestAnimationFrame", request);
    const levels = vi.fn(() => ({ examiner: 1, candidate: 1 }));
    const { container } = render(<VoiceForm levels={levels} still />);

    expect(request).not.toHaveBeenCalled();
    expect(levels).not.toHaveBeenCalled();
    expect(container.firstElementChild?.className).toBe("pl-voice-form pl-voice-form--still");
    vi.unstubAllGlobals();
  });
});
