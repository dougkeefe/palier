import { describe, expect, it } from "vitest";

import { FILTER_IDS, filterFromHash, filterOptions, hashFor, matches, tagsOf } from "./filter";

describe("the library index's filter (D257)", () => {
  it("orders the pills everything, the skills, then the topics", () => {
    expect(FILTER_IDS).toEqual(["all", "reading", "writing", "comprehension", "vocabulary", "grammar", "structure", "register"]);
  });

  it("tags an article with its skill and its topic", () => {
    expect(tagsOf("writing", "grammar")).toEqual(["writing", "grammar"]);
  });

  it("shows every article for everything, and only the tagged ones for a skill or a topic", () => {
    const tags = tagsOf("reading", "vocabulary");
    expect(matches(tags, "all")).toBe(true);
    expect(matches(tags, "reading")).toBe(true);
    expect(matches(tags, "vocabulary")).toBe(true);
    expect(matches(tags, "writing")).toBe(false);
    expect(matches(tags, "grammar")).toBe(false);
  });

  it("reads a pill from the hash, and everything from an empty or unknown one", () => {
    expect(filterFromHash("#grammar")).toBe("grammar");
    expect(filterFromHash("writing")).toBe("writing");
    expect(filterFromHash("")).toBe("all");
    expect(filterFromHash("#")).toBe("all");
    expect(filterFromHash("#library-writing")).toBe("all");
  });

  it("writes no hash for everything, and the pill's for any other", () => {
    expect(hashFor("all")).toBe("");
    expect(hashFor("register")).toBe("#register");
    for (const id of FILTER_IDS) expect(filterFromHash(hashFor(id))).toBe(id);
  });

  it("counts each pill's articles, and leaves out a pill that would show none", () => {
    const articles = [tagsOf("reading", "comprehension"), tagsOf("reading", "vocabulary"), tagsOf("writing", "vocabulary")];
    expect(filterOptions(articles)).toEqual([
      { id: "all", count: 3 },
      { id: "reading", count: 2 },
      { id: "writing", count: 1 },
      { id: "comprehension", count: 1 },
      { id: "vocabulary", count: 2 },
    ]);
  });
});
