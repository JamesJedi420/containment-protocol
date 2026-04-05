import type { CaseInstance, StatBlock } from './models'

export type MajorIncidentArchetypeId =
  | 'possession_outbreak'
  | 'dimensional_breach'
  | 'coordinated_cult_operation'
  | 'anomaly_storm'
  | 'containment_cascade'

export interface MajorIncidentModifier {
  id: string
  label: string
  detail: string
}

export interface MajorIncidentSpecialMechanic {
  id: string
  label: string
  detail: string
}

export interface MajorIncidentBossEntity {
  id: string
  name: string
  threatLabel: string
  detail: string
}

export interface MajorIncidentStageDefinition {
  index: number
  label: string
  minimumScale: number
  difficultyMultiplier: number
  difficultyPressure: Partial<StatBlock>
  recommendedTeams: number
  enforcedRaidTeamFloor: number
  modifiers: MajorIncidentModifier[]
  specialMechanics: MajorIncidentSpecialMechanic[]
  bossEntity?: MajorIncidentBossEntity
}

export interface MajorIncidentProgressionEntry {
  index: number
  label: string
  minimumScale: number
  status: 'cleared' | 'active' | 'locked'
}

export interface MajorIncidentProfile {
  caseId: string
  caseTitle: string
  archetypeId: MajorIncidentArchetypeId
  archetypeLabel: string
  incidentScale: number
  currentStageIndex: number
  currentStage: MajorIncidentStageDefinition
  stages: MajorIncidentStageDefinition[]
  progression: MajorIncidentProgressionEntry[]
  recommendedTeams: number
  effectiveDifficultyMultiplier: number
  bossEntity?: MajorIncidentBossEntity
  effectiveCase: CaseInstance
}

interface MajorIncidentArchetypeDefinition {
  id: MajorIncidentArchetypeId
  label: string
  tags: readonly string[]
  stages: readonly MajorIncidentStageDefinition[]
}

const EMPTY_DIFFICULTY_PRESSURE: StatBlock = {
  combat: 0,
  investigation: 0,
  utility: 0,
  social: 0,
}

