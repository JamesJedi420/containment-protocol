**Harvest retrofit (rich)** — `pulp-expedition-adventure-metadata-40` → **SPE-42** (part 1/1)
_Automated retrofit from `planning/pulp-expedition-adventure-metadata-40-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occult-supplement-metadata-51` (museum opener, cross-era), `facility-crisis-triage-metadata-55` (port sites), `covert-trust-intrigue-metadata-80` (networks).
- **Repo at triage:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Candidates on SPE-42:** C9
---

#### C9 — Teamwork bold-action resolver

**1. Candidate & source**
- **ID:** C9
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Teamwork bold-action resolver
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Teamwork bold-action resolver

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-42
- **Co-owners:** SPE-1025

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-42 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C9)
