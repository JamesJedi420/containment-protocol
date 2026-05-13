# Pre-Mission Query Budgets and Briefing Intel (SPE-112)

## Purpose

Before deployment, missions expose a **finite authored question budget** — not a full exposition dump or a single abstract “recon roll.” Answers are **narrow**, may carry **confidence**, may be **partial** or **witness-limited**, and **unanswered channels remain real unknowns** at mission start.

## Question budget

- Each mission (or template) declares **allowed question IDs** and a **max count** (or point cost) spendable in the briefing phase.
- Questions map to **channels**: logistics, hostile ORBAT, site layout, legal risk, anomaly class, local politics, etc.

## Answer shape

Responses should be structured as:

- **narrow fact** or **bounded distribution** (not the whole truth graph),
- **confidence** or **censor band** when intel is degraded,
- **partial** — explicit “unknown remainder” field,
- **witness-limited** — answer quality caps when no credible witness path exists.

## Unanswered unknowns

Channels with **zero spend** or **failed unlock** stay **opaque** to routing and resolution — weakest-link and readiness consume that uncertainty honestly.

## Integration

- **SPE-22 / SPE-58** — canonical intel vs briefing views; briefing budgets are **not** a second intel engine.
- **Knowledge audit** — routing table references SPE-112 vs SPE-22 core state.

## Anti-patterns

- Auto-revealing all mission facts after one generic briefing action.
- Letting briefing answers overwrite hidden operational truth maps.

## See also

- `docs/knowledge-intel-partial-information-audit.md`
- `architecture/knowledge-state-system.md` — SPE-58
- `docs/scouting-recon-audit.md`