const MAJOR_INCIDENT_ARCHETYPES: readonly MajorIncidentArchetypeDefinition[] = [
  {
    id: 'possession_outbreak',
    label: 'Possession outbreak',
    tags: ['possession', 'medium', 'spirit', 'haunt', 'haunting'],
    stages: [
      {
        index: 1,
        label: 'Localized spread',
        minimumScale: 3,
        difficultyMultiplier: 1.12,
        difficultyPressure: { utility: 8, social: 6 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 1,
        modifiers: [
          {
            id: 'civilian-panic',
            label: 'Civilian panic',
            detail: 'Witness handling and public-order pressure tax social and support coverage.',
          },
          {
            id: 'unstable-vessels',
            label: 'Unstable vessels',
            detail:
              'Containment control checks become less forgiving as hosts shift unpredictably.',
          },
        ],
        specialMechanics: [
          {
            id: 'quarantine-rings',
            label: 'Quarantine rings',
            detail: 'Field teams must split effort between containment lines and incident cores.',
          },
        ],
      },
      {
        index: 2,
        label: 'District seizure',
        minimumScale: 4,
        difficultyMultiplier: 1.26,
        difficultyPressure: { combat: 6, investigation: 4, utility: 12, social: 10 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 2,
        modifiers: [
          {
            id: 'chain-contagion',
            label: 'Chain contagion',
            detail: 'Every unresolved pressure point risks spawning another active host cluster.',
          },
          {
            id: 'communications-blackout',
            label: 'Communications blackout',
            detail: 'Civil panic and occult interference degrade command flow and witness triage.',
          },
        ],
        specialMechanics: [
          {
            id: 'dual-front',
            label: 'Dual-front incident',
            detail:
              'Containment teams must suppress spread while investigation teams isolate the source.',
          },
        ],
      },
      {
        index: 3,
        label: 'City-wide outbreak',
        minimumScale: 5,
        difficultyMultiplier: 1.42,
        difficultyPressure: { combat: 10, investigation: 6, utility: 16, social: 12 },
        recommendedTeams: 3,
        enforcedRaidTeamFloor: 3,
        modifiers: [
          {
            id: 'mass-psychic-noise',
            label: 'Mass psychic noise',
            detail:
              'Anomaly stress spikes across the theatre and compresses the safe operating window.',
          },
          {
            id: 'ruptured-cordon',
            label: 'Ruptured cordon',
            detail:
              'Existing perimeter plans no longer hold and teams must re-establish control under pressure.',
          },
        ],
        specialMechanics: [
          {
            id: 'anchor-host',
            label: 'Anchor host',
            detail:
              'The outbreak only collapses once the anchor possession is isolated and suppressed.',
          },
        ],
        bossEntity: {
          id: 'choir-vessel',
          name: 'Choir Vessel',
          threatLabel: 'Mass-possession nexus',
          detail: 'A synchronized host network amplifying the outbreak across multiple districts.',
        },
      },
    ],
  },
  {
    id: 'dimensional_breach',
    label: 'Dimensional breach',
    tags: ['breach', 'perimeter', 'containment', 'rift', 'classified', 'infrastructure'],
    stages: [
      {
        index: 1,
        label: 'Localized rupture',
        minimumScale: 3,
        difficultyMultiplier: 1.15,
        difficultyPressure: { combat: 6, utility: 10, investigation: 4 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 1,
        modifiers: [
          {
            id: 'geometry-instability',
            label: 'Geometry instability',
            detail: 'Containment procedures and field movement become harder to execute cleanly.',
          },
          {
            id: 'signal-distortion',
            label: 'Signal distortion',
            detail: 'Recon and technical support degrade as the breach destabilizes equipment.',
          },
        ],
        specialMechanics: [
          {
            id: 'stabilization-window',
            label: 'Stabilization window',
            detail: 'Each stage demands tight containment timing before the rupture widens again.',
          },
        ],
      },
      {
        index: 2,
        label: 'Open corridor',
        minimumScale: 4,
        difficultyMultiplier: 1.3,
        difficultyPressure: { combat: 10, investigation: 6, utility: 14, social: 2 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 2,
        modifiers: [
          {
            id: 'cross-over-incursions',
            label: 'Cross-over incursions',
            detail: 'Hostile entities emerge during containment, raising field pressure sharply.',
          },
          {
            id: 'hazardous-backwash',
            label: 'Hazardous backwash',
            detail:
              'Exposure and equipment degradation increase the cost of each containment pass.',
          },
        ],
        specialMechanics: [
          {
            id: 'anchor-node-grid',
            label: 'Anchor node grid',
            detail:
              'Support teams must maintain synchronized anchor points to keep the corridor from widening.',
          },
        ],
      },
      {
        index: 3,
        label: 'Regional fracture',
        minimumScale: 5,
        difficultyMultiplier: 1.48,
        difficultyPressure: { combat: 14, investigation: 8, utility: 18, social: 4 },
        recommendedTeams: 3,
        enforcedRaidTeamFloor: 3,
        modifiers: [
          {
            id: 'perimeter-collapse',
            label: 'Perimeter collapse',
            detail:
              'Site control is no longer local; multiple breach fronts must be managed at once.',
          },
          {
            id: 'reality-shear',
            label: 'Reality shear',
            detail:
              'Containment and anomaly-handling demands spike as the environment destabilizes.',
          },
        ],
        specialMechanics: [
          {
            id: 'fracture-heart',
            label: 'Fracture heart',
            detail: 'The incident does not end until the core breach emitter is neutralized.',
          },
        ],
        bossEntity: {
          id: 'threshold-archon',
          name: 'Threshold Archon',
          threatLabel: 'Breach sovereign',
          detail:
            'A stabilizing intelligence holding the fracture open and coordinating incursions.',
        },
      },
    ],
  },
  {
    id: 'coordinated_cult_operation',
    label: 'Coordinated cult operation',
    tags: ['cult', 'ritual', 'occult', 'seal', 'holy', 'archive'],
    stages: [
      {
        index: 1,
        label: 'Distributed cells',
        minimumScale: 3,
        difficultyMultiplier: 1.1,
        difficultyPressure: { investigation: 10, utility: 6, social: 6 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 1,
        modifiers: [
          {
            id: 'counter-intel',
            label: 'Counter-intel screen',
            detail: 'Witnesses and records are deliberately polluted to slow investigation.',
          },
          {
            id: 'ritual-redundancy',
            label: 'Ritual redundancy',
            detail: 'Multiple fallback ritual sites force teams to split attention.',
          },
        ],
        specialMechanics: [
          {
            id: 'cell-rollup',
            label: 'Cell roll-up',
            detail:
              'Investigation gains matter because incomplete roll-ups leave active cells behind.',
          },
        ],
      },
      {
        index: 2,
        label: 'Coordinated rite',
        minimumScale: 4,
        difficultyMultiplier: 1.24,
        difficultyPressure: { combat: 6, investigation: 12, utility: 10, social: 8 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 2,
        modifiers: [
          {
            id: 'inside-access',
            label: 'Inside access',
            detail:
              'Institutional compromise expands the cult’s operating surface and slows suppression.',
          },
          {
            id: 'sacrificial-clock',
            label: 'Sacrificial clock',
            detail: 'Deadline pressure accelerates as ritual windows tighten.',
          },
        ],
        specialMechanics: [
          {
            id: 'parallel-sites',
            label: 'Parallel ritual sites',
            detail:
              'Containment and investigation teams must operate across multiple synchronized locations.',
          },
        ],
      },
      {
        index: 3,
        label: 'Ascension event',
        minimumScale: 5,
        difficultyMultiplier: 1.38,
        difficultyPressure: { combat: 10, investigation: 14, utility: 12, social: 10 },
        recommendedTeams: 3,
        enforcedRaidTeamFloor: 3,
        modifiers: [
          {
            id: 'mass-recruitment',
            label: 'Mass recruitment',
            detail:
              'Civilians and insiders are actively weaponized as shields and force multipliers.',
          },
          {
            id: 'ritual-feedback',
            label: 'Ritual feedback',
            detail: 'Anomaly handling becomes far more volatile as the rite nears completion.',
          },
        ],
        specialMechanics: [
          {
            id: 'keystone-ritual',
            label: 'Keystone ritual',
            detail:
              'The incident only breaks once the keystone rite is identified and interrupted.',
          },
        ],
        bossEntity: {
          id: 'hierophant-prime',
          name: 'Hierophant Prime',
          threatLabel: 'Cult command node',
          detail:
            'The orchestrator binding disparate cells into a single ritual command structure.',
        },
      },
    ],
  },
  {
    id: 'anomaly_storm',
    label: 'Anomaly storm',
    tags: ['anomaly', 'signal', 'relay', 'psionic', 'cyber', 'weather'],
    stages: [
      {
        index: 1,
        label: 'Localized anomaly front',
        minimumScale: 3,
        difficultyMultiplier: 1.12,
        difficultyPressure: { investigation: 6, utility: 10, social: 4 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 1,
        modifiers: [
          {
            id: 'sensor-saturation',
            label: 'Sensor saturation',
            detail: 'Recon fidelity drops as interference washes over surveillance and relay gear.',
          },
          {
            id: 'field-instability',
            label: 'Field instability',
            detail: 'Containment baselines shift mid-operation and punish static plans.',
          },
        ],
        specialMechanics: [
          {
            id: 'moving-front',
            label: 'Moving front',
            detail:
              'The active hazard migrates across the map, stressing coordination and support lanes.',
          },
        ],
      },
      {
        index: 2,
        label: 'Regional surge',
        minimumScale: 4,
        difficultyMultiplier: 1.26,
        difficultyPressure: { combat: 4, investigation: 8, utility: 14, social: 4 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 2,
        modifiers: [
          {
            id: 'communication-falloff',
            label: 'Communication falloff',
            detail: 'Support coordination and response timing become materially worse.',
          },
          {
            id: 'repeating-flares',
            label: 'Repeating flares',
            detail: 'Multiple anomaly spikes must be contained before the front can be stabilized.',
          },
        ],
        specialMechanics: [
          {
            id: 'relay-network',
            label: 'Relay network',
            detail:
              'Technical coverage matters more because relay collapse magnifies every other demand.',
          },
        ],
      },
      {
        index: 3,
        label: 'Anomaly stormfront',
        minimumScale: 5,
        difficultyMultiplier: 1.4,
        difficultyPressure: { combat: 8, investigation: 10, utility: 18, social: 6 },
        recommendedTeams: 3,
        enforcedRaidTeamFloor: 3,
        modifiers: [
          {
            id: 'citywide-interference',
            label: 'Citywide interference',
            detail:
              'Support systems, perimeter sensors, and civilian channels all degrade together.',
          },
          {
            id: 'exposure-wave',
            label: 'Exposure wave',
            detail:
              'Stress and anomaly-handling pressure rise as the storm rolls across multiple sectors.',
          },
        ],
        specialMechanics: [
          {
            id: 'storm-eye',
            label: 'Storm eye',
            detail:
              'The front only breaks when the central anomaly well is identified and collapsed.',
          },
        ],
        bossEntity: {
          id: 'tempest-core',
          name: 'Tempest Core',
          threatLabel: 'Anomaly storm nexus',
          detail: 'A roving supernatural core sustaining the storm and warping local reality.',
        },
      },
    ],
  },
  {
    id: 'containment_cascade',
    label: 'Containment cascade',
    tags: [],
    stages: [
      {
        index: 1,
        label: 'Localized cascade',
        minimumScale: 3,
        difficultyMultiplier: 1.1,
        difficultyPressure: { combat: 6, investigation: 4, utility: 8, social: 2 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 1,
        modifiers: [
          {
            id: 'overloaded-perimeter',
            label: 'Overloaded perimeter',
            detail:
              'Containment infrastructure is stretched thin and reduces safe operating margin.',
          },
        ],
        specialMechanics: [
          {
            id: 'secondary-breaches',
            label: 'Secondary breaches',
            detail: 'Suppressing one failure point can still leave adjacent systems unstable.',
          },
        ],
      },
      {
        index: 2,
        label: 'Regional cascade',
        minimumScale: 4,
        difficultyMultiplier: 1.22,
        difficultyPressure: { combat: 8, investigation: 6, utility: 12, social: 4 },
        recommendedTeams: 2,
        enforcedRaidTeamFloor: 2,
        modifiers: [
          {
            id: 'support-overstretch',
            label: 'Support overstretch',
            detail:
              'Logistics and specialist support become bottlenecks across several fronts at once.',
          },
        ],
        specialMechanics: [
          {
            id: 'compound-failure',
            label: 'Compound failure',
            detail:
              'Resolution pressure compounds because each unresolved front amplifies the others.',
          },
        ],
      },
      {
        index: 3,
        label: 'Systemic collapse',
        minimumScale: 5,
        difficultyMultiplier: 1.34,
        difficultyPressure: { combat: 10, investigation: 8, utility: 14, social: 6 },
        recommendedTeams: 3,
        enforcedRaidTeamFloor: 3,
        modifiers: [
          {
            id: 'command-fracture',
            label: 'Command fracture',
            detail:
              'Operational overhead rises because multiple incident layers now compete for control.',
          },
        ],
        specialMechanics: [
          {
            id: 'central-failure-node',
            label: 'Central failure node',
            detail: 'The incident only stabilizes once the root failure pattern is contained.',
          },
        ],
        bossEntity: {
          id: 'cascade-prime',
          name: 'Cascade Prime',
          threatLabel: 'Failure orchestrator',
          detail:
            'A central anomaly or hostile node turning local failures into a regional collapse.',
        },
      },
    ],
  },
] as const

function getCaseTagSet(currentCase: CaseInstance) {
  return new Set([...currentCase.tags, ...currentCase.requiredTags, ...currentCase.preferredTags])
}

function getIncidentScale(currentCase: CaseInstance) {
  return currentCase.kind === 'raid' ? currentCase.stage + 2 : currentCase.stage
}

function isEligibleMajorIncidentScale(currentCase: CaseInstance) {
  return (
    currentCase.kind === 'raid' ||
    currentCase.stage >= 4 ||
    (currentCase.stage >= 3 && currentCase.deadlineRemaining <= 1)
  )
}

function getArchetypeDefinition(currentCase: CaseInstance) {
  const tagSet = getCaseTagSet(currentCase)

  return (
    MAJOR_INCIDENT_ARCHETYPES.find((archetype) => archetype.tags.some((tag) => tagSet.has(tag))) ??
    MAJOR_INCIDENT_ARCHETYPES[MAJOR_INCIDENT_ARCHETYPES.length - 1]
  )
}

function getCurrentStageDefinition(
  stages: readonly MajorIncidentStageDefinition[],
  incidentScale: number
) {
  return [...stages].reverse().find((stage) => incidentScale >= stage.minimumScale) ?? stages[0]
}

function createProgression(
  stages: readonly MajorIncidentStageDefinition[],
  currentStageIndex: number
): MajorIncidentProgressionEntry[] {
  return stages.map((stage) => ({
    index: stage.index,
    label: stage.label,
    minimumScale: stage.minimumScale,
    status:
      stage.index < currentStageIndex
        ? 'cleared'
        : stage.index === currentStageIndex
          ? 'active'
          : 'locked',
  }))
}

function scaleDifficulty(
  currentCase: CaseInstance,
  stage: MajorIncidentStageDefinition
): CaseInstance['difficulty'] {
  return {
    combat: Number(
      (
        currentCase.difficulty.combat * stage.difficultyMultiplier +
        (stage.difficultyPressure.combat ?? 0)
      ).toFixed(2)
    ),
    investigation: Number(
      (
        currentCase.difficulty.investigation * stage.difficultyMultiplier +
        (stage.difficultyPressure.investigation ?? 0)
      ).toFixed(2)
    ),
    utility: Number(
      (
        currentCase.difficulty.utility * stage.difficultyMultiplier +
        (stage.difficultyPressure.utility ?? 0)
      ).toFixed(2)
    ),
    social: Number(
      (
        currentCase.difficulty.social * stage.difficultyMultiplier +
        (stage.difficultyPressure.social ?? 0)
      ).toFixed(2)
    ),
  }
}

export function isMajorIncidentCase(currentCase: CaseInstance) {
  return isEligibleMajorIncidentScale(currentCase)
}

export function buildMajorIncidentProfile(currentCase: CaseInstance): MajorIncidentProfile | null {
  if (!isMajorIncidentCase(currentCase)) {
    return null
  }

  const archetype = getArchetypeDefinition(currentCase)
  const incidentScale = getIncidentScale(currentCase)
  const currentStage = getCurrentStageDefinition(archetype.stages, incidentScale)
  const effectiveRaid =
    currentCase.kind === 'raid'
      ? {
          minTeams: Math.min(
            currentCase.raid?.maxTeams ?? currentStage.enforcedRaidTeamFloor,
            Math.max(currentCase.raid?.minTeams ?? 2, currentStage.enforcedRaidTeamFloor)
          ),
          maxTeams: currentCase.raid?.maxTeams ?? currentStage.recommendedTeams,
        }
      : currentCase.raid

  const effectiveCase: CaseInstance = {
    ...currentCase,
    difficulty: scaleDifficulty(currentCase, currentStage),
    raid: effectiveRaid,
  }

  return {
    caseId: currentCase.id,
    caseTitle: currentCase.title,
    archetypeId: archetype.id,
    archetypeLabel: archetype.label,
    incidentScale,
    currentStageIndex: currentStage.index,
    currentStage,
    stages: [...archetype.stages],
    progression: createProgression(archetype.stages, currentStage.index),
    recommendedTeams: Math.max(currentStage.recommendedTeams, effectiveRaid?.minTeams ?? 1),
    effectiveDifficultyMultiplier: currentStage.difficultyMultiplier,
    bossEntity: currentStage.bossEntity,
    effectiveCase,
  }
}

export function buildMajorIncidentOperationalCase(currentCase: CaseInstance) {
  return buildMajorIncidentProfile(currentCase)?.effectiveCase ?? currentCase
}

export function getMajorIncidentDifficultyPressure(currentCase: CaseInstance): Partial<StatBlock> {
  return (
    buildMajorIncidentProfile(currentCase)?.currentStage.difficultyPressure ??
    EMPTY_DIFFICULTY_PRESSURE
  )
}
