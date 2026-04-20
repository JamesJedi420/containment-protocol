# Visibility Layer / Decision Legibility Pass — Design Note

## 1. Explanation Categories

- **Routing Explanations:** Why a mission was (or was not) routed, including blockers, priorities, and candidate evaluations.
- **Deployment Readiness Explanations:** Why a team is (or is not) ready, including hard/soft blockers, readiness scores, and missing requirements.
- **Weakest-Link Explanations:** Why a particular agent, team, or resource is the limiting factor in an outcome.
- **Weekly Pressure Summaries:** What pressures (budget, attrition, intel, etc.) are affecting the organization this week and why.
- **Simulation Overlay Explanations:** Contextual overlays that explain simulation state, transitions, and outcomes.
- **Stability/Recovery Explanations:** Why a state is flagged as unstable or requires recovery.

## 2. Recommended Explanation State Fields

- `explanationId: string` — Unique identifier for the explanation.
- `category: 'routing' | 'readiness' | 'weakest-link' | 'pressure' | 'overlay' | 'stability'`
- `summary: string` — One-line summary of the decision or outcome.
- `details: string[]` — List of detailed reasons, blockers, or contributing factors.
- `relatedIds: string[]` — IDs of related missions, teams, agents, or resources.
- `severity: 'info' | 'warning' | 'error'`
- `timestamp: number` — Week or tick when the explanation was generated.
- `actions: string[]` — Suggested actions or recovery steps, if any.

## 3. Routing Explanation Guidance

- Always surface why a mission was routed, blocked, or prioritized.
- Include all routing blockers, candidate evaluations, and tie-breakers.
- Show both positive (why routed) and negative (why not routed) factors.
- Link explanations to mission and team IDs for traceability.

## 4. Deployment Readiness Explanation Guidance

- Surface all hard and soft blockers, missing requirements, and readiness scores.
- Explain how each factor (intel, fatigue, skills, equipment) contributes to readiness.
- Highlight the weakest readiness factor and its impact.
- Provide actionable suggestions for improving readiness.

## 5. Weakest-Link Explanation Guidance

- Clearly identify the limiting agent, team, or resource.
- Explain how the weakest link was determined (e.g., lowest skill, missing cert).
- Show the impact of the weakest link on the overall outcome.
- Suggest possible mitigations or alternatives.

## 6. Weekly Pressure Summary Guidance

- Summarize all active pressures (budget, attrition, intel gaps, etc.) for the week.
- Explain the source and impact of each pressure.
- Highlight new, resolved, or escalating pressures.
- Integrate with overlays and weekly reports for player/developer visibility.

## 7. Integration with Overlay, Save/Load, Stability, and Simulation Summaries

- Explanations should be accessible via overlays, tooltips, and summary panels.
- Explanation state should be serializable for save/load compatibility.
- Stability checks should surface explanations for flagged issues.
- Integrate explanations into existing simulation summaries and debug overlays.

## 8. Common Pitfalls

- Overly technical or verbose explanations that overwhelm users.
- Missing links between explanations and affected entities.
- Failing to update explanations after state changes or recovery.
- Inconsistent explanation formats across categories.
- Explanations that do not suggest actionable next steps.

## 9. Open Questions

- How granular should explanations be (per action, per outcome, per week)?
- Should explanations be player-facing, developer-facing, or both?
- How to handle explanation bloat in large/complex simulations?
- What is the best way to surface explanations in the UI without clutter?
- How to prioritize explanations when multiple factors are present?

---

### Summary

- **Files created:** `docs/visibility-layer-audit.md`
- **Runtime code changed:** No
- **Overlap risks:** None; documentation-only, no runtime or test files modified.
