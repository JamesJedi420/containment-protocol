# Harvest reconciliation index

**Purpose:** Track pattern-harvest batches reconciled to Linear. These docs are **non-authoritative** for implementation sequencing (see `planning/backlog.md`). They mirror closure already posted on Linear.

**Content policy:** Do not add franchise names, wiki URLs, or imported canon labels to extracted prose/copy in this repo. Existing internal batch IDs, planning filenames, and SPE issue links may retain established identifiers used for reconciliation and traceability.

**In-repo rule:** Each table row must have a committed `planning/*-harvest.md` at the same revision. Do not add index rows until the mirror doc exists (Codex P2 — broken planning links).

**Batch ID vs candidate count:** The batch ID is a stable slug (often from source packet label or an earlier pass). The **Candidates** column is the reconciled total. When they differ (e.g. `post-release-tactical-manual-metadata-104` lists 104 candidates), use **Candidates** and the harvest doc summary — not the suffix digit alone.

**Not duplicate rows:** Uniqueness is the full batch ID string. Different IDs with the same candidate count are separate batches (e.g. `institutional-research-governance-18` and `personal-invention-records-18` are both 15 candidates but distinct reconciliations).

## Mirrored batches (committed harvest docs)

| Batch ID | Candidates | Child issue(s) | Hub / parent | Planning doc | Linear closed |
| -------- | -----------: | -------------- | ------------ | ------------ | ------------- |
| `alpha-centauri-manual-metadata-88` | 88 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052), [SPE-58](https://linear.app/spectranoir/issue/SPE-58), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [alpha-centauri-manual-metadata-88-harvest.md](alpha-centauri-manual-metadata-88-harvest.md) | 2026-05-21 |
| `covert-organization-field-catalog-metadata-83` | 83 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-788](https://linear.app/spectranoir/issue/SPE-788), [SPE-373](https://linear.app/spectranoir/issue/SPE-373), [SPE-598](https://linear.app/spectranoir/issue/SPE-598), [SPE-1334](https://linear.app/spectranoir/issue/SPE-1334), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [covert-organization-field-catalog-metadata-83-harvest.md](covert-organization-field-catalog-metadata-83-harvest.md) | 2026-05-20 |
| `covert-trust-intrigue-metadata-80` | 80 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-788](https://linear.app/spectranoir/issue/SPE-788), [SPE-208](https://linear.app/spectranoir/issue/SPE-208), [SPE-1334](https://linear.app/spectranoir/issue/SPE-1334), [SPE-1104](https://linear.app/spectranoir/issue/SPE-1104), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [covert-trust-intrigue-metadata-80-harvest.md](covert-trust-intrigue-metadata-80-harvest.md) | 2026-05-20 |
| `episodic-quick-incident-metadata-45` | 45 | none (fold-ins; partial Scribd/metadata source) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-160](https://linear.app/spectranoir/issue/SPE-160), [SPE-158](https://linear.app/spectranoir/issue/SPE-158), [SPE-854](https://linear.app/spectranoir/issue/SPE-854), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [episodic-quick-incident-metadata-45-harvest.md](episodic-quick-incident-metadata-45-harvest.md) | 2026-05-21 |
| `home-bases-transcript-metadata-48` | 48 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052), [SPE-1562](https://linear.app/spectranoir/issue/SPE-1562), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [home-bases-transcript-metadata-48-harvest.md](home-bases-transcript-metadata-48-harvest.md) | 2026-05-21 |
| `mission-hub-guide-patterns-metadata-44` | 44 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-16](https://linear.app/spectranoir/issue/SPE-16), [SPE-1025](https://linear.app/spectranoir/issue/SPE-1025), [SPE-854](https://linear.app/spectranoir/issue/SPE-854), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [mission-hub-guide-patterns-metadata-44-harvest.md](mission-hub-guide-patterns-metadata-44-harvest.md) | 2026-05-21 |
| `phenomena-hub-verified-metadata-58` | 58 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-88](https://linear.app/spectranoir/issue/SPE-88), [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [phenomena-hub-verified-metadata-58-harvest.md](phenomena-hub-verified-metadata-58-harvest.md) | 2026-05-21 |
| `post-release-tactical-manual-delta-100` | 100 | none (fold-ins; delta vs `post-release-tactical-manual-metadata-104`) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-42](https://linear.app/spectranoir/issue/SPE-42), [SPE-35](https://linear.app/spectranoir/issue/SPE-35), [SPE-58](https://linear.app/spectranoir/issue/SPE-58), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [post-release-tactical-manual-delta-100-harvest.md](post-release-tactical-manual-delta-100-harvest.md) | 2026-05-21 |
| `post-release-tactical-manual-metadata-104` | 104 | none (fold-ins; supplements `sealed-facility-manual-metadata-95`) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1061](https://linear.app/spectranoir/issue/SPE-1061), [SPE-1059](https://linear.app/spectranoir/issue/SPE-1059), [SPE-1034](https://linear.app/spectranoir/issue/SPE-1034), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [post-release-tactical-manual-metadata-104-harvest.md](post-release-tactical-manual-metadata-104-harvest.md) | 2026-05-21 |
| `postmortem-procedure-loadout-metadata-30` | 30 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111), [SPE-127](https://linear.app/spectranoir/issue/SPE-127), [SPE-1737](https://linear.app/spectranoir/issue/SPE-1737), [SPE-901](https://linear.app/spectranoir/issue/SPE-901), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [postmortem-procedure-loadout-metadata-30-harvest.md](postmortem-procedure-loadout-metadata-30-harvest.md) | 2026-05-20 |
| `proximity-chemical-predator-metadata-26` | 26 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1064](https://linear.app/spectranoir/issue/SPE-1064), [SPE-674](https://linear.app/spectranoir/issue/SPE-674), [SPE-1317](https://linear.app/spectranoir/issue/SPE-1317), [SPE-1285](https://linear.app/spectranoir/issue/SPE-1285), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [proximity-chemical-predator-metadata-26-harvest.md](proximity-chemical-predator-metadata-26-harvest.md) | 2026-05-20 |
| `sealed-facility-manual-metadata-95` | 95 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1052](https://linear.app/spectranoir/issue/SPE-1052), [SPE-58](https://linear.app/spectranoir/issue/SPE-58), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [sealed-facility-manual-metadata-95-harvest.md](sealed-facility-manual-metadata-95-harvest.md) | 2026-05-21 |
| `staff-role-packages-transcript-metadata-26` | 26 | none (fold-ins; low-confidence source) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-1443](https://linear.app/spectranoir/issue/SPE-1443), [SPE-1025](https://linear.app/spectranoir/issue/SPE-1025), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [staff-role-packages-transcript-metadata-26-harvest.md](staff-role-packages-transcript-metadata-26-harvest.md) | 2026-05-21 |
| `street-contact-dossier-metadata-51` | 51 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-158](https://linear.app/spectranoir/issue/SPE-158), [SPE-2095](https://linear.app/spectranoir/issue/SPE-2095), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [street-contact-dossier-metadata-51-harvest.md](street-contact-dossier-metadata-51-harvest.md) | 2026-05-21 |
| `tabletop-mechanics-transcript-metadata-87` | 87 | none (fold-ins) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110), [SPE-16](https://linear.app/spectranoir/issue/SPE-16), [SPE-562](https://linear.app/spectranoir/issue/SPE-562), [SPE-158](https://linear.app/spectranoir/issue/SPE-158), [SPE-1085](https://linear.app/spectranoir/issue/SPE-1085) | [tabletop-mechanics-transcript-metadata-87-harvest.md](tabletop-mechanics-transcript-metadata-87-harvest.md) | 2026-05-21 |

## Adjacent intake tiers (boundaries)

| Tier | Issue | Domain module (planned) |
| ---- | ----- | ------------------------ |
| Minor objects | [SPE-2104](https://linear.app/spectranoir/issue/SPE-2104) | `minorAnomalyItemRegistry.ts` |
| Brief events | [SPE-2105](https://linear.app/spectranoir/issue/SPE-2105) | `extranormalEventRegistry.ts` |
| Low-threat locations | [SPE-2106](https://linear.app/spectranoir/issue/SPE-2106) | `unexplainedLocationRegistry.ts` |
| Self-censoring information | [SPE-2108](https://linear.app/spectranoir/issue/SPE-2108) | `selfCensoringInformationRegistry.ts` |
| Public disclosure states | [SPE-2109](https://linear.app/spectranoir/issue/SPE-2109) | `publicDisclosureStateRegistry.ts` |
| Pattern source series (meta) | [SPE-2110](https://linear.app/spectranoir/issue/SPE-2110) | `patternSourceSeriesRegistry.ts` |
| Visual-trigger hazards | [SPE-2111](https://linear.app/spectranoir/issue/SPE-2111) | `visualTriggerHazardRegistry.ts` |
| Entity welfare reclassification | [SPE-2114](https://linear.app/spectranoir/issue/SPE-2114) | `entityWelfareReclassificationRegistry.ts` |
| Contained-person therapeutic care | [SPE-2115](https://linear.app/spectranoir/issue/SPE-2115) | `containedPersonTherapeuticCareRegistry.ts` |
| Naming-hazard descriptors | [SPE-2116](https://linear.app/spectranoir/issue/SPE-2116) | `namingHazardDescriptorRegistry.ts` |
| Recurrent catastrophe amelioration | [SPE-2117](https://linear.app/spectranoir/issue/SPE-2117) | `recurrentCatastropheAmeliorationRegistry.ts` |
| Concept-state operators | [SPE-2118](https://linear.app/spectranoir/issue/SPE-2118) | `conceptStateTransformationRegistry.ts` |
| Anti-narrative record collapse | [SPE-2119](https://linear.app/spectranoir/issue/SPE-2119) | `antiNarrativeRecordCollapseRegistry.ts` |
| Media-contained events | [SPE-2120](https://linear.app/spectranoir/issue/SPE-2120) | `mediaContainedEventRegistry.ts` |
| Alternate-reality threshold routes | [SPE-2121](https://linear.app/spectranoir/issue/SPE-2121) | `alternateRealityThresholdRouteRegistry.ts` |
| Mass anomalous population emergence | [SPE-2122](https://linear.app/spectranoir/issue/SPE-2122) | `massAnomalousPopulationEmergenceRegistry.ts` |
| Rule-document compliance containment | [SPE-2123](https://linear.app/spectranoir/issue/SPE-2123) | `ruleDocumentComplianceContainmentRegistry.ts` |

Full case / facility lifecycle: [SPE-1310](https://linear.app/spectranoir/issue/SPE-1310).

## How to add a row

1. Close the batch on Linear (child + fold-in comments) in the same session as adjudication.
2. Add `planning/<batch-id>-harvest.md`, then append a row to **Mirrored batches** above (verify the planning doc link opens).
3. Open a docs-only PR; do not mix harvest mirrors with implementation commits.

Batches reconciled on Linear without a mirror doc yet stay off this index until the `*-harvest.md` file lands.
