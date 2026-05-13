# Knowledge subsystems expansion (SPE-529, SPE-587, SPE-588, SPE-589)

## Purpose

**SPE-58** (`architecture/knowledge-state-system.md`) defines the **epistemic stack**: actual vs observed vs interpreted vs agency-known. This document expands **four child scopes** so implementation and audits can attach to named surfaces without bloating the parent. It does **not** redefine SPE-58 semantics; it **partitions ownership** for sensing UI, dispatch views, exotic acquisition channels, and time-based knowledge decay.

## Shared vocabulary (all four)

- **Truth carrier** — structured record the simulation can update (evidence shard, sensor frame, doctrine memo).
- **Visibility class** — who may read which fields under which policy (command vs field vs archive).
- **Clock** — deterministic tick or half-life driving staleness, suppression, or merge windows.
- **Merge rule** — how conflicting carriers collapse or coexist when policy forces reconciliation.

Child subsystems **must** emit operations that SPE-58 can classify into the four layers; they **must not** introduce a fifth “shadow truth” that bypasses agency-known commitments for player-facing actions.

---

## SPE-529 — Sensing, masking, relay surfaces

**Scope:** Sensors, jamming, repeaters, degraded feeds, and **signal path** integrity (not full combat resolution).

### Canonical surfaces

| Surface                   | Meaning                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Channel graph**         | Nodes (sensor, relay, jammer, analyst desk) and edges with bandwidth, latency, and loss class.             |
| **Frame**                 | Time-bounded observation packet (who sensed what, at what confidence, under which mask).                   |
| **Mask state**            | Active deception or occlusion on a channel or region (may downgrade confidence without fabricating facts). |
| **Replay / tamper flags** | Whether a frame is authentic, duplicated, or disputed.                                                     |

### Integration

- Feeds **observed** layer in SPE-58; interpretation and agency-known updates still owned by command doctrine and `KnowledgeState` consumers.
- Field routing hooks align with `docs/knowledge-intel-partial-information-audit.md` (confidence, partial tables).

### Anti-patterns

- Hard-coding “UI fog” without a frame + mask model backing it.
- Letting jamming silently delete evidence instead of marking **unknown** or **degraded**.

---

## SPE-587 — Operational knowledge views, dispatch filters

**Scope:** What **different operational roles** may see vs act on under the same underlying truth carriers.

### Canonical surfaces

| Surface          | Meaning                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------ |
| **View profile** | Role template (dispatcher, field lead, analyst) mapping truth carriers to visible fields.              |
| **Action gate**  | Which commitments (deploy, escalate, withhold) each profile may trigger from agency-known subset only. |
| **Filter stack** | Ordered transforms (redaction, aggregation, delay) applied before render or export.                    |
| **Audit trail**  | Immutable log of profile changes and exceptional widen/narrow events.                                  |

### Integration

- Explains **why** two dashboards disagree without forking simulation truth.
- Connects to mission triage and hub surfaces (`ux/mission-triage.md`, `ux/hub-view.md`) as **projections**, not new state owners.

### Anti-patterns

- Per-view ad hoc copies of intel that become parallel truth.
- Dispatch actions driven by fields hidden from the role without explicit override policy.

---

## SPE-588 — Dream, inherited, preserved knowledge channels

**Scope:** Knowledge that **enters outside normal recon** (dreams, inherited memories, relic impressions, sealed archives).

### Canonical surfaces

| Surface              | Meaning                                                                          |
| -------------------- | -------------------------------------------------------------------------------- |
| **Channel type**     | Enum-like discriminator (dream, lineage, relic, sealed_record, …).               |
| **Provenance tag**   | Non-repudiable marker that this carrier did not come from ordinary sensing.      |
| **Credibility band** | Separate from sensor confidence — encodes institutional trust in exotic sources. |
| **Leak policy**      | What may cross from interpreted → agency-known without full verification.        |

### Integration

- Carriers still land in the same **hypothesis / evidence** machinery as recon; they differ by **provenance** and **merge rules**.
- Narrative-heavy; keep **bounded** effect on mechanical commitments unless a verification clock completes.

### Anti-patterns

- Dream knowledge that auto-upgrades to agency-known without a policy step.
- Infinite recursion of “inherited memory of a memory.”

---

## SPE-589 — Freshness, decay, fragmentation

**Scope:** Stale intel, partial recall, contradictory shards, **time-driven** knowledge quality.

### Canonical surfaces

| Surface              | Meaning                                                               |
| -------------------- | --------------------------------------------------------------------- |
| **Freshness vector** | Per-carrier age, half-life, and refresh sources.                      |
| **Fragment set**     | Competing shards that have not merged; explicit incompatibility bits. |
| **Decay transition** | Deterministic table from fresh → stale → void / archived.             |
| **Re-acquisition**   | What actions refresh or replace a carrier vs append a correction.     |

### Integration

- Drives **when** UI warnings fire and when weakest-link / routing may treat intel as **missing**.
- Aligns with `docs/knowledge-intel-partial-information-audit.md` clocks and confidence decay language.

### Anti-patterns

- Silent equality of two shards with different ages.
- Using wall-clock real time instead of **simulation week** for decay in campaign mode.

---

## See also

- `architecture/knowledge-state-system.md` — SPE-58 parent contract
- `docs/knowledge-intel-partial-information-audit.md` — field and routing checklist
- `planning/deferred-design-documents.md` — tracker (this file satisfies child depth for listing purposes)
