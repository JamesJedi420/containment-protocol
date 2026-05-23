**Harvest retrofit (rich)** — `pulp-expedition-adventure-metadata-40` → **SPE-1443** (part 1/1)
_Automated retrofit from `planning/pulp-expedition-adventure-metadata-40-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occult-supplement-metadata-51` (museum opener, cross-era), `facility-crisis-triage-metadata-55` (port sites), `covert-trust-intrigue-metadata-80` (networks).
- **Repo at triage:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Candidates on SPE-1443:** C17, C19, C35
---

#### C17 — Quick field-cell template for one-shots

**1. Candidate & source**
- **ID:** C17
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Quick field-cell template for one-shots
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Quick field-cell template for one-shots

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1443
- **Co-owners:** SPE-16

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1443 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C17)

---

#### C19 — Career-tag capability and access

**1. Candidate & source**
- **ID:** C19
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Career-tag capability and access
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Career-tag capability and access

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1443
- **Co-owners:** SPE-158

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-1443 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C19)

---

#### C35 — Careers change access/failure — not flavor

**1. Candidate & source**
- **ID:** C35
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Careers change access/failure — not flavor
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Careers change access/failure — not flavor

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-1443
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-1443

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C35)
