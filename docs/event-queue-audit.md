# Event Queue Audit (Authored + Runtime Design)

> Documentation-only support note for authored/runtime event queue usage in Containment Protocol.
>
> Scope: design guidance and integration patterns only. No runtime behavior changes.

## 1) Queue categories

Recommended queue categories for authored/runtime flows:

- **Follow-up navigation events**
  - Author-driven handoffs from one notice/scene/briefing to the next.
  - Example shape: `type: 'authored.follow_up'`, `targetId: '<route-or-content-id>'`.

- **Deferred UI intent events**
  - User-confirmed actions that should be consumed later by another surface.
  - Useful when one page emits intent and another page resolves it.

- **Narrative transition events**
  - Structured transitions tied to story chains (posture changes, phase shifts, reveal prompts).
  - Should remain deterministic and state-based, not time-random.

- **Operational notification events**
  - Lightweight runtime notices for systems that need a compact “do next” signal.
  - Not a replacement for canonical simulation events.

- **Debug/authoring trace events**
  - Optional queue items used to diagnose authored flow ordering in development.
  - Should remain compact and easy to inspect in overlay tooling.

## 2) Recommended queue item fields

Use a compact, stable event shape with explicit identity and traceability:

- **Required fields**
  - `id` — deterministic queue id (sequence-based preferred)
  - `type` — event category/type identifier
  - `targetId` — destination token (route id, notice id, scene id, etc.)

- **Recommended metadata**
  - `contextId?` — authored context scope (`activeContextId`-like)
  - `source?` — producer id (choice id, trigger id, module id)
  - `week?` — simulation week stamp for diagnostics/replay sanity
  - `payload?` — compact scalar payload (`string | number | boolean | string[]` values)

- **Payload guidance**
  - Keep payload minimal and serializable.
  - Prefer references (`choiceId`, `followUpId`) over embedding large blobs.

## 3) Ordering and consumption rules

Use strict deterministic queue semantics to prevent drift:

1. **FIFO by default**
   - New events append to tail; consumption occurs from head.

2. **Stable sequence ids**
   - Queue ids should be deterministic and monotonic within a run.

3. **Explicit consumption only**
   - Never auto-consume on render; consume only at explicit handling points.

4. **Peek without mutation**
   - Read operations (`peek`, `list`) must be side-effect free.

5. **Idempotent empty dequeue**
   - Dequeue on empty queue should be safe and non-throwing.

6. **Clear as explicit operation**
   - Bulk queue clear should be intentional and logged.

7. **No hidden reordering**
   - Avoid priority reshuffling unless a first-class policy is introduced.

## 4) Integration with choices, triggers, logging, overlay, and save/load

### Choices

- Emit queue events from authored consequences (for example, follow-up emissions).
- Keep queue writes co-located with user-confirmed actions.
- Preserve result summaries (`followUpIds`, etc.) while queue becomes the deferred execution surface.

### Triggers

- Trigger systems should *read* queue state through explicit predicates/helpers.
- Avoid implicit trigger firing from mere queue presence; keep trigger evaluation explicit and deterministic.
- If queue-gated triggers are added, define exact match rules (`type`, `targetId`, optional `contextId`).

### Logging

- Log enqueue/dequeue/clear operations in compact developer logs.
- Recommended details:
  - queue event id
  - queue type
  - target id
  - context/source when present
- Keep logs deduplicated where practical to reduce chatter.

### Overlay

- Show pending queue items in insertion order.
- Include key diagnostics:
  - queue size
  - head item
  - id/type/target/context/source/week per entry
- Make it easy to verify authored flow order at a glance.

### Save/load

- Queue state should live in canonical runtime state and round-trip through save/load.
- Save/load normalization should:
  - reject malformed entries safely
  - preserve valid ordering
  - preserve next sequence cursor deterministically
- Avoid lossy transformations that can reorder or duplicate queue items.

## 5) Common pitfalls

- **Render-time consumption**
  - Consuming queue events during component render causes non-deterministic behavior.

- **Dual sources of truth**
  - Keeping both ad-hoc follow-up arrays and queue as competing executors creates drift.

- **Non-deterministic ids**
  - Random ids make debugging and replay validation harder.

- **Overloaded payloads**
  - Large nested payloads bloat saves and complicate migration.

- **Silent drops on normalization**
  - If malformed entries are dropped without visibility, debugging becomes opaque.

- **Unbounded queue growth**
  - Missing consumption/clear policies can create stale-event accumulation.

- **Queue/event log conflation**
  - Queue entries are pending intents; event logs are historical records.

## 6) Open questions

- Should queue semantics remain strictly FIFO, or do we need typed priority lanes later?
- What is the canonical deduplication policy for repeated follow-up emits from the same choice/context?
- Should queue item `type` values be centrally registered (schema/lint) to prevent drift?
- Do we need a max queue length with overflow policy (drop oldest, reject newest, or block emit)?
- Should save/load surface warnings when queue entries are sanitized/dropped?
- Should triggers consume queue entries directly, or should consumption remain in dedicated handlers only?
- Is there a need for correlation ids spanning queue events and developer log events for multi-step authored chains?
