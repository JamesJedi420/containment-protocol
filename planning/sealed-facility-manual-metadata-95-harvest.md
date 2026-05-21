# Harvest — `sealed-facility-manual-metadata-95`

**Source:** Verified game-manual pattern library (121 pp). Pattern-only — no franchise names, proprietary UI labels, or imported setting lore.

**Repo at triage:** `src/domain/siteGeneration/mapMetadata.ts` (fallible map layers); `src/features/dashboard/eventFeedView.ts` (reputation/events); stealth leave-behind in mission triage; SPE-49/SPE-1104/SPE-98 Done substrates; SPE-70/SPE-626/SPE-1653 Done partial substrates.

## Adjudication summary

**Candidates:** 95 (84 + 1 + 10 = 95). Matches per-candidate table: C26 no-op; C86–C95 contradiction checks.

| Verdict | Count |
| ------- | ----: |
| fold-in | 84 |
| no-op | 1 |
| contradiction check | 10 |
| new child | 0 |

## Primary owner map

| Owner | Candidates |
| ----- | ---------- |
| SPE-2110 | Intake |
| SPE-1085, SPE-151 | C85–C95 |
| SPE-1052, SPE-292 | C1, C4 |
| SPE-854, SPE-1009, SPE-1286 | C2, C47 |
| SPE-75, SPE-879 | C3 |
| SPE-1672, SPE-794, SPE-168 | C4–C5 |
| SPE-562, SPE-704, SPE-1075, SPE-912 | C6–C8, C7 |
| SPE-544, SPE-1222, SPE-1219 | C9–C10 |
| SPE-1120, SPE-205 | C11 |
| SPE-83, SPE-158, SPE-2095 | C12 |
| SPE-1061, SPE-1372 | C13–C14 |
| SPE-1034, SPE-733, SPE-793 | C15, C37–C40 |
| SPE-1059, SPE-1412 | C16–C18, C17 |
| SPE-1101, SPE-196 | C19–C20, C72–C73 |
| SPE-1034 | C21 |
| SPE-1123, event feed | C22 |
| SPE-98, SPE-1658 | C23–C24 (no-op pointer) |
| SPE-1074, SPE-145 | C25–C27 |
| SPE-98 | C28–C29 (no-op) |
| SPE-58, SPE-1244, SPE-529 | C30–C32 |
| SPE-49 | C32–C33 (no-op) |
| SPE-371, SPE-605, SPE-1385 | C34–C36 |
| SPE-1555, SPE-468, SPE-402 | C41–C42 |
| SPE-35, SPE-1160, SPE-788 | C43–C45 |
| SPE-16, SPE-1308 | C46 |
| SPE-1485, SPE-1734 | C48–C49 |
| SPE-529, SPE-1285 | C50–C51 |
| SPE-70, SPE-1429 | C52–C53 (no-op on SPE-70) |
| SPE-1610, SPE-62, SPE-1485 | C54 |
| SPE-40, SPE-1412, SPE-1708 | C55–C57 |
| SPE-614, SPE-55, SPE-120, SPE-145 | C58–C63, C65 |
| SPE-164 | C64, C69 |
| SPE-68, SPE-544, SPE-1653 | C10, C61–C62, C66, C92, C94 |
| SPE-1484 | C61, C91 |
| SPE-1059, SPE-196 | C70–C71 |
| SPE-788, SPE-282 | C74 |
| SPE-371, SPE-1429 | C75 |
| SPE-1123, SPE-1734, SPE-361 | C76–C84 |

## Per-candidate outcomes

