import { describe, expect, it } from "vitest";

import { EXAMPLES_ID, READ_NEXT_ID, contentsOf, sectionId } from "./contents";

describe("an article's contents (D256)", () => {
  it("lists each section in order, then the examples, then Read next", () => {
    expect(contentsOf({ sections: ["a", "b"], related: ["pronouns"] })).toEqual([
      { kind: "section", index: 0, id: "section-1" },
      { kind: "section", index: 1, id: "section-2" },
      { kind: "examples", id: EXAMPLES_ID },
      { kind: "read-next", id: READ_NEXT_ID },
    ]);
  });

  it("leaves out Read next when the article relates to nothing, or has an empty list", () => {
    expect(contentsOf({ sections: ["a"] }).map((entry) => entry.kind)).toEqual(["section", "examples"]);
    expect(contentsOf({ sections: ["a"], related: [] }).map((entry) => entry.kind)).toEqual(["section", "examples"]);
  });

  it("gives a section the same id the page puts on its heading", () => {
    expect(sectionId(0)).toBe("section-1");
    expect(sectionId(2)).toBe("section-3");
  });
});
