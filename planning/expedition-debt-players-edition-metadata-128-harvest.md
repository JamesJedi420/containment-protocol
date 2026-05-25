# Harvest — `expedition-debt-players-edition-metadata-128`

**Source:** Readable 233-page Player’s Edition PDF (pp. 2–10 core rules/economy; pp. 11–229 career/debt/oddity/NPC material; pp. 230–232 doctrine summary). Pattern-only — no imported career titles, oddity names, setting proper nouns, tables, or prose.

**Dedup:** **Delta pass** against `expedition-debt-route-map-metadata-115` (336 pp. full supplement). Reuse 115 fold-ins where boundary unchanged; this batch adds PE-specific acceptance notes and net-new core-rules surfaces.

**Repo at triage:** `progressClocks.ts`; `teamComposition`/recruitment; `externalSupport.ts`; `mapMetadata.ts` access tiers; `relationshipProjection.ts`; `districtSchedule.ts`; `background-packages-inherited-start-state.md`.

## Adjudication summary

**Candidates:** 128 (38 delta fold-in · 58 no-op · 18 contradiction · 14 contradiction+guardrail overlap).

| Verdict | Count |
| ------- | ----: |
| delta fold-in | 38 |
| no-op (115 duplicate) | 58 |
| contradiction check | 18 |
| new child | 0 |

## No-op ranges (covered by `expedition-debt-route-map-metadata-115`)

| IDs | Note |
| --- | ---- |
| C1–C2, C5–C10, C13–C15, C17–C19, C25, C29–C37, C47, C48–C61 (except deltas below), C75–C78, C80, C86–C88, C90, C103–C106 | Same owner/boundary as 115 batch |
| C126–C128 | Guardrails: no direct combat math / career list / oddity list import |

## Delta fold-in map (net-new or PE-sharpened)

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-16, SPE-626 | C3–C4, C39, C42, C85, C101 |
| SPE-562 | C16, C86, C93 |
| SPE-158, SPE-1443, SPE-2095 | C28, C40–C41, C44, C81–C82, C89, C94–C99, C100 |
| SPE-130, SPE-1107 | C11–C12, C21 |
| SPE-371 | C16 |
| SPE-42 | C22, C108 |
| SPE-1610 | C21, C23, C110 |
| SPE-98, SPE-1025 | C24, C26–C27 |
| SPE-1052 | C24 |
| SPE-529, SPE-901 | C38, C59, C62–C63, C72, C74, C83 |
| SPE-854 | C43, C45, C70, C105 |
| SPE-35 | C40, C64–C65 |
| SPE-2108 | C69 |
| SPE-793, SPE-614 | C46–C47, C107, C109 |
| SPE-208 | C31, C92 |
| SPE-109 | C102 |
| SPE-88 | C79 |
| SPE-598 | C67 |
| SPE-1085, SPE-151 | C111–C125, C126–C128 |

## Per-candidate outcomes (abbreviated)

| ID | Verdict | Owner(s) | Note |
| -- | ------- | -------- | ---- |
| C1–C2 | no_op | SPE-16, SPE-788 | =115 C1–C2 |
| C3 | delta | SPE-16 | Debt clause/obligation schema (not amount-only) |
| C4 | delta | SPE-16 | Dynamic liability modifiers from events |
| C5–C10 | no_op | per 115 | Rival, lackey, replacement, scars |
| C11 | delta | SPE-130 | Operational buffer vs harm track |
| C12 | delta | SPE-1107 | Functional degradation conditions |
| C13–C15 | no_op | per 115 | Critical harm, scars, deprivation |
| C16 | delta | SPE-371, SPE-562 | Rest restores buffer + advances clocks/encounter risk |
| C17–C19 | no_op | per 115 | Specialist recovery, paid/fast, bulky load |
| C20 | delta | SPE-158 | Uncertain first-reaction resolver |
| C21 | delta | SPE-1610, SPE-1107 | Group morale/rout for followers |
| C22 | delta | SPE-42 | Retreat requires known exit/route confidence |
| C23 | delta | SPE-1610 | Large-group detachment abstraction |
| C24 | delta | SPE-98, SPE-1052 | Damageable vehicles/structures/assets |
| C25–C37 | no_op | per 115 | Oddities, vendors, careers, mining |
| C38 | delta | SPE-901, SPE-854 | Item claimant/custody conflict |
| C39 | delta | SPE-16 | Shared inherited asset liability hooks |
| C40 | delta | SPE-35, SPE-158 | Mandated observer/tracker obligations |
| C41 | delta | SPE-158, SPE-1443 | Access blacklist/restriction tags |
| C42 | delta | SPE-16 | Debt payoff category incentives |
| C43 | delta | SPE-854 | Favor/secret procurement with risk |
| C44 | delta | SPE-158 | Risk-bearing staff improvement (keep-worse roll) |
| C45 | delta | SPE-854 | Question-driven site inspection primary |
| C46 | delta | SPE-793, SPE-151 | Noncombat-first resolution doctrine |
| C47 | no_op | SPE-793 | =115 impact loop |
| C48–C57 | no_op | SPE-529 | Oddity patterns in 115 |
| C58–C61 | no_op | per 115 | Detectors, helpers |
| C59 | delta | SPE-529 | Activation-cost categories (currency, sacrifice, belief) |
| C62–C63 | delta | SPE-529 | Device personality/refusal; extraction beacons |
| C64–C65 | contradiction+fold | SPE-35, SPE-529 | Memory/coercion safeguards |
| C66–C71 | delta/no_op | SPE-158, SPE-901 | Animals, group actors, samples |
| C67 | delta | SPE-598, SPE-158 | Composite operational unit actors |
| C68–C70 | delta | SPE-1443, SPE-2108, SPE-854 | Masks, perception asymmetry, intent sensing |
| C72–C74 | delta | SPE-529 | Timed repair; object-class preparation procedures |
| C75–C80 | no_op | per 115 | Time comms, building read, maps |
| C79 | delta | SPE-88 | Machine purpose/ailment inspection |
| C81–C83 | delta | SPE-158, SPE-16, SPE-529 | Actor/debtholder/oddity templates |
| C84–C85 | delta | SPE-98, SPE-16 | Equipment bundles; org-binding debt origin |
| C86–C90 | no_op | per 115 | Rival/rest/recovery/market/vendor |
| C91–C95 | delta | SPE-35, SPE-208, SPE-1443 | Legal loophole; legitimacy gradient; social access |
| C96–C98 | delta | SPE-1107 | Psychological/social deprivation dependencies |
| C99–C102 | delta/no_op | SPE-158, SPE-788, SPE-109 | Mobile assets; institutions; borough access |
| C101 | delta | SPE-16 | Bureaucratic debt-office mission source |
| C103–C106 | no_op | per 115 | Transit, maps, oddity liability |
| C107–C109 | delta | SPE-793, SPE-562 | Crew doctrine; route alternatives; consequence report |
| C110 | delta | SPE-1610 | Compact generated-actor stat style guideline |
| C111–C125 | contradiction | SPE-1085, SPE-151 | IP, weapons, ethics, dignity, surveillance, politics |
| C126–C128 | no_op/guardrail | SPE-1085, SPE-151, SPE-529 | Combat math, career list, oddity list import bans |
