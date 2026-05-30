# Harvest comments on Linear (owner + hub)

**Purpose:** Linear is the **durable agent-readable record** for each reconciled harvest **candidate** (extracted pattern from a source batch). A future agent implementing SPE-#### must understand **what the mechanic is**, **why this owner**, **what changes vs what is forbidden**, and **why it is a fold-in vs a new child** — without re-reading the source packet or guessing from a one-line note.

**When:** Same session as candidate adjudication, before the batch mirror PR lands. See `planning/harvest-reconciliation-index.md` and **`docs/harvest-candidate-triage-agent.md`**.

**Mirror doc:** `planning/<batch-id>-harvest.md` holds the full candidate table (owners authoritative). Linear comments must be **at least as informative** as the mirror **Mechanic / note** column — typically **more** detail on acceptance and boundaries.

**Not a substitute for:** A **new child issue** when the candidate is a bounded shippable slice (own branch, tests, slice doc). Fold-ins clarify owners; child issues **own** delivery.

---

## What you are posting (candidates)

Each **C##** is one **pattern-level mechanic** abstracted from an external source (walkthrough, PDF, transcript, manual). Post enough on Linear that an agent never needs the source document to understand the intended simulation/design behavior in Containment Protocol terms.

---

## Required content (every owner comment)

Use **all six sections**. If a section is N/A, say so explicitly. **Do not** collapse the mechanic into a single sentence.

| # | Section | What to include |
| --- | --- | --- |
| 1 | **Candidate & source** | `C##`, batch id, source type (e.g. mission-hub walkthrough metadata). One sentence on what pattern was extracted (not franchise names). |
| 2 | **Mechanic (agent-readable)** | **What it is and how it behaves** in CP terms: triggers, state, player-facing effect, persistence, ties to weekly loop / site / hub / case as applicable. Bullets OK. This is the core payload — not optional. |
| 3 | **Repo / subsystem anchor** | Files, modules, audits, or existing SPE scope that already touch this behavior; what exists vs net-new. |
| 4 | **Ownership & reconciliation** | Primary **SPE-####** (link) and co-owners; **why** this owner (not another). Dedup / no-op reference if applicable. |
| 5 | **Boundary** | **In scope for this owner when it ships:** concrete acceptance deltas (state shape, resolver rule, UI surface, test). **Out of scope:** franchise import, prose, other owners’ subsystems, whole batch mandate. |
| 6 | **Disposition & issue decision** | **Fold-in** / **new child SPE-####** / **no implementation change** — with **one paragraph of reasoning** using the decision tests below. |

---

## Fold-in vs new child (same-boundary test)

Use this when the candidate “feels like” the same theme as an existing issue.

| Prefer **fold-in** on owner | Prefer **new child** under owner (or SPE-2110) |
| --- | --- |
| Extends the **same implementation boundary** as the owner: same module(s), same acceptance envelope, would land in the **same future PR slice** as other work on that issue | **Distinct Definition of Done**: own branch, tests, and `planning/*-slice.md` without blocking the parent |
| Adds acceptance detail or guardrails to behavior the owner **already owns** | Would **bloat** the parent Goal or mix unrelated deliverables on one issue |
| No new top-level subsystem or registry file; fits files the owner already names | Needs a **new domain file**, registry, or cross-cutting contract not on the owner |
| Co-owners are **consulted** via links in the comment, not separate delivery owners | **3+ owners** with equal delivery responsibility — create a coordinator **child** and link fold-ins |
| `contradiction_check` / `no_op` — disposition **no implementation change** or **doc note only** | Harvest row verdict **`new child`** in `*-harvest.md` |

**Shared-boundary rule:** If two candidates would be implemented in the **same module and same acceptance tests** without inventing a new subsystem, they belong on the **same owner** (fold-in or one child), not split across duplicate issues. If they need **separate PRs** with separate merge criteria, use a **new child** (or separate children), even if themes overlap.

**When unsure:** Default to **new child** if delivery is bounded and testable in isolation; default to **fold-in** if the comment only clarifies how an existing backlog item should behave when eventually built.

---

## Disposition labels

| Disposition | Meaning |
| --- | --- |
| **No implementation change** | `no_op`, dedup, or `contradiction_check` — traceability; owner backlog unchanged. Still write **Mechanic** and **Boundary** so agents know why. |
| **Doc note only** | Planning/audit update when owner ships; no code until owner slice starts. |
| **Fold-in** | Owner issue unchanged in title/Goal; this comment is the spec supplement. |
| **Child issue** | Create (or link) SPE-#### with slice doc; parent stays Backlog until child ships; fold-in comment links child. |

---

## Comment template (paste into Linear)

