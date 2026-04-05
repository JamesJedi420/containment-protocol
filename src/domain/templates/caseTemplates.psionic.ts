import { type CaseTemplate } from '../models'

export const psionicCaseTemplates: CaseTemplate[] = [
  {
    templateId: 'psi-001',
    title: 'Precognitive Bleed — Event Horizon',
    description:
      'Twelve civilians in a three-block radius are experiencing vivid, consistent trauma responses to an event that has not yet occurred. ' +
      'The bleed is strengthening day over day; two subjects have already acted on what they saw, with casualties.' +
      ' A medium must anchor the projection and identify the originating source before the event-trauma loop closes.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 8, investigation: 28, utility: 16, social: 20 },
    weights: { combat: 0.05, investigation: 0.5, utility: 0.2, social: 0.25 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['psionic', 'precognition', 'tier-2'],
    requiredTags: ['medium'],
    preferredTags: ['analyst', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-002'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['psi-002', 'followup_psi_aftermath'],
    },
  },
  {
    templateId: 'psi-002',
    title: 'Compulsion Network — The Caller',
    description:
      'Approximately forty civilians across a six-block grid are moving in coordinated patterns with no conscious awareness of doing so. ' +
      'Traffic cams confirm they are converging on the same location every ninety minutes before dispersing.' +
      ' The originating signal is a person — an unwitting psionic amplifier — and the team must locate and isolate the caller before the convergence events escalate.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 14, investigation: 22, utility: 12, social: 18 },
    weights: { combat: 0.15, investigation: 0.45, utility: 0.15, social: 0.25 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['psionic', 'compulsion', 'tier-2'],
    requiredTags: ['investigator'],
    preferredTags: ['medium', 'tech', 'negotiator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-004'],
    },
  },
  {
    templateId: 'psi-003',
    title: 'Memory Excision — The Redacted Subject',
    description:
      'A high-value witness is losing specific memories in real time — not degrading, but surgically removed, event by event, in reverse chronological order. ' +
      'Lab analysis confirms no chemical vector; the excision is psionic and active, meaning the source is still present or nearby.' +
      " The team must protect what remains of the subject's testimony and trace the excision back to its operator before the record is entirely blank.",
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 6, investigation: 26, utility: 14, social: 18 },
    weights: { combat: 0.05, investigation: 0.5, utility: 0.2, social: 0.25 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['psionic', 'memory', 'tier-2'],
    requiredTags: ['negotiator'],
    preferredTags: ['medium', 'investigator', 'analyst'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['followup_psi_aftermath', 'ops-002', 'psi-007'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-002', 'psi-006', 'psi-occ-001'],
    },
  },
  {
    templateId: 'psi-occ-001',
    title: 'Haunted Collective — Ritual Resonance',
    description:
      'A vigil circle has become a shared cognitive field where participants transmit the same liturgical fragments in perfect unison. ' +
      'The resonance is both psionic and ritual in origin, and each failed interruption attempt strengthens the group lock.' +
      ' Teams must split focus between symbolic disruption and witness stabilization before the collective tips into a raid-scale compulsion event.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 12, investigation: 40, utility: 24, social: 28 },
    weights: { combat: 0.1, investigation: 0.4, utility: 0.2, social: 0.3 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['psionic', 'occult', 'hybrid', 'tier-2'],
    requiredTags: ['medium', 'scholar'],
    preferredTags: ['ritual-kit', 'investigator', 'tech'],
    raid: { minTeams: 2, maxTeams: 3 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['psi-004', 'occult-004'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['occult-007', 'psi-005'],
      convertToRaidAtStage: 4,
    },
  },
  {
    templateId: 'psi-006',
    title: 'Mnemonic Reliquary Drift',
    description:
      'A museum reliquary has begun projecting fragmentary memories into bystanders, who then act out rituals tied to people they have never met. ' +
      'The memory stream appears curated, not random, and references a sealed Directorate operation that should be inaccessible.' +
      ' Teams must decode the narrative chain and anchor the reliquary field before it synchronizes with a larger psionic carrier.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 8, investigation: 30, utility: 18, social: 20 },
    weights: { combat: 0.05, investigation: 0.5, utility: 0.25, social: 0.2 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['psionic', 'reliquary', 'memory', 'tier-2'],
    requiredTags: ['scholar'],
    preferredTags: ['medium', 'analyst', 'tech'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-004'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-005'],
      convertToRaidAtStage: 4,
    },
  },
  {
    templateId: 'psi-004',
    title: 'Psionic Amplifier Site — Station Null',
    description:
      'An abandoned broadcast station is emitting a psionic carrier wave that magnifies ambient emotional states within a half-mile radius to dangerous intensity.' +
      ' Directorate logs confirm it was decommissioned after a prior incident — someone has reactivated it deliberately.' +
      ' Teams must neutralize the amplifier array and secure the station before the wave saturates the surrounding residential zones.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 20, investigation: 30, utility: 28, social: 22 },
    weights: { combat: 0.2, investigation: 0.35, utility: 0.3, social: 0.15 },
    durationWeeks: 3,
    deadlineWeeks: 3,
    tags: ['psionic', 'amplifier', 'tier-2'],
    requiredTags: ['medium'],
    preferredTags: ['tech', 'analyst', 'field-kit'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-002'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-005'],
      convertToRaidAtStage: 4,
    },
  },
  {
    templateId: 'psi-005',
    title: 'Cascade Resonance — City Block Zero',
    description:
      'Station Null has gone critical: simultaneous psionic events are active across an entire city block, each reinforcing the others in a feedback loop.' +
      ' Affected civilians are non-responsive; field agents entering the zone without psionic shielding are being absorbed into the resonance within minutes.' +
      ' Multiple coordinated teams are required to sever the resonance nodes simultaneously — sequential attempts will only strengthen the remaining nodes.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 30, investigation: 40, utility: 36, social: 32 },
    weights: { combat: 0.2, investigation: 0.35, utility: 0.25, social: 0.2 },
    durationWeeks: 4,
    deadlineWeeks: 2,
    tags: ['psionic', 'resonance', 'raid', 'critical', 'tier-3'],
    requiredTags: ['medium'],
    preferredTags: ['tech', 'holy', 'analyst'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-004'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['raid-001'],
    },
  },

  // ── Follow-up: spawned after psionic events ───────────────────────────────────

  {
    templateId: 'followup_psi_aftermath',
    title: 'Psychic Residue Sweep',
    description:
      'After a psionic event, the affected site is registering residual cognitive contamination \u2014 personnel entering the zone report intrusive foreign thoughts and lose short-term recall within the hour.' +
      ' The residue is passive but will persist and strengthen if not cleared.' +
      ' A methodical sweep team must map the contamination boundary and neutralize each pocket before it seeds a new bleed.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 4, investigation: 14, utility: 12, social: 8 },
    weights: { combat: 0.05, investigation: 0.45, utility: 0.35, social: 0.15 },
    durationWeeks: 1,
    deadlineWeeks: 2,
    tags: ['psionic', 'aftermath', 'tier-1'],
    preferredTags: ['medium', 'tech', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-001'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-001'],
    },
  },
  {
    templateId: 'psi-007',
    title: 'Oneiric Exchange Floor',
    description:
      'A late-hours commodities floor is experiencing synchronized dream-state episodes while traders remain conscious and active. ' +
      'Participants begin executing coordinated transactions they cannot later recall, and each cycle triggers cascading panic in connected markets.' +
      ' Teams must isolate the psionic carrier signal and de-escalate floor behavior before the exchange locks into a sustained compulsion market event.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 8, investigation: 24, utility: 18, social: 30 },
    weights: { combat: 0.05, investigation: 0.4, utility: 0.2, social: 0.35 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['psionic', 'market', 'compulsion', 'tier-2'],
    requiredTags: ['negotiator'],
    preferredTags: ['medium', 'analyst'],
    pressureValue: 9,
    regionTag: 'occult_district',
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-003'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['psi-005'],
    },
  },
]
