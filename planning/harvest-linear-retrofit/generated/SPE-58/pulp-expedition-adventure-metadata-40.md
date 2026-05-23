**Harvest retrofit (rich)** — `pulp-expedition-adventure-metadata-40` → **SPE-58** (part 1/1)
_Automated retrofit from `planning/pulp-expedition-adventure-metadata-40-harvest.md` using `docs/harvest-fold-in-linear-comments.md`. Supersedes thin one-line fold-ins for this batch/owner._
### Batch context
- **Source:** Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.
- **Dedup:** Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occult-supplement-metadata-51` (museum opener, cross-era), `facility-crisis-triage-metadata-55` (port sites), `covert-trust-intrigue-metadata-80` (networks).
- **Repo at triage:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Candidates on SPE-58:** C6, C12, C20, C22, C34, C38
---

#### C6 — Port/dock/warehouse site package

**1. Candidate & source**
- **ID:** C6
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Port/dock/warehouse site package
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Port/dock/warehouse site package

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C6)

---

#### C12 — Remote expedition-region dossier

**1. Candidate & source**
- **ID:** C12
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Remote expedition-region dossier
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Remote expedition-region dossier

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-2095

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C12)

---

#### C20 — Submerged-site hazard framework

**1. Candidate & source**
- **ID:** C20
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Submerged-site hazard framework
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Submerged-site hazard framework

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1429

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C20)

---

#### C22 — Global port-of-call map layer

**1. Candidate & source**
- **ID:** C22
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** fold_in

**2. Mechanic (agent-readable)**
- **Harvest summary:** Global port-of-call map layer
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Runtime behavior (when owner ships):** Add or extend pure simulation/authoring rules so the pattern is testable in the owning module(s) — persist state in canonical game state, surface only where the owner already plans UI/reporting.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Global port-of-call map layer

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-371

**5. Boundary**
**In scope (when owner ships):**
- Concrete acceptance delta on SPE-58 when that issue's slice is implemented
- Co-owner consultation only where another SPE owns shared state

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** fold-in
- **Reasoning:** Extends the same implementation boundary as this owner (module/acceptance envelope aligns with existing backlog). Shared-boundary test → fold-in when owner ships, not a separate theme issue.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C22)

---

#### C34 — Remote region affects logistics/authority — not scenery

**1. Candidate & source**
- **ID:** C34
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Remote region affects logistics/authority — not scenery
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Remote region affects logistics/authority — not scenery

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-58

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C34)

---

#### C38 — Era overlay + fallible map — not fixed truth

**1. Candidate & source**
- **ID:** C38
- **Batch:** `pulp-expedition-adventure-metadata-40`
- **Verdict:** contradiction_check

**2. Mechanic (agent-readable)**
- **Harvest summary:** Era overlay + fallible map — not fixed truth
- **Pattern context:** Abstracted from batch source (Partial Scribd index/snippets plus official product page metadata (**not** full 85/130-page extraction). Pulp expedition RPG patterns — **no** imported game title, engine name, adventure names, careers/boons/flaws text, South Seas tropes, or scenario prose.).
- **Repo anchor:** `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Policy behavior:** Enforce containment-protocol guardrails at authoring/intake time — fair previews, no franchise import, dignity/agency constraints where applicable.

**3. Repo / subsystem anchor**
- `teamComposition.ts` / `TEAM_COVERAGE_ROLES`; `missionIntakeRouting.ts`; `stealthLeaveBehindRegistry.ts` (custody); `architecture/maritime-strategy-staged-naval-action.md`; SPE-160 episodic pacing.
- **Table note:** Era overlay + fallible map — not fixed truth

**4. Ownership & reconciliation**
- **Primary (this comment):** SPE-58
- **Co-owners:** SPE-1085

**5. Boundary**
**In scope (when owner ships):**
- Authoring guardrails and acceptance notes on SPE-58

**Out of scope:**
- Franchise names and imported source prose
- Implementing the entire harvest batch as a mandate
- Other SPE subsystems not listed as co-owners on the candidate row
- Duplicate scope covered elsewhere: Supplements `mission-hub-guide-patterns-metadata-44` (team coverage), `street-contact-dossier-metadata-51` (contacts), `field-staff-operations-handbook-metadata-105` (careers/traits), `historical-occu…

**6. Disposition & issue decision**
- **Disposition:** no implementation change (guardrail)
- **Reasoning:** Contradiction/guardrail for authoring and intake policy on SPE-1085 hub themes; does not add a deliverable slice on this owner. Shared-boundary test → fold-in guardrail note, not child.

**Traceability:** `planning/pulp-expedition-adventure-metadata-40-harvest.md` (C38)