```markdown
**Harvest** — `<batch-id>` · **C##** · `<short mechanic title>`

### 1. Candidate & source
- **ID:** C##
- **Batch:** `<batch-id>` — <source type in plain language>
- **Extracted pattern:** <what was abstracted from the source, pattern-only>

### 2. Mechanic (agent-readable)
- <what happens in the sim / authoring model>
- <state, triggers, persistence, failure modes>
- <relation to hub / site / case / week if relevant>

### 3. Repo / subsystem anchor
- **Existing:** <files, modules, prior harvest, partial implementation>
- **Net-new when owner ships:** <what does not exist yet>

### 4. Ownership & reconciliation
- **Primary:** [SPE-####](url) — <why this owner>
- **Co-owners:** [SPE-####](url) — <role: consult / shared state / guardrails only>
- **Dedup / no-op:** <prior batch C## or repo behavior already covers X, or "none">

### 5. Boundary
**In scope (when owner ships):**
- <concrete acceptance bullets>

**Out of scope:**
- <bullets — franchise, other SPE subsystems, full batch, etc.>

### 6. Disposition & issue decision
- **Disposition:** <fold-in | doc note only | no implementation change | child [SPE-####](url)>
- **Reasoning:** <why fold-in vs child vs no-op — shared-boundary test applied>

**Traceability:** `planning/<batch-id>-harvest.md` (row C##)
```

### Grouping

Group **only** when multiple **C##** share the **same owner**, **same disposition**, and **same acceptance envelope**. Inside one comment, give **each C##** its own **Mechanic** subsection — do not list IDs without behavior.

---

## Mirror doc `Note` column (planning)

The harvest table **Note** column is not a one-liner. Minimum per row:

- **Mechanic summary** (2–4 sentences, same substance as Linear §2, can be shorter).
- **Verdict** implied by wording (fold-in / no-op / contradiction).
- Pointer: “Linear: fold-in posted YYYY-MM-DD” or “child SPE-####”.

Linear comments should **match or exceed** this depth.

---

## Anti-patterns

- One-line notes on Linear or in the mirror table (“stress-dream motif” only).
- Fold-in with **boundary** but no **mechanic** — agents cannot implement or prioritize.
- Choosing **fold-in** because the theme sounds similar when delivery needs a **separate child** (shared-boundary test failed).
- Choosing **new child** for every row to avoid writing mechanics on the parent.
- Restating the owner issue **Goal** as if the harvest replaces product direction.
- Implying priority (“do next”) — queue lives in `planning/backlog.md`.

**Good tension:** Long **mechanic** sections are required; long **theme marketing** paragraphs without acceptance deltas are not.

---

## Good example (fold-in, rich mechanic)

```markdown
**Harvest** — `osr-site-exploration-metadata-165` · **C2** · Per-action turn costs on site clock

### 1. Candidate & source
- **ID:** C2
- **Batch:** `osr-site-exploration-metadata-165` — OSR site exploration pattern library (metadata)
- **Extracted pattern:** Each exploration action spends a bounded number of site-turn ticks before effects resolve.

### 2. Mechanic (agent-readable)
- Site exploration runs on a **site turn clock** distinct from weekly `advanceWeek`.
- Each `actionId` (search, breach, rest, etc.) declares a **turn cost**; spending reduces remaining site turns for the visit.
- Invalid or unknown `actionId` is rejected in pure logic (no silent zero-cost actions).
- Does not by itself add encounters, loot tables, or UI — only the cost table contract.

### 3. Repo / subsystem anchor
- **Existing:** `exploration` helpers (SPE-2260 landed C1–C2 partial), SPE-371, SPE-562 turn advance.
- **Net-new when owner ships:** Full cost table coverage for all action ids in scope of SPE-1610 slice 2+.

### 4. Ownership & reconciliation
- **Primary:** [SPE-371](…) — site exploration action economy
- **Co-owners:** [SPE-562](…) — turn advance integration
- **Dedup:** none (C1 partial land only)

### 5. Boundary
**In scope (when owner ships):**
- Authoring-time or data-driven `actionId → turnCost` map; validator rejects unknown ids.

**Out of scope:**
- Trap adaptation (C13), encounter tables (C18–C21), action picker UI, weekly campaign integration.

### 6. Disposition & issue decision
- **Disposition:** fold-in (doc note until SPE-1610 exploration slice 2+)
- **Reasoning:** Same module and PR slice as SPE-371 exploration clock work; no separate DoD or new registry — extends existing owner boundary (shared-boundary test → fold-in).

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md` (C2)
```

---

## Hub intake (SPE-2110)

Batch closure on SPE-2110: counts, batch id, mirror path, owner list, **child issues created**. Do **not** paste the full candidate table on the hub — per-owner comments carry row-level detail.
