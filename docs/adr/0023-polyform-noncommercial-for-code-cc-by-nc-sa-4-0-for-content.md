# ADR 23: PolyForm Noncommercial for code, CC BY-NC-SA 4.0 for content

**Status:** Accepted
**Date:** 2026-09-29
**Supersedes:** ADR 12

## Context

ADR 12 put the code under MIT and the content under CC BY 4.0, for "maximum reuse including by a department that wants to fork". Both licences allow commercial use, so anyone could take the app or the item bank and sell it as their own product.

Before the repository goes public, its owner has decided that **Palier must not be used commercially**: nobody may build a paid product or service on it. This is a new product requirement, not the evidence ADR 12 asked for. ADR 12's *revisit when* reads: "A source licence turns out to be incompatible with CC BY, in which case that passage is rewritten rather than the licence changed." That has not happened, and that clause would not justify the change on its own. The owner's requirement does. It also changes R13, which said "free to use and open source". A licence that forbids commercial use is not open source under the OSI definition, so R13 now reads "free to use, and its source publicly available under a non-commercial licence".

Three facts made this cheap to decide now. The repository is still private. Every commit in its history has one author, so no MIT grant has gone out and no contributor has to consent. And ten passages in the committed bank are derived from Canada.ca sources whose terms allow only non-commercial reproduction (`canada.ca-non-commercial`). Those sat awkwardly under CC BY and fit a non-commercial content licence cleanly.

## Decision

- **Code: PolyForm Noncommercial License 1.0.0** (SPDX `PolyForm-Noncommercial-1.0.0`), verbatim in `LICENSE` with a `Required Notice:` copyright line. It was written for software, so unlike Creative Commons licences it carries a patent grant. It permits any non-commercial purpose and names personal study, educational institutions, charities and government institutions as permitted users.
- **Content: CC BY-NC-SA 4.0**, verbatim in `LICENSE-CONTENT`. It keeps CC BY's attribution, so the contributor handle stays load-bearing (D152). It adds NonCommercial, and ShareAlike so that an adapted bank cannot be relicensed on looser terms. Derived passages still also carry their source's terms, recorded per passage in `source.licence`.
- **Contributions are inbound = outbound.** A contributor licenses code and content on the same terms the project publishes them under (`CONTRIBUTING.md`, the PR template). There is no CLA and no grant letting the maintainer relicense.
- **Wording:** Palier is described as **free and source-available**, not open source, in the README, the docs and the app's copy in both languages.

## Consequences

Positive: the owner's requirement is enforceable with standard, well-drafted texts rather than a bespoke clause. The PSC, a department, a school or an individual public servant can still use, fork and run their own copy, because PolyForm names government institutions and educational institutions as permitted. The Canada.ca non-commercial sources now sit under a compatible content licence.

Negative: Palier is no longer open source in the OSI sense. Some contributors and package directories treat that as a reason not to take part, and GitHub will label the licence "Other". "Commercial" is judged case by case, and a grey area remains, for example a paid tutor using it with a client. Inbound = outbound means the maintainer cannot later offer a commercial licence to contributed work without each contributor's consent. Dependencies keep their own licences (mostly MIT), which permit this use.

## Revisit when

The owner wants to allow some commercial use, such as a paid commercial licence alongside this one, or a switch to an OSI licence like AGPL-3.0. That would need a new ADR, and for any contribution merged under this record, that contributor's consent or the removal of their work.
