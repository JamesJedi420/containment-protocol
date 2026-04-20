# Training & Certification Audit (Design Note)

> Scope: documentation-only support note for the Training & Certification system in Containment Protocol.
>
> Objective: define deterministic, bounded training/certification behavior suitable for the core operations loop.

## 1) Training categories

Recommended training categories (small, explicit set):

- **Core Role Drills**
  - Role baseline competency (hunter/occultist/investigator/field_recon/medium/tech/medic/negotiator).
  - Improves predictable role-domain output and readiness stability.

- **Domain Skill Tracks**
  - Combat / Investigation / Utility / Social progression lanes.
  - Supports specialization decisions without hidden branching.

- **Operational Discipline Modules**
  - Fatigue management, assignment discipline, protocol adherence, escalation handling.
  - Intended to reduce failure volatility rather than maximize peak scores.

- **Equipment Proficiency Modules**
  - Slot/item-tag familiarity (e.g., signal kit, ritual containment kit, medical support kit).
  - Enables or strengthens role-specific loadout compatibility/certification gates.

- **Cross-Role Bridge Training**
  - Controlled secondary competencies (e.g., investigator + recon support bridge).
  - Should remain bounded to avoid role identity collapse.

- **Advanced Certification Programs**
  - Tiered, gated modules requiring prerequisites and successful completion history.
  - Unlocks certification state changes and optional role/mission eligibility expansions.

## 2) Recommended trainee fields and progression fields

Keep trainee/progression state compact, persisted, and audit-friendly.

### Trainee fields (per operative)

- `agentId`
- `currentRole`
- `trainingStatus` (`idle | queued | in_progress | blocked | completed_recently`)
- `assignedTrainingId?`
- `trainingStartedWeek?`
- `trainingEtaWeek?`
- `trainingQueuePosition?`
- `readinessImpact` (small deterministic penalty/flag while training)

### Progression fields (per operative)

- `trainingPoints` (earned spendable progression points)
- `trainingHistory` (bounded list of completed training IDs + week)
- `certifications` (active cert records)
- `certProgress` (per-cert deterministic progress counters)
- `specializationTrack?` (if chosen)
- `lastTrainingWeek?`
- `failedAttemptsByTrainingId` (small counters for balancing/eligibility)

### Optional compact certification record

- `certId`
- `state`
- `awardedWeek?`
- `expiresWeek?` (if recertification model exists)
- `sourceTrainingIds[]`
- `notes?` (bounded human-readable reason)

## 3) Certification states and transition rules

Use explicit finite states:

- `not_started`
- `in_progress`
- `eligible_review`
- `certified`
- `expired` (optional if recertification required)
- `revoked` (rare, explicit administrative state)

### Deterministic transition rules (recommended)

- `not_started -> in_progress`
  - Requires explicit assignment to qualifying training path.

- `in_progress -> eligible_review`
  - Requires all prerequisite milestones complete.
  - No automatic hidden promotion.

- `eligible_review -> certified`
  - Requires explicit apply/confirm action (or deterministic weekly review function).

- `certified -> expired`
  - Only if cert has defined duration and expiry week reached.

- `certified -> revoked`
  - Explicit administrative/disciplinary trigger only.

- `expired -> in_progress`
  - Recert path explicit; does not auto-reactivate.

### Guardrails

- No backward transitions unless explicitly supported.
- Reject transitions missing prerequisite evidence.
- Persist transition week/reason for QA traceability.

## 4) Deterministic progression guidance

Design principles:

- **No hidden RNG in progression outcomes**
  - Inputs are known: base stats, training module weights, completion state, policy constants.

- **Bounded increments**
  - Clamp per-week and per-module gains.
  - Prevent runaway growth from repeated low-cost loops.

- **Explicit cost and opportunity trade-offs**
  - Training consumes slots/time/funding/readiness windows deterministically.

- **Stable formulas over branching heuristics**
  - Prefer linear or piecewise deterministic formulas with clear clamps.

- **Deterministic conflict handling**
  - If an agent is in deployment-locked state, training transitions should reject with explicit reason.

- **Auditability first**
  - Return compact delta summaries: what changed, by how much, and why.

## 5) Integration guidance

### Recruitment

- New hires should enter with baseline training profile + zero/seeded cert state.
- Funnel stage outcomes can influence initial training queue priority explicitly.

### Loadouts

- Certification can gate role-sensitive equipment tags/slots.
- Validation should expose `missing-certification` as explicit blocking issue.

### Teams

- Team composition helpers should read cert coverage (e.g., containment-certified presence).
- Add deterministic team readiness deltas based on training state and certification coverage.

### Deployment

- Deployment lock policy should explicitly block incompatible training transitions.
- Optionally allow non-blocking passive recert progress if policy says so.

### Mission resolution

- Certified capabilities should enter resolution as explicit bounded modifiers.
- Keep modifier application order fixed and documented.

### Attrition / replacement pressure

- Attrition events should surface certification gaps created by losses.
- Replacement planning should expose “training debt” metrics deterministically.

### Save/load

- Persist queue state, progress counters, cert states, and transition metadata.
- Hydration should sanitize invalid references and emit warnings (not silent mutation).

### Overlay / debug visibility

- Show per-agent training status, queue/ETA, cert states, and blocking reasons.
- Show compact aggregate counts: in-progress, certified, expired, blocked.

### Stability checks

Recommended invariant checks:

- Invalid training IDs in queue/history.
- Impossible transition pairs (e.g., `not_started -> certified` without evidence).
- Cert state inconsistency with prerequisite completion.
- Expired cert still treated as active in readiness paths.
- Save-restored stale training references to removed templates.

## 6) Common pitfalls

- **State duplication drift**
  - Training status duplicated across runtime/UI caches without single canonical source.

- **Implicit auto-promotions**
  - Hidden progression transitions reduce debuggability and QA trust.

- **Unbounded stacking**
  - Multiple cert bonuses compound beyond intended operational bounds.

- **Queue starvation**
  - No deterministic priority policy causes persistent training backlog dead zones.

- **Loadout/cert mismatch gaps**
  - Equipment validation ignores certification state, causing invalid deployable states.

- **Save/load schema fragility**
  - Missing migration/sanitization paths for added cert fields.

- **Ambiguous deployment locks**
  - Different systems disagree on when training actions are legal.

## 7) Open questions

- Should certification expiry be enabled in MVP, or start as non-expiring?
- What is the canonical deterministic review trigger for `eligible_review -> certified`?
- Which certifications should be hard-gating vs soft-bonus only?
- Should cross-role bridge training cap at one secondary lane per agent?
- How should failed certification attempts impact future eligibility/cost?
- What exact modifier ordering should mission resolution use when combining role + gear + cert?
- Should queue priority be manual, policy-driven, or hybrid deterministic?
- Do we need explicit “training debt” metrics at team/agency level for advisory surfaces?
