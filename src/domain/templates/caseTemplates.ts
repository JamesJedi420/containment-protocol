// cspell:words cataloguers cutovers exfiltration psionic
import {
  buildConcealmentActivationTriggersFromAuthored,
  type AuthoredConcealmentActivationTrigger,
} from '../hiddenStateActivationAuthoring'
import {
  buildInfiltrationCoverProfileFromAuthored,
  type AuthoredInfiltrationCoverProfile,
} from '../infiltrationCoverAuthoring'
import {
  buildInfiltrationProbePlanFromAuthored,
  type AuthoredInfiltrationProbePlan,
} from '../infiltrationProbeAuthoring'
import { CONCEALMENT_ACTIVATION_TAGS } from '../hiddenStateActivation'
import { getStealthLeaveBehindById, DEFAULT_STEALTH_LEAVE_BEHIND_REGISTRY } from '../stealthLeaveBehindRegistry'
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
    concealmentTriggers: [
      {
        id: 'trigger:info-001-relay-infiltration',
        mode: 'hidden',
        when: { allTags: ['information', 'cyber'] },
      },
    ],
    infiltrationProbePlan: {
      defaultAction: 'probe_route',
      actionWhenProbeProgressBelow: [{ belowProbeProgress: 0.5, action: 'probe_access' }],
    },
    infiltrationCoverProfile: {
      claimedRole: 'courier',
      documentTier: 2,
      doctrineBand: 0.65,
    },
    stealthLeaveBehindId: 'leave-behind:burn-tool',
    requiredTags: ['tech'],
    requiredRoles: ['technical', 'investigator'],
    preferredTags: ['hacker', 'analyst', 'covert', 'infiltration'],
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

  // ── Case templates ────────────────────────────────────────────────────────

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
    concealmentTriggers: [
      {
        id: 'trigger:combat-vampire-night-stalk',
        mode: 'hidden',
        when: { anyTag: ['vampire', 'night'] },
      },
    ],
    infiltrationProbePlan: {
      defaultAction: 'probe_route',
      actionWhenProbeProgressBelow: [{ belowProbeProgress: 0.5, action: 'probe_access' }],
    },
    infiltrationCoverProfile: {
      claimedRole: 'maintenance',
      documentTier: 0,
      doctrineBand: 0.35,
    },
    stealthLeaveBehindId: 'leave-behind:risk-discovery',
    preferredTags: ['silver', 'holy', 'stealth', 'covert'],
    raid: { minTeams: 2, maxTeams: 3 },
    // Surviving nest members relocate when the team cannot fully secure the site.
    onPartial: { stageDelta: 1 },
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
    concealmentTriggers: [
      {
        id: 'trigger:puzzle-archive-basement-infiltration',
        mode: 'hidden',
        when: { anyTag: ['haunting', 'research'] },
      },
    ],
    infiltrationProbePlan: {
      defaultAction: 'probe_access',
      actionWhenProbeProgressBelow: [{ belowProbeProgress: 0.35, action: 'probe_route' }],
    },
    infiltrationCoverProfile: {
      claimedRole: 'maintenance',
      documentTier: 1,
      doctrineBand: 0.5,
    },
    stealthLeaveBehindId: 'leave-behind:leave-trace',
    preferredTags: ['scholar', 'tech', 'medium', 'infiltration', 'stealth'],
    raid: { minTeams: 2, maxTeams: 3 },
    // Incomplete cataloguing leaves work open without undoing the team's progress.
    onPartial: { stageDelta: 0 },
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
    concealmentTriggers: [
      {
        id: 'trigger:mixed-eclipse-riverfront-approach',
        mode: 'hidden',
        when: { allTags: ['cult', 'ritual'] },
      },
    ],
    infiltrationProbePlan: {
      defaultAction: 'probe_route',
      actionWhenProbeProgressBelow: [{ belowProbeProgress: 0.5, action: 'probe_access' }],
    },
    infiltrationCoverProfile: {
      claimedRole: 'cultist',
      documentTier: 1,
      doctrineBand: 0.4,
    },
    stealthLeaveBehindId: 'leave-behind:risk-discovery',
    preferredTags: ['occult', 'ritual', 'holy', 'stealth'],
    raid: { minTeams: 2, maxTeams: 3 },
    onPartial: { stageDelta: 1 },
    onFail: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_cult_resurgence'],
      convertToRaidAtStage: 4,
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 2, max: 3 },
      spawnTemplateIds: ['followup_cult_resurgence', 'followup_eclipse_aftermath'],
      convertToRaidAtStage: 3,
    },
  },

  // ── End Case templates ─────────────────────────────────────────────────────

  ... // truncated for brevity in this example; full content from file will be used in actual call
