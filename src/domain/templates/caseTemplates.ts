// cspell:words cataloguers cutovers exfiltration psionic
import { TEAM_COVERAGE_ROLES, type CaseTemplate, type TeamCoverageRole } from '../models'
import { normalizeSpawnRule } from '../spawnRules'
import { occultCaseTemplates } from './caseTemplates.occult'
import { operationsCaseTemplates } from './caseTemplates.operations'
import { psionicCaseTemplates } from './caseTemplates.psionic'

const baseCaseTemplates: CaseTemplate[] = [
  // --- Year 2 Expansion ---
  {
    templateId: 'escalation-psi-002',
    title: 'Psi Escalation — Cognitive Breach',
    description:
      'A psi-active breach is causing cognitive drift among staff in the lower archives. Pressure is mounting as containment teams report memory loss and hallucinations. Specialized psi and investigation teams are required to stabilize the zone.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 20, investigation: 80, utility: 40, social: 30 },
    weights: { combat: 0.1, investigation: 0.6, utility: 0.2, social: 0.1 },
    durationWeeks: 3,
    deadlineWeeks: 2,
    tags: ['psi', 'escalation', 'tier-3'],
    requiredTags: ['psi'],
    preferredTags: ['analyst', 'forensics'],
    onFail: {
      stageDelta: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['escalation-psi-002', 'bio-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['escalation-psi-002', 'anomaly-raid-001', 'psi-004'],
    },
  },
  {
    templateId: 'ops-critical-staffing',
    title: 'Critical Staffing — Multi-Shift Response',
    description:
      'A multi-shift incident requires continuous coverage. Staffing demands are high, and teams must rotate to avoid burnout. Failure to maintain coverage increases risk of escalation and negative consequences.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 30, investigation: 50, utility: 60, social: 20 },
    weights: { combat: 0.15, investigation: 0.35, utility: 0.4, social: 0.1 },
    durationWeeks: 4,
    deadlineWeeks: 3,
    tags: ['staffing', 'critical', 'tier-3'],
    requiredTags: [],
    preferredTags: ['medic', 'utility'],
    onFail: {
      stageDelta: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-critical-staffing', 'bio-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['ops-critical-staffing', 'anomaly-raid-001'],
    },
  },
  {
    templateId: 'reward-mixed-bundle',
    title: 'Mixed Reward Bundle — Recovery Operation',
    description:
      'A recovery operation offers a mixed bundle of funding, materials, and research unlocks. Teams must balance risk and reward to maximize gains.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 15, investigation: 45, utility: 55, social: 25 },
    weights: { combat: 0.1, investigation: 0.4, utility: 0.4, social: 0.1 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['reward', 'mixed', 'tier-2'],
    requiredTags: [],
    preferredTags: ['field_recon', 'tech'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['reward-mixed-bundle'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['reward-mixed-bundle', 'ops-006'],
    },
  },
  // --- End Year 2 Expansion ---
  {
    templateId: 'chem-001',
    title: 'Containment Breach — Sector 7 Reagent Leak',
    description:
      'Pressure seals failed in Sector 7, venting classified reagents into active service corridors. ' +
      'Containment teams must isolate and neutralize before exposure cascades beyond the site.' +
      ' Atmospheric sensors are already reading critical — every hour of delay extends the evacuation perimeter.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 20, investigation: 60, utility: 70, social: 10 },
    weights: { combat: 0.1, investigation: 0.5, utility: 0.3, social: 0.1 },
    durationWeeks: 2,
    deadlineWeeks: 4,
    tags: ['chemical', 'containment', 'tier-3'],
    requiredTags: [],
    preferredTags: ['hazmat', 'forensics'],
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 1 }, spawnTemplateIds: ['bio-001'] },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 3,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['chem-001', 'ops-006'],
    },
  },
  {
    templateId: 'bio-001',
    title: 'Pathogen Trace — Archive Sub-Level 3',
    description:
      'Archive biometrics detected an unauthorized biological signature moving through Sub-Level 3. ' +
      'Source remains unclassified and is evading standard containment protocols.' +
      ' Field teams must identify, track, and isolate before it reaches populated storage levels.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 10, investigation: 70, utility: 50, social: 30 },
    weights: { combat: 0.05, investigation: 0.6, utility: 0.25, social: 0.1 },
    durationWeeks: 3,
    deadlineWeeks: 5,
    tags: ['biological', 'investigation', 'tier-3'],
    requiredTags: [],
    preferredTags: ['medic', 'lab-kit'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['chem-001', 'bio-forensics-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 4,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['bio-001', 'ops-006', 'bio-forensics-001'],
    },
  },
  {
    templateId: 'info-001',
    title: 'Classified Data Exfiltration — Node Gamma',
    description:
      'Encrypted telemetry confirms an active exfiltration pipeline routing Protocol-level data through Node Gamma. ' +
      'Origin and recipient are masked behind three relay hops.' +
      ' Intercept and collapse the pipeline before the next scheduled relay window — after that, the data is gone.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 10, investigation: 80, utility: 60, social: 40 },
    weights: { combat: 0.05, investigation: 0.55, utility: 0.3, social: 0.1 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['information', 'cyber', 'tier-3'],
    requiredTags: ['tech'],
    requiredRoles: ['technical', 'investigator'],
    preferredTags: ['hacker', 'analyst'],
    onFail: { stageDelta: 1, spawnCount: { min: 0, max: 1 }, spawnTemplateIds: ['info-001'] },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['info-001', 'cyber-raid-001', 'psi-004'],
    },
  },
  {
    templateId: 'combat-001',
    title: 'Hostile Contact — Perimeter Incursion',
    description:
      'Armed hostiles have breached the outer perimeter and are advancing on secondary access points. ' +
      'Standard deterrents have not slowed them — they know where the gaps are.' +
      ' Deploy combat-capable personnel immediately; any further delay concedes the interior.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 75, investigation: 15, utility: 30, social: 10 },
    weights: { combat: 0.7, investigation: 0.1, utility: 0.15, social: 0.05 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['combat', 'threat', 'tier-2'],
    requiredTags: [],
    preferredTags: ['hunter', 'combat'],
    onFail: { stageDelta: 1, spawnCount: { min: 1, max: 1 }, spawnTemplateIds: ['combat-001'] },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['combat-001', 'raid-001'],
    },
  },
  {
    templateId: 'escalation-001',
    title: 'Anomaly Spread — Sector 9 Contamination Wave',
    description:
      'An expanding anomalous field is consuming Sector 9; containment barriers are failing in sequence and the boundary is accelerating outward. ' +
      'The origin point shifts each time a sensor reads it.' +
      ' Dispatch investigative units to lock the source coordinates and apply countermeasures before the spread becomes irreversible.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 25, investigation: 75, utility: 55, social: 35 },
    weights: { combat: 0.1, investigation: 0.6, utility: 0.2, social: 0.1 },
    durationWeeks: 3,
    deadlineWeeks: 2,
    tags: ['anomaly', 'containment', 'tier-3'],
    requiredTags: [],
    preferredTags: ['forensics', 'analyst'],
    onFail: {
      stageDelta: 2,
      spawnCount: { min: 2, max: 2 },
      spawnTemplateIds: ['escalation-001', 'bio-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['escalation-001', 'anomaly-raid-001', 'psi-004'],
    },
  },
  {
    templateId: 'cyber-raid-001',
    title: 'Digital Cascade — Infrastructure Meltdown',
    description:
      'A coordinated attack is forcing hospital, transit, and emergency dispatch networks into synchronized failure cycles. ' +
      'Every failed reboot hands the intruder a wider control surface and shortens response windows for civilian services.' +
      ' Teams must isolate relay choke points and execute simultaneous cutovers before the cascade reaches irreversible grid collapse.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 16, investigation: 52, utility: 72, social: 24 },
    weights: { combat: 0.1, investigation: 0.35, utility: 0.4, social: 0.15 },
    durationWeeks: 4,
    deadlineWeeks: 2,
    tags: ['cyber', 'infrastructure', 'raid', 'tier-3'],
    requiredTags: ['tech'],
    preferredTags: ['hacker', 'analyst', 'field-kit'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-001', 'info-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['anomaly-raid-001', 'followup_blackout'],
    },
  },
  {
    templateId: 'anomaly-raid-001',
    title: 'Sectoral Collapse — Containment Array Failure',
    description:
      'Containment pylons are failing in alternating sectors, causing anomaly fronts to overlap and amplify each other. ' +
      'Field telemetry shows the collapse pattern is being actively steered to pin response teams out of position.' +
      ' Multi-team countermeasures must be synchronized across sectors or the failure wave will overrun the central core.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 22, investigation: 58, utility: 68, social: 18 },
    weights: { combat: 0.15, investigation: 0.35, utility: 0.4, social: 0.1 },
    durationWeeks: 4,
    deadlineWeeks: 2,
    tags: ['anomaly', 'containment', 'raid', 'tier-3'],
    requiredTags: ['tech'],
    preferredTags: ['analyst', 'hazmat', 'forensics'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['bio-001', 'ops-006'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['cyber-raid-001', 'psi-004'],
    },
  },
  {
    templateId: 'raid-001',
    title: 'Full Breach Response — Site Gamma',
    description:
      'Complete containment failure at Site Gamma — the entity has fully manifested and all automated suppression systems are offline. ' +
      'Civilian evacuation corridors are compromised; structural integrity readings are degrading by the hour.' +
      ' Multiple coordinated teams are required for simultaneous suppression, extraction, and barrier neutralization.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 60, investigation: 55, utility: 70, social: 40 },
    weights: { combat: 0.3, investigation: 0.3, utility: 0.25, social: 0.15 },
    durationWeeks: 4,
    deadlineWeeks: 3,
    tags: ['breach', 'raid', 'critical', 'tier-3'],
    requiredTags: [],
    preferredTags: ['combat', 'hazmat', 'medic'],
    raid: { minTeams: 2, maxTeams: 3 },
    onFail: { stageDelta: 2, spawnCount: { min: 0, max: 1 }, spawnTemplateIds: ['raid-001'] },
    onUnresolved: {
      stageDelta: 3,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['raid-001', 'followup_blackout'],
    },
  },

  // ── Quest templates ──────────────────────────────────────────────────────────

  {
    templateId: 'combat_vampire_nest',
    title: 'Vampire Nest in the Stockyards',
    description:
      'Disappearances cluster around condemned packing houses near the stockyards — seven in the last ten days, all within a four-block radius. ' +
      'Burn patterns and claw marks confirm a nest of at least three. ' +
      'The nest relocates at dawn; if the site is not hit by nightfall, the trail goes cold again.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 18, investigation: 4, utility: 6, social: 2 },
    weights: { combat: 0.7, investigation: 0.1, utility: 0.15, social: 0.05 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['vampire', 'nest', 'night', 'tier-1'],
    preferredTags: ['silver', 'holy'],
    raid: { minTeams: 2, maxTeams: 3 },
    onFail: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_missing_persons'],
      convertToRaidAtStage: 4,
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_missing_persons', 'followup_feeding_frenzy'],
      convertToRaidAtStage: 3,
    },
  },

  {
    templateId: 'puzzle_whispering_archive',
    title: 'The Whispering Archive',
    description:
      'The restricted sub-basement of Harrow University holds a collection of volumes that have no acquisition record and no author attribution. ' +
      'Pages rearrange overnight; staff documenting the anomaly report losing between twenty minutes and several hours with no memory of the gap. ' +
      'Three cataloguers have not returned from their last logged shift.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 4, investigation: 16, utility: 10, social: 2 },
    weights: { combat: 0.05, investigation: 0.6, utility: 0.3, social: 0.05 },
    durationWeeks: 2,
    deadlineWeeks: 1,
    tags: ['haunting', 'cognitive', 'research', 'tier-1'],
    preferredTags: ['scholar', 'tech', 'medium'],
    raid: { minTeams: 2, maxTeams: 3 },
    onFail: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_false_memories'],
      convertToRaidAtStage: 4,
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 2, max: 2 },
      spawnTemplateIds: ['followup_false_memories', 'followup_campus_outbreak'],
      convertToRaidAtStage: 3,
    },
  },

  {
    templateId: 'mixed_eclipse_ritual',
    title: 'Eclipse Ritual at the Riverfront',
    description:
      'An eclipse-timed rite is underway at a cult staging ground on the riverfront — the ceremony is already half-complete and the window is narrowing. ' +
      'Counter-ritual interference requires an occultist on-site; without one, the rite cannot be disrupted.' +
      ' If the ceremony completes, the incident fractures across multiple simultaneous sites.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 12, investigation: 10, utility: 8, social: 6 },
    weights: { combat: 0.4, investigation: 0.3, utility: 0.2, social: 0.1 },
    durationWeeks: 3,
    deadlineWeeks: 2,
    tags: ['cult', 'ritual', 'clock', 'tier-1'],
    requiredTags: ['occultist'],
    requiredRoles: ['containment', 'technical'],
    preferredTags: ['holy', 'tech', 'negotiator'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_blackout', 'followup_targeted_abductions'],
      convertToRaidAtStage: 3,
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 3, max: 4 },
      spawnTemplateIds: ['followup_blackout', 'followup_targeted_abductions'],
      convertToRaidAtStage: 2,
    },
  },

  // ── Follow-up templates spawned by quest escalation rules ────────────────────

  {
    templateId: 'followup_missing_persons',
    title: 'Missing Persons Spike',
    description:
      'Eleven civilians have disappeared in the last seventy-two hours; the only commonality is a final recorded phone ping to the same grid square. ' +
      'Locals report hearing something in the walls at night, and the precinct has stopped returning calls. ' +
      'Identify the pattern before another cluster is taken.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 6, investigation: 10, utility: 4, social: 4 },
    weights: { combat: 0.2, investigation: 0.5, utility: 0.2, social: 0.1 },
    durationWeeks: 1,
    deadlineWeeks: 2,
    tags: ['investigation', 'tier-1'],
    preferredTags: ['tech', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: ['followup_feeding_frenzy'],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_feeding_frenzy'],
    },
  },

  {
    templateId: 'followup_feeding_frenzy',
    title: 'Feeding Frenzy',
    description:
      'Bodies are surfacing across a six-block radius and civilian sightings are multiplying faster than suppression teams can manage. ' +
      'The nest has shifted to open-air feeding — containment of information is already failing.' +
      ' Multiple fast-response units are needed simultaneously; a single-team response will be overwhelmed.',
    mode: 'probability',
    kind: 'raid',
    difficulty: { combat: 18, investigation: 6, utility: 6, social: 4 },
    weights: { combat: 0.7, investigation: 0.1, utility: 0.15, social: 0.05 },
    durationWeeks: 2,
    deadlineWeeks: 1,
    tags: ['raid', 'vampire', 'tier-1'],
    preferredTags: ['holy', 'silver'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_missing_persons'],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_missing_persons'],
    },
  },

  {
    templateId: 'followup_false_memories',
    title: 'False Memories Cluster',
    description:
      'Witness accounts from the archive incident have begun overwriting each other — interviewed subjects describe events they could not have witnessed, using identical phrasing. ' +
      'Physical evidence contradicts itself between examinations.' +
      ' Establish a true sequence of events before the contamination spreads to the investigative record.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 0, investigation: 12, utility: 8, social: 8 },
    weights: { combat: 0.0, investigation: 0.5, utility: 0.2, social: 0.3 },
    durationWeeks: 1,
    deadlineWeeks: 1,
    tags: ['cognitive', 'tier-1'],
    preferredTags: ['negotiator', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 0, max: 1 },
      spawnTemplateIds: ['followup_campus_outbreak'],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_campus_outbreak'],
    },
  },

  {
    templateId: 'followup_campus_outbreak',
    title: 'Campus Outbreak',
    description:
      'The cognitive contamination from the archive has triggered simultaneous anomalous events across at least four campus buildings — fire escapes blocked, emergency lines looped, faculty and students reported unresponsive. ' +
      'No single team can cover the spread.' +
      ' A coordinated multi-team response is required before the containment window closes.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 10, investigation: 14, utility: 10, social: 6 },
    weights: { combat: 0.2, investigation: 0.4, utility: 0.3, social: 0.1 },
    durationWeeks: 2,
    deadlineWeeks: 1,
    tags: ['raid', 'tier-1'],
    preferredTags: ['tech', 'medium'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_false_memories'],
    },
    onUnresolved: {
      stageDelta: 2,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_false_memories'],
    },
  },

  {
    templateId: 'followup_blackout',
    title: 'Citywide Blackout',
    description:
      "The cult's ritual triggered a citywide grid failure; seventeen substations are offline and emergency services are routing blind. " +
      'Mass panic is building in the blackout zones and the cult is using the chaos for secondary operations.' +
      ' This is an incident-scale event — grid restoration, crowd suppression, and cult interdiction must run in parallel.',
    mode: 'deterministic',
    kind: 'raid',
    difficulty: { combat: 14, investigation: 10, utility: 14, social: 10 },
    weights: { combat: 0.25, investigation: 0.2, utility: 0.35, social: 0.2 },
    durationWeeks: 2,
    deadlineWeeks: 1,
    tags: ['raid', 'infrastructure', 'tier-1'],
    requiredTags: ['tech'],
    preferredTags: ['occultist'],
    raid: { minTeams: 3, maxTeams: 5 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_targeted_abductions'],
    },
    onUnresolved: {
      stageDelta: 1,
      spawnCount: { min: 3, max: 4 },
      spawnTemplateIds: ['followup_targeted_abductions'],
    },
  },

  {
    templateId: 'followup_targeted_abductions',
    title: 'Targeted Abductions',
    description:
      'Witnesses from the blackout incident are being taken before they can be interviewed — not killed, just moved, and their contacts are being systematically pressured into silence. ' +
      'The cult has a suppression operation running in parallel with its main activity.' +
      ' Recover the witnesses and break the information lock before the blackout narrative hardens.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 10, investigation: 10, utility: 6, social: 8 },
    weights: { combat: 0.3, investigation: 0.4, utility: 0.1, social: 0.2 },
    durationWeeks: 2,
    deadlineWeeks: 1,
    tags: ['cult', 'tier-1'],
    preferredTags: ['negotiator', 'tech'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_blackout'],
    },
    onUnresolved: {
      stageDelta: 2,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_blackout'],
    },
  },
  ...occultCaseTemplates,
  ...operationsCaseTemplates,
  ...psionicCaseTemplates,
]

