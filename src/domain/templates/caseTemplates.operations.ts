import { type CaseTemplate } from '../models'

export const operationsCaseTemplates: CaseTemplate[] = [
  {
    templateId: 'ops-001',
    title: 'Ghost Packet Relay',
    description:
      'Encrypted traffic is routing through a municipal relay that has been decommissioned for six months — no maintenance access, no registered operator, still passing packets. ' +
      'The ghost is masking something in the payload; every sync window it stays open, more gets through.' +
      ' Teams must identify the relay origin and collapse the pipeline before the next scheduled window.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 8, investigation: 18, utility: 16, social: 8 },
    weights: { combat: 0.05, investigation: 0.55, utility: 0.3, social: 0.1 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['cyber', 'relay', 'evidence', 'tier-2'],
    requiredTags: ['tech'],
    preferredTags: ['analyst', 'field-kit'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['info-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-003'],
    },
  },
  {
    templateId: 'ops-002',
    title: 'Witness Interview Cascade',
    description:
      'A routine witness interview has produced four independently gathered transcripts that contradict each other on every material point — dates, locations, and personnel all shift between sessions. ' +
      'The team must determine whether this is anomalous memory contamination or a coordinated disinformation effort, and do it before the subject becomes legally unreachable.' +
      ' Either answer leads somewhere worse than the original incident.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 4, investigation: 22, utility: 10, social: 18 },
    weights: { combat: 0.05, investigation: 0.45, utility: 0.15, social: 0.35 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['interview', 'memory', 'civilian', 'tier-2'],
    requiredTags: ['negotiator'],
    preferredTags: ['medium', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-004'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-006'],
    },
  },
  {
    templateId: 'ops-003',
    title: 'Archive Access Siege',
    description:
      'A restricted records vault has locked out all credentialed access — biometric, keycode, and override — without any logged trigger event. ' +
      'The sealed dossiers inside are scheduled for remote purge in seventy-two hours as a failsafe.' +
      ' Teams must breach the lock, recover the files, and trace why the vault sealed itself.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 6, investigation: 24, utility: 18, social: 10 },
    weights: { combat: 0.05, investigation: 0.55, utility: 0.25, social: 0.15 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['archive', 'records', 'forensics', 'tier-2'],
    requiredTags: ['investigator'],
    preferredTags: ['tech', 'forensics'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-005'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-005'],
    },
  },
  {
    templateId: 'ops-004',
    title: 'Public Safety Briefing',
    description:
      'A civic emergency briefing on the recent incident has devolved into live speculation about agency involvement and unexplained deaths. ' +
      'The attending official is off-script, a journalist has a partial source in the room, and the feed is being recorded.' +
      ' The team must guide the narrative to a stable close before the session ends — without leaving a single provable Directorate trace on record.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 2, investigation: 8, utility: 6, social: 24 },
    weights: { combat: 0.05, investigation: 0.2, utility: 0.15, social: 0.6 },
    durationWeeks: 1,
    deadlineWeeks: 2,
    tags: ['media', 'public', 'containment', 'tier-1'],
    requiredTags: ['medium'],
    preferredTags: ['negotiator', 'liaison'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-006'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-007'],
    },
  },
  {
    templateId: 'ops-005',
    title: 'Black Chamber Intercept',
    description:
      'A sub-basement chamber sealed after a prior incident is transmitting low-frequency ritual telemetry along a physical buried line that does not appear on any site blueprint. ' +
      'The signal is resonant — it strengthens each time it is monitored.' +
      ' Teams must suppress the broadcast, sever the line, and extract the source object before the chamber registers the team as part of the rite.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 10, investigation: 20, utility: 14, social: 8 },
    weights: { combat: 0.1, investigation: 0.5, utility: 0.25, social: 0.15 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['occult', 'signal', 'seal', 'tier-2'],
    requiredTags: ['occultist'],
    preferredTags: ['ritual-kit', 'medium'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['bio-001'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['raid-001'],
    },
  },
  {
    templateId: 'ops-006',
    title: 'Triage Residue Check',
    description:
      'A field triage station set up after last week’s incident is reading contamination that does not match any agent used on-site — biological, chemical, or otherwise.' +
      ' Two recovery staff have developed symptoms consistent with exposure, but decon logs show clean.' +
      ' The team must identify the residue vector and trace it to a secondary source before it migrates into the hospital recovery ward.',
    mode: 'threshold',
    kind: 'case',
    difficulty: { combat: 4, investigation: 12, utility: 16, social: 6 },
    weights: { combat: 0.05, investigation: 0.3, utility: 0.45, social: 0.2 },
    durationWeeks: 1,
    deadlineWeeks: 2,
    tags: ['triage', 'contamination', 'medical', 'tier-1'],
    requiredTags: ['medic'],
    preferredTags: ['triage', 'investigator'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['chem-001'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['bio-001', 'ops-008'],
    },
  },
  {
    templateId: 'bio-forensics-001',
    title: 'Trace Pattern Protocol — Pathogen Chain Reconstruction',
    description:
      'A cluster of secondary exposure cases has appeared with no shared location, timeline, or declared contact history. ' +
      'Forensic swabs show a matching protein trace, but triage notes indicate contradictory symptom onset windows.' +
      ' A medic-led evidence reconstruction is required to map the real transmission chain before the hidden vector seeds a wider outbreak.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 4, investigation: 42, utility: 30, social: 12 },
    weights: { combat: 0.05, investigation: 0.5, utility: 0.3, social: 0.15 },
    durationWeeks: 2,
    deadlineWeeks: 3,
    tags: ['biological', 'forensics', 'triage', 'tier-2'],
    requiredTags: ['medic'],
    preferredTags: ['investigator', 'lab-kit', 'forensics'],
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['bio-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 2,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['anomaly-raid-001', 'ops-006', 'ops-008'],
      convertToRaidAtStage: 4,
    },
  },
  {
    templateId: 'ops-007',
    title: 'Court Hearing Disruption',
    description:
      'A sealed administrative tribunal is taking testimony from three witnesses whose accounts corroborate a hostile occult network operating inside civic infrastructure. ' +
      'The network knows the hearing is happening; two of the witnesses have already received direct warnings.' +
      ' The team must keep the testimony intact, stabilize the room, and prevent the session from being disrupted or discredited before the record is filed.',
    mode: 'deterministic',
    kind: 'case',
    difficulty: { combat: 6, investigation: 14, utility: 10, social: 20 },
    weights: { combat: 0.05, investigation: 0.25, utility: 0.15, social: 0.55 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['court', 'witness', 'occult', 'tier-2'],
    requiredTags: ['negotiator'],
    preferredTags: ['medium', 'occult'],
    raid: { minTeams: 2, maxTeams: 3 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['ops-002'],
    },
    onUnresolved: {
      stageDelta: 1,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['extraction-raid-001'],
      convertToRaidAtStage: 3,
    },
  },
  {
    templateId: 'extraction-raid-001',
    title: 'Courtline Recovery — Hostile Transfer Convoy',
    description:
      'Witnesses tied to a sealed tribunal are being moved through a rolling convoy under forged federal credentials. ' +
      'If the convoy reaches jurisdictional handoff, testimony collapses and all linked investigations are procedurally dead.' +
      ' Teams must intercept multiple vehicles, recover protected witnesses, and stabilize the legal chain of custody under live opposition.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 54, investigation: 34, utility: 38, social: 30 },
    weights: { combat: 0.35, investigation: 0.2, utility: 0.25, social: 0.2 },
    durationWeeks: 3,
    deadlineWeeks: 2,
    tags: ['operations', 'extraction', 'raid', 'tier-3'],
    requiredTags: ['negotiator'],
    preferredTags: ['combat', 'medic', 'tech'],
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-002', 'combat-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-005', 'occult-006'],
    },
  },
  {
    templateId: 'ops-008',
    title: 'Cold-Chain Phantom',
    description:
      'A refrigerated municipal supply route is delivering sealed medical crates to facilities that were closed years ago. ' +
      'Every crate contains viable biological substrate with falsified lot histories, and records scrubbers are rewriting manifests in near-real time.' +
      ' Teams must identify the spoofed custody chain and lock down the active drop sites before distribution reaches public clinics.',
    mode: 'probability',
    kind: 'case',
    difficulty: { combat: 6, investigation: 26, utility: 24, social: 12 },
    weights: { combat: 0.05, investigation: 0.45, utility: 0.35, social: 0.15 },
    durationWeeks: 2,
    deadlineWeeks: 2,
    tags: ['biological', 'logistics', 'supply-chain', 'tier-2'],
    preferredTags: ['medic', 'forensics', 'lab-kit'],
    pressureValue: 7,
    regionTag: 'bio_containment',
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['bio-forensics-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-006', 'ops-009'],
    },
  },
  {
    templateId: 'ops-009',
    title: 'Evidence Warehouse Quarantine',
    description:
      'A secure evidence warehouse has gone into autonomous quarantine after chained contamination alarms across three bays. ' +
      'Critical samples tied to open cases are inside, and the internal robotics stack is treating investigators as hostile vectors.' +
      ' Multiple teams must isolate active contamination lanes, recover priority evidence, and re-establish admissible chain-of-custody before the vault purge cycle triggers.',
    mode: 'threshold',
    kind: 'raid',
    difficulty: { combat: 42, investigation: 52, utility: 48, social: 20 },
    weights: { combat: 0.2, investigation: 0.35, utility: 0.3, social: 0.15 },
    durationWeeks: 3,
    deadlineWeeks: 2,
    tags: ['operations', 'forensics', 'raid', 'tier-3'],
    requiredRoles: ['investigator'],
    preferredTags: ['field-kit', 'tech', 'medic'],
    pressureValue: 11,
    regionTag: 'bio_containment',
    raid: { minTeams: 2, maxTeams: 4 },
    onFail: {
      stageDelta: 1,
      spawnCount: { min: 1, max: 2 },
      spawnTemplateIds: ['ops-003', 'bio-001'],
    },
    onUnresolved: {
      stageDelta: 2,
      deadlineResetWeeks: 1,
      spawnCount: { min: 1, max: 1 },
      spawnTemplateIds: ['anomaly-raid-001'],
    },
  },
]
