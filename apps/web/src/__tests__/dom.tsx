import { configure, type RenderResult, render } from "@testing-library/react";
import type { ReactNode } from "react";

import { ContainerProvider } from "../components/ContainerProvider";
import { type Locale, provided } from "./render";

// An island waits for the container module's lazy import and the hermetic graph, which under the full suite's parallel
// load takes longer than Testing Library's one-second default. A test still fails at once on a wrong assertion.
configure({ asyncUtilTimeout: 10_000 });

/**
 * Renders an island into jsdom for its unit test (progress.md D268): through the real messages and the real
 * `ContainerProvider` over the hermetic graph, the in-memory ports and the fixture bank, so its effects run and its
 * loaded state is the one under test. A test file opts in with `// @vitest-environment jsdom`, and still mocks
 * `src/i18n/navigation` with `render.tsx`'s `fakeNavigation`, since next-intl's needs Next's router. Not a test file;
 * `__tests__` keeps it out of the coverage.
 */
export const renderIsland = (node: ReactNode, locale: Locale = "en"): RenderResult =>
  render(provided(<ContainerProvider hermetic>{node}</ContainerProvider>, locale));

/** Every element on the page whose id names a settings section, in document order (D266). */
export const sectionIds = (root: ParentNode = document): string[] =>
  [...root.querySelectorAll('[id^="settings-"]')].map((element) => element.id);

/** The fragment each "On this page" link leads to, in order, without its `#`. */
export const sectionLinks = (nav: HTMLElement): string[] =>
  [...nav.querySelectorAll("a")].map((link) => link.getAttribute("href")?.slice(1) ?? "");
