# Harvest fold-in comments on Linear

**Purpose:** Fold-in comments on owner issues are **implementation-boundary clarification**, not a backlog dump or scope accretion. They tell the owner issue what may change later — without rewriting the issue goal or implying the harvest batch is a mandate to implement everything named.

**When:** Same session as candidate adjudication, before the batch mirror PR lands. See `planning/harvest-reconciliation-index.md`.

**Not a substitute for:** `planning/<batch-id>-harvest.md` (full candidate table), SPE-2110 intake summary, or a child slice issue when work is bounded and shippable on its own.

---

## Required content (every fold-in comment)

Answer all four. If a section is empty, say so explicitly (e.g. **Out of scope:** entire candidate — doc traceability only).

| # | Question | Answer in one or two sentences |
| --- | --- | --- |
| 1 | **What existing issue owns this?** | Link **SPE-####** and name the subsystem (file/module doc if known). Confirm this candidate extends that owner — not a new theme. |
| 2 | **What exact behavior or acceptance detail changes?** | One concrete delta: state shape, UI surface, resolver rule, or acceptance test — not a topic list. Use “may add” / “when implementing X” — not “implement X now”. |
| 3 | **What is explicitly out of scope?** | Franchise import, player-facing copy from source, full subsystem builds, duplicate work owned elsewhere, or “entire harvest batch”. |
| 4 | **Disposition** | **Child issue** / **doc note only** / **no implementation change** (no-op or contradiction already handled on hub). |

---

## Fold-in vs new child issue

| Use **fold-in** on owner | Use **new child issue** under owner (or SPE-2110) |
| --- | --- |
| Clarifies or tightens acceptance on an existing backlog item | Bounded slice with its own branch, tests, and PR |
| No new subsystem; fits one module the owner already names | Cross-cuts 3+ owners or needs a new domain file |
| “When you implement SPE-NNN, also consider …” | “Ship X in isolation” (even if small) |
| Contradiction/guardrail only (disposition: doc note / no code) | Harvest row marked **new child** in `*-harvest.md` |

**Default:** fold-in = **note on the owner**, not expansion of the owner’s Goal paragraph. Do not paste harvest candidate lists without mapping to the four questions.

---

## Disposition guide

| Disposition | Meaning |
| --- | --- |
| **No implementation change** | `no_op`, dedup, or `contradiction_check` — traceability only; owner unchanged. |
| **Doc note only** | Update planning audit, architecture stub, or acceptance notes when owner ships — no code until owner slice starts. |
| **Child issue** | Create (or reference) SPE-#### child with slice doc; link in fold-in comment; parent stays in Backlog until slice ships. |

---

## Comment template (paste into Linear)

```markdown
**Harvest fold-in** — `<batch-id>` · **C##** (and supplements if grouped)

**1. Owner:** [SPE-####](url) — <subsystem one line>

**2. Behavior / acceptance delta (when owner ships):**
- <single concrete delta>

**3. Out of scope:**
- <bullets>

**4. Disposition:** <no implementation change | doc note only | child SPE-####>

**Traceability:** `planning/<batch-id>-harvest.md`
```

Group candidates only when they share the **same** disposition and **same** acceptance delta. Otherwise one comment per owner per disposition cluster — not one comment per batch per owner listing every C id.

---

## Anti-patterns (scope accretion)

- Long theme paragraphs (“surfaces include …, themes include …”) with no acceptance delta.
- Restating the Linear issue **Goal** as if the harvest adds new goals.
- Listing many candidate IDs without saying what changes on **this** issue.
- “Fold-in” on 20+ owners with identical boilerplate.
- Implying priority or sequencing (“do this next”, “high leverage”) — use `planning/backlog.md` for queue order.

---

## Good example (boundary clarification)

```markdown
**Harvest fold-in** — `osr-site-exploration-metadata-165` · **C2**

**1. Owner:** SPE-371 — exploration action cost table on site turn clock (with SPE-562 turn advance).

**2. Behavior / acceptance delta (when owner ships):**
- Author per-action turn costs keyed by `actionId`; invalid ids rejected in pure helper (already partially landed SPE-2260 for C1–C2 only).

**3. Out of scope:**
- Trap adaptation (C13), encounter tables (C18–C21), UI for action picker, weekly `advanceWeek` integration.

**4. Disposition:** doc note only until SPE-1610 exploration slice 2+; no new child.

**Traceability:** `planning/osr-site-exploration-metadata-165-harvest.md`
```

---

## Hub intake (SPE-2110)

Batch closure comment on SPE-2110 stays a **summary** (counts, batch id, mirror path). Per-owner fold-ins use this contract — do not duplicate the full candidate table on the hub.