| ID | CP concept | Verdict | Disposition | Owner(s) | New |
| -- | ---------- | ------- | ----------- | -------- | --- |
| C1 | Rated safe-facility capacity, duration, critical systems, hot bunking | accept | fold_in | SPE-1052 | — |
| C2 | Fallible institutional manuals and field annotations | accept | fold_in | SPE-854, SPE-1009 | — |
| C3 | Disaster-type playbook library | accept | fold_in | SPE-75, SPE-879 | — |
| C4 | Life-support resource countdown clocks | accept | fold_in | SPE-1672, SPE-1052 | — |
| C5 | Offscreen world progression while player elsewhere | accept | fold_in | SPE-168, SPE-1672 | — |
| C6 | Staged catastrophe consequence phases | accept | fold_in | SPE-562, SPE-704 | — |
| C7 | EMP / electronics infrastructure disruption | accept | fold_in | SPE-912, SPE-1075 | — |
| C8 | Time-varying contamination and deposition decay | accept | fold_in | SPE-1222, SPE-1219 | — |
| C9 | Hidden cumulative exposure with detection and treatment | accept | fold_in | SPE-544, SPE-1222 | — |
| C10 | Progressive poison/status over time | accept | fold_in | SPE-544, SPE-68 | — |
| C11 | Diegetic training simulation onboarding | accept | fold_in | SPE-1120, SPE-205 | — |
| C12 | Prebuilt staff/agency starter profiles | accept | fold_in | SPE-83, SPE-158 | — |
| C13 | Durable baseline actor attributes | accept | fold_in | SPE-1061 | — |
| C14 | Derived operational stats from traits | accept | fold_in | SPE-1061, SPE-1372 | — |
| C15 | Cognition-gated dialogue availability | accept | fold_in | SPE-1034, SPE-733 | — |
| C16 | Marked specialty faster-growth tracks | accept | fold_in | SPE-1059 | — |
| C17 | Passive vs deliberate procedure resolution | accept | fold_in | SPE-1059, SPE-1412 | — |
| C18 | Sanctioned vs covert skill legality tags | accept | fold_in | SPE-1059 | — |
| C19 | Creation-time trait tradeoff pairs | accept | fold_in | SPE-1101, SPE-196 | — |
| C20 | Long-term trait mutation after exposure | accept | fold_in | SPE-1101, SPE-544 | — |
| C21 | Demographics as minor social modifiers | accept | fold_in | SPE-1034 | — |
| C22 | Scrollable operational event log | accept | fold_in | SPE-1123 | — |
| C23 | Two ready active tool slots | accept | fold_in | SPE-1658 | — |
| C24 | Inventory access costs time under pressure | accept | fold_in | SPE-1658, SPE-40 | — |
| C25 | Item weight, bulk, value schema | accept | fold_in | SPE-1074, SPE-98 | — |
| C26 | Containers organize without lifting carry cap | accept | no-op | SPE-98 | — |
| C27 | Consumable compatibility and reload rules | accept | fold_in | SPE-145, SPE-98 | — |
| C28 | Salvage strip components from bulky objects | accept | fold_in | SPE-98 | — |
| C29 | Dropped cache persistence and theft rules | accept | fold_in | SPE-98 | — |
| C30 | Exploration-built site automap memory | accept | fold_in | SPE-58, SPE-1244 | — |
| C31 | Sensor overlay on current map | accept | fold_in | SPE-529 | — |
| C32 | Regional map discovery gradient | accept | fold_in | SPE-49, SPE-58 | — |
| C33 | Discovered travel nodes | accept | fold_in | SPE-49, SPE-1385 | — |
| C34 | Terrain-weighted travel time and encounters | accept | fold_in | SPE-371, SPE-605 | — |
| C35 | Varied random travel interruptions | accept | fold_in | SPE-371, SPE-605 | — |
| C36 | Local access nodes from discovery/reputation | accept | fold_in | SPE-1385, SPE-35 | — |
| C37 | Incidental vs full negotiation dialogue modes | accept | fold_in | SPE-1034 | — |
| C38 | Social reaction from stats, reputation, choices | accept | fold_in | SPE-1034, SPE-35 | — |
| C39 | Hidden dialogue procedure checks | accept | fold_in | SPE-793, SPE-1034 | — |
| C40 | Short conversation buffer vs durable case notes | accept | fold_in | SPE-1034, SPE-854 | — |
| C41 | Two-sided negotiation leverage | accept | fold_in | SPE-1555, SPE-468 | — |
| C42 | Exploitative offers as relationship events | accept | fold_in | SPE-1555, SPE-35 | — |
| C43 | Faction-valued reputation polarity | accept | fold_in | SPE-35, SPE-1160 | — |
| C44 | Scoped reputation and medical flags in ledger | accept | fold_in | SPE-158, SPE-1160 | — |
| C45 | Casualty history by category | accept | fold_in | SPE-1160, SPE-788 | — |
| C46 | Case log grouped by site | accept | fold_in | SPE-16, SPE-1308 | — |
| C47 | Archive viewed evidence media | accept | fold_in | SPE-854, SPE-1264 | — |
| C48 | Deliberate time passage with missed events | accept | fold_in | SPE-1485, SPE-1734 | — |
| C49 | Day/night schedules and visibility | accept | fold_in | SPE-1485, SPE-529 | — |
| C50 | Darkness affects targeting and detection | accept | fold_in | SPE-529, SPE-1285 | — |
| C51 | Deployable temporary environment modifiers | accept | fold_in | SPE-1285 | — |
| C52 | Maintained stealth posture with break rules | accept | fold_in | SPE-1429 | — |
| C53 | Proximity-based detection composition | accept | fold_in | SPE-529, SPE-781 | — |
| C54 | Investigation vs crisis resolution mode switch | accept | fold_in | SPE-1610, SPE-62 | — |
| C55 | Tactical action-point economy | accept | fold_in | SPE-40, SPE-1412 | — |
| C56 | Movement reserving follow-up action budget | accept | fold_in | SPE-40 | — |
| C57 | Unused budget converts to defensive readiness | accept | fold_in | SPE-1708, SPE-1412 | — |
| C58 | Multi-factor procedure success formula | accept | fold_in | SPE-614, SPE-55 | — |
| C59 | Area attacks with friendly-fire cone risk | accept | fold_in | SPE-55 | — |
| C60 | Targeted disabling procedures | accept | fold_in | SPE-614, SPE-120 | — |
| C61 | Limb/region functional impairment | accept | fold_in | SPE-120, SPE-1484 | — |
| C62 | Avoidance, threshold, resistance armor layers | accept | fold_in | SPE-145, SPE-120 | — |
| C63 | Typed damage resistances on gear | accept | fold_in | SPE-145 | — |
| C64 | Typed critical failure mishap table | accept | fold_in | SPE-164, SPE-55 | — |
| C65 | Maintenance reduces malfunction rate | accept | fold_in | SPE-145, SPE-1380 | — |
| C66 | Stimulant benefit, dependency, withdrawal | accept | fold_in | SPE-544, SPE-68 | — |
| C67 | Tool-assisted procedure success | accept | fold_in | SPE-98, SPE-1059 | — |
| C68 | Limited-charge support kits | accept | fold_in | SPE-98 | — |
| C69 | Timed hazard devices with setup skill | accept | fold_in | SPE-164 | — |
| C70 | Progression from missions and procedures | accept | fold_in | SPE-1059 | — |
| C71 | Banked training points | accept | fold_in | SPE-1059 | — |
| C72 | Gated advanced abilities with prerequisites | accept | fold_in | SPE-196, SPE-1059 | — |
| C73 | Multi-rank repeatable upgrades | accept | fold_in | SPE-196 | — |
| C74 | Rare contingent ally events | accept | fold_in | SPE-788 | — |
| C75 | Travel traits affect speed, safety, discovery | accept | fold_in | SPE-371, SPE-1429 | — |
| C76 | Diegetic command tablet UI | accept | fold_in | SPE-1123 | — |
| C77 | Interaction mode cursor affordances | accept | fold_in | SPE-1123 | — |
| C78 | Redundant input routes for core actions | accept | fold_in | SPE-1734 | — |
| C79 | Split simulation/combat/accessibility settings | accept | fold_in | SPE-1734, SPE-361 | — |
| C80 | Separate investigation vs combat difficulty | accept | fold_in | SPE-361, SPE-1734 | — |
| C81 | Verbose vs concise operational message modes | accept | fold_in | SPE-1123 | — |
| C82 | Context-sensitive target highlighting | accept | fold_in | SPE-1123 | — |
| C83 | Rolling save / commitment scenario modes | accept | fold_in | SPE-1734 | — |
| C84 | Keyboard quick commands | accept | fold_in | SPE-1734 | — |
| C85 | In-universe document tonal satire | accept | fold_in | SPE-1085 | — |
| C86 | No imported franchise names or UI text | accept | contradiction_check | SPE-1085, SPE-151 | — |
| C87 | Operational framing not post-apocalypse lore | accept | contradiction_check | SPE-1085 | — |
| C88 | Timers must drive triage and offscreen harm | accept | contradiction_check | SPE-1672, SPE-168 | — |
| C89 | Hidden rolls surface through consequences | accept | contradiction_check | SPE-793, SPE-1034 | — |
| C90 | Reputation is faction-relative not universal | accept | contradiction_check | SPE-35, SPE-1160 | — |
| C91 | Inventory carries operational friction | accept | contradiction_check | SPE-98, SPE-1074 | — |
| C92 | Injury alters capability not only HP | accept | contradiction_check | SPE-120, SPE-1484 | — |
| C93 | Maps are discovery artifacts not omniscience | accept | contradiction_check | SPE-58, SPE-1244 | — |
| C94 | Medical support requires supplies and time | accept | contradiction_check | SPE-68, SPE-98 | — |
| C95 | Precision actions cost more time/risk | accept | contradiction_check | SPE-614, SPE-40 | — |
