import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Item } from "@palier/domain";
import { itemId } from "@palier/domain";

import { McqItem } from "./McqItem.js";
import { itemRenderers } from "./renderers.js";

afterEach(cleanup);

const statusLabels = { correct: "Correct", incorrect: "Incorrect" } as const;

const anItem = (over: Partial<Item> = {}): Item => ({
  id: itemId("01HITEM00000000000000001"),
  version: 1,
  skill: "reading",
  lang: "fr",
  type: "comprehension",
  passageId: undefined,
  stem: { en: "What is the main point?", fr: "Quel est le point principal ?" },
  options: [
    { id: "a", text: "Réponse A", rationale: { en: "Right.", fr: "Correct." } },
    { id: "b", text: "Réponse B", rationale: { en: "Wrong.", fr: "Faux." } },
    { id: "c", text: "Réponse C", rationale: { en: "Wrong.", fr: "Faux." } },
    { id: "d", text: "Réponse D", rationale: { en: "Wrong.", fr: "Faux." } },
  ],
  key: "a",
  explanation: { en: "Stated directly.", fr: "Indiqué directement." },
  subSkill: "main-idea",
  targetBand: "B",
  topic: "service-delivery",
  tags: [],
  provenance: { origin: "generated" },
  status: "published",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

describe("McqItem", () => {
  it("renders four radios in a radiogroup the question stem names", () => {
    render(<McqItem item={anItem()} selected={null} onSelect={() => {}} statusLabels={statusLabels} />);
    expect(screen.getByRole("radiogroup", { name: /Quel est le point principal/ })).not.toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("marks the item's content with its own language for a screen reader", () => {
    render(<McqItem item={anItem()} selected={null} onSelect={() => {}} statusLabels={statusLabels} />);
    expect(screen.getByText("Quel est le point principal ?").getAttribute("lang")).toBe("fr");
    expect(screen.getByText("Réponse A").getAttribute("lang")).toBe("fr");
  });

  it("calls onSelect with the chosen option id", () => {
    const onSelect = vi.fn();
    render(<McqItem item={anItem()} selected={null} onSelect={onSelect} statusLabels={statusLabels} />);
    fireEvent.click(screen.getAllByRole("radio")[1]!);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("starts the roving tab target on the first option", () => {
    render(<McqItem item={anItem()} selected={null} onSelect={() => {}} statusLabels={statusLabels} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[0]!.getAttribute("tabindex")).toBe("0");
    expect(radios[1]!.getAttribute("tabindex")).toBe("-1");
  });

  it("moves the roving tab target with the down arrow", () => {
    render(<McqItem item={anItem()} selected={null} onSelect={() => {}} statusLabels={statusLabels} />);
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowDown" });
    const radios = screen.getAllByRole("radio");
    expect(radios[0]!.getAttribute("tabindex")).toBe("-1");
    expect(radios[1]!.getAttribute("tabindex")).toBe("0");
  });

  it("opens the roving target on the selected option when one is chosen", () => {
    render(<McqItem item={anItem()} selected="c" onSelect={() => {}} statusLabels={statusLabels} />);
    const radios = screen.getAllByRole("radio");
    expect(radios[2]!.getAttribute("tabindex")).toBe("0");
  });

  it("reveals the key as correct and a wrong pick as incorrect, each with a text label", () => {
    render(
      <McqItem item={anItem({ key: "a" })} selected="b" onSelect={() => {}} revealed statusLabels={statusLabels} />,
    );
    const radios = screen.getAllByRole("radio");
    expect(radios[0]!.className).toContain("pl-option--correct");
    expect(radios[1]!.className).toContain("pl-option--incorrect");
    expect(screen.getByText("Correct")).not.toBeNull();
    expect(screen.getByText("Incorrect")).not.toBeNull();
  });

  it("locks the options once the answer is revealed", () => {
    render(<McqItem item={anItem()} selected="a" onSelect={() => {}} revealed statusLabels={statusLabels} />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.hasAttribute("disabled")).toBe(true);
    }
  });
});

describe("itemRenderers", () => {
  it("registers a renderer for every item type", () => {
    expect(Object.keys(itemRenderers).sort()).toEqual([
      "best-completion",
      "cloze",
      "comprehension",
      "error-id",
    ]);
  });

  it("shares the multiple-choice renderer across the current types", () => {
    for (const renderer of Object.values(itemRenderers)) {
      expect(renderer).toBe(McqItem);
    }
  });
});