function normalizeTagList(tags: string[] | undefined) {
  if (!tags) {
    return []
  }

  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

function normalizeRequiredRoles(roles: TeamCoverageRole[] | undefined) {
  if (!roles) {
    return []
  }

  return [
    ...new Set(roles.filter((role) => TEAM_COVERAGE_ROLES.includes(role)).map((role) => role)),
  ]
}

function cloneTemplate(template: CaseTemplate): CaseTemplate {
  const onFail = normalizeSpawnRule(template.onFail)
  const onUnresolved = normalizeSpawnRule(template.onUnresolved)

  return {
    ...template,
    tags: normalizeTagList(template.tags),
    requiredTags: normalizeTagList(template.requiredTags),
    requiredRoles: normalizeRequiredRoles(template.requiredRoles),
    preferredTags: normalizeTagList(template.preferredTags),
    difficulty: { ...template.difficulty },
    weights: { ...template.weights },
    raid: template.raid ? { ...template.raid } : undefined,
    onFail: {
      ...onFail,
      spawnCount: { ...onFail.spawnCount },
      spawnTemplateIds: normalizeTagList(onFail.spawnTemplateIds),
    },
    onUnresolved: {
      ...onUnresolved,
      spawnCount: { ...onUnresolved.spawnCount },
      spawnTemplateIds: normalizeTagList(onUnresolved.spawnTemplateIds),
    },
  }
}

export function getCaseTemplateCatalogErrors(templates: CaseTemplate[]) {
  const errors: string[] = []
  const byId = new Map<string, CaseTemplate>()

  for (const template of templates) {
    if (byId.has(template.templateId)) {
      errors.push(`Duplicate template id: ${template.templateId}`)
      continue
    }

    byId.set(template.templateId, template)

    if (!template.templateId.trim()) {
      errors.push('Template id cannot be blank.')
    }

    if (!template.title.trim()) {
      errors.push(`Template ${template.templateId} is missing a title.`)
    }

    if (!template.description.trim()) {
      errors.push(`Template ${template.templateId} is missing a description.`)
    }

    if (!Number.isFinite(template.durationWeeks) || template.durationWeeks < 1) {
      errors.push(`Template ${template.templateId} has invalid durationWeeks.`)
    }

    if (!Number.isFinite(template.deadlineWeeks) || template.deadlineWeeks < 1) {
      errors.push(`Template ${template.templateId} has invalid deadlineWeeks.`)
    }

    const weightValues = Object.values(template.weights)
    if (weightValues.some((value) => !Number.isFinite(value) || value < 0)) {
      errors.push(`Template ${template.templateId} has invalid weights.`)
    }
    if (weightValues.every((value) => value === 0)) {
      errors.push(`Template ${template.templateId} has zeroed weights.`)
    }

    if (Object.values(template.difficulty).some((value) => !Number.isFinite(value) || value < 0)) {
      errors.push(`Template ${template.templateId} has invalid difficulty.`)
    }

    if ((template.requiredRoles ?? []).some((role) => !TEAM_COVERAGE_ROLES.includes(role))) {
      errors.push(`Template ${template.templateId} has invalid required roles.`)
    }

    const canConvertToRaid =
      template.onFail.convertToRaidAtStage !== undefined ||
      template.onUnresolved.convertToRaidAtStage !== undefined

    if (template.kind === 'raid') {
      if (!template.raid) {
        errors.push(`Raid template ${template.templateId} is missing raid bounds.`)
      } else if (
        !Number.isFinite(template.raid.minTeams) ||
        !Number.isFinite(template.raid.maxTeams) ||
        template.raid.minTeams < 2 ||
        template.raid.maxTeams < template.raid.minTeams
      ) {
        errors.push(`Raid template ${template.templateId} has invalid raid bounds.`)
      }
    } else if (template.raid && !canConvertToRaid) {
      errors.push(`Non-raid template ${template.templateId} cannot declare raid bounds.`)
    } else if (
      template.raid &&
      (!Number.isFinite(template.raid.minTeams) ||
        !Number.isFinite(template.raid.maxTeams) ||
        template.raid.minTeams < 2 ||
        template.raid.maxTeams < template.raid.minTeams)
    ) {
      errors.push(`Raid-capable template ${template.templateId} has invalid raid bounds.`)
    }

    for (const [ruleName, rule] of [
      ['onFail', template.onFail],
      ['onUnresolved', template.onUnresolved],
    ] as const) {
      const normalizedRule = normalizeSpawnRule(rule)

      if (
        !Number.isFinite(normalizedRule.spawnCount.min) ||
        !Number.isFinite(normalizedRule.spawnCount.max) ||
        normalizedRule.spawnCount.min < 0 ||
        normalizedRule.spawnCount.max < normalizedRule.spawnCount.min
      ) {
        errors.push(`Template ${template.templateId} has invalid ${ruleName} spawnCount.`)
      }

      if (normalizedRule.spawnCount.max > 0 && normalizedRule.spawnTemplateIds.length === 0) {
        errors.push(`Template ${template.templateId} has empty ${ruleName} spawn targets.`)
      }

      if (
        normalizedRule.convertToRaidAtStage !== undefined &&
        (!Number.isFinite(normalizedRule.convertToRaidAtStage) ||
          normalizedRule.convertToRaidAtStage < 2 ||
          normalizedRule.convertToRaidAtStage > 5)
      ) {
        errors.push(`Template ${template.templateId} has invalid ${ruleName} convertToRaidAtStage.`)
      }
    }
  }

  for (const template of templates) {
    for (const [ruleName, rule] of [
      ['onFail', template.onFail],
      ['onUnresolved', template.onUnresolved],
    ] as const) {
      for (const targetId of normalizeSpawnRule(rule).spawnTemplateIds) {
        if (!byId.has(targetId)) {
          errors.push(
            `Template ${template.templateId} has unknown ${ruleName} spawn target: ${targetId}`
          )
        }
      }
    }
  }

  return errors
}

export function buildCaseTemplateCatalog(templates: CaseTemplate[]) {
  const clonedTemplates = templates.map((template) => cloneTemplate(template))
  const errors = getCaseTemplateCatalogErrors(clonedTemplates)

  if (errors.length > 0) {
    throw new Error(`Invalid case template catalog:\n${errors.join('\n')}`)
  }

  return clonedTemplates
}

export const caseTemplates: CaseTemplate[] = buildCaseTemplateCatalog(baseCaseTemplates)

export const caseTemplateMap: Record<string, CaseTemplate> = Object.fromEntries(
  caseTemplates.map((template) => [template.templateId, template])
)
