import type { AgentRole } from '../../domain/agent/models'
import type { CrossRoleActionParticipant } from '../../domain/crossRoleActionProcedure'
import {
  BINDING_SIGIL,
  PROCEDURE_DEFINITION_SCHEMA_VERSION,
  type ProcedureDefinition,
} from '../../domain/procedureDefinition'
import type { ProcedureExecutionPrerequisiteDecision } from '../../domain/procedureToActionAdapter'

function makeParticipant(
  agentId: string,
  role: AgentRole,
  itemTags: readonly string[] = []
): CrossRoleActionParticipant {
  return {
    agentId,
    role,
    statDomains: {},
    itemTags,
  }
}

function satisfied(
  prerequisiteClass: ProcedureExecutionPrerequisiteDecision['prerequisiteClass'],
  ownerRef: string
): ProcedureExecutionPrerequisiteDecision {
  return {
    prerequisiteClass,
    ownerRef,
    state: 'satisfied',
    reason: 'verified',
  }
}

const DEFAULT_DECISIONS: readonly ProcedureExecutionPrerequisiteDecision[] = [
  satisfied('knowledge_readiness', 'SPE-58'),
  satisfied('authorization', 'SPE-2078'),
  satisfied('competency', 'SPE-1059'),
  satisfied('compatibility_equipment', 'SPE-714'),
  satisfied('facility_environment', 'SPE-1896'),
  satisfied('operating_doctrine', 'SPE-874'),
  satisfied('procedure_exhaustion', 'SPE-3308'),
  satisfied('subject_fit', 'SPE-1907'),
]

export function buildCanonicalProcedureAdapterFixture(input: {
  readonly procedureId: string
  readonly canonicalName: string
  readonly executionKey: string
  readonly includeEnvironmentalConditions?: boolean
  readonly prerequisiteDecisions?: readonly ProcedureExecutionPrerequisiteDecision[]
}): {
  definition: ProcedureDefinition
  eligibleRoles: readonly ['investigator', 'field_recon']
  requiredParticipantCount: number
  participants: readonly CrossRoleActionParticipant[]
  requiredPrerequisites: readonly {
    prerequisiteClass: ProcedureExecutionPrerequisiteDecision['prerequisiteClass']
    ownerRef: string
  }[]
  prerequisiteDecisions: readonly ProcedureExecutionPrerequisiteDecision[]
  executionKey: string
} {
  const prerequisiteDecisions = input.prerequisiteDecisions ?? DEFAULT_DECISIONS
  const definition: ProcedureDefinition = {
    ...BINDING_SIGIL,
    schemaVersion: PROCEDURE_DEFINITION_SCHEMA_VERSION,
    procedureId: input.procedureId,
    canonicalName: input.canonicalName,
    requirements: {
      speech: 'none',
      gesture: 'none',
      toolTags: ['evidence_kit'],
      reagents: [],
      requiresDiagram: false,
      deviceTags: [],
      ...(input.includeEnvironmentalConditions === true ? { environmentalConditions: [] } : {}),
    },
    restrictions: {
      forbiddenRoles: [],
      requiredCertifications: [],
      requiresSpecialistAccess: false,
      usageCap: null,
    },
    availability: { rating: 'common' },
    provenance: {
      sourceSystem: 'field_manual',
      acquiredViaResearch: false,
      researchDiscipline: null,
      restrictedFaction: null,
    },
  }
  return {
    definition,
    eligibleRoles: ['investigator', 'field_recon'] as const,
    requiredParticipantCount: 2,
    participants: [
      makeParticipant('agent-a', 'investigator', ['evidence_kit']),
      makeParticipant('agent-b', 'field_recon'),
    ],
    requiredPrerequisites: prerequisiteDecisions.map(({ prerequisiteClass, ownerRef }) => ({
      prerequisiteClass,
      ownerRef,
    })),
    prerequisiteDecisions,
    executionKey: input.executionKey,
  }
}

export function withBlockedAuthorizationDecision(
  decisions: readonly ProcedureExecutionPrerequisiteDecision[] = DEFAULT_DECISIONS
): readonly ProcedureExecutionPrerequisiteDecision[] {
  return decisions.map((decision) =>
    decision.prerequisiteClass === 'authorization'
      ? { ...decision, state: 'blocked', reason: 'missing_auth' }
      : decision
  )
}
