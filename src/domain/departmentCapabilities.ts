/**
 * SPE-2083: pure authored department capability registry and deterministic
 * case-to-department resolver.
 *
 * This module owns no queues, persistence, authorization, or team ranking.
 */

import type { AuthorityGraph, AuthorityGraphNode } from './authorityGraph'
import type { MissionCategory } from './models'

export const DEPARTMENT_CAPABILITIES = [
  'research',
  'containment',
  'records',
  'procurement',
  'ethics_review',
  'emergency_response',
] as const

export type DepartmentCapability = (typeof DEPARTMENT_CAPABILITIES)[number]

export const DEPARTMENT_TASK_TYPES = [
  'research_case',
  'containment_response',
  'records_review',
  'procurement_support',
  'ethics_veto',
  'emergency_response',
] as const

export type DepartmentTaskType = (typeof DEPARTMENT_TASK_TYPES)[number]

export const DEPARTMENT_REVIEW_AUTHORITIES = [
  'research_release',
  'containment_disposition',
  'records_release',
  'procurement_approval',
  'ethics_veto',
  'emergency_command',
] as const

export type DepartmentReviewAuthority = (typeof DEPARTMENT_REVIEW_AUTHORITIES)[number]

export const DEPARTMENT_DOCTRINE_BIASES = [
  'evidence_first',
  'containment_first',
  'welfare_first',
  'readiness_first',
  'resource_conservative',
  'balanced',
] as const

export type DepartmentDoctrineBias = (typeof DEPARTMENT_DOCTRINE_BIASES)[number]

export const DEPARTMENT_FAILURE_MODES = [
  'capability_gap',
  'doctrine_mismatch',
  'authority_gap',
  'resource_shortfall',
  'review_bottleneck',
] as const

export type DepartmentFailureMode = (typeof DEPARTMENT_FAILURE_MODES)[number]

export type DepartmentCapabilityLimitMode = 'support_only' | 'denied'

export interface DepartmentCapabilityLimit {
  readonly capability: DepartmentCapability
  readonly mode: DepartmentCapabilityLimitMode
}

export interface DepartmentRoutingLimits {
  readonly capabilityLimits: readonly DepartmentCapabilityLimit[]
  readonly excludedMissionCategories?: readonly MissionCategory[]
  readonly excludedCaseTags?: readonly string[]
}

export interface DepartmentDefinition {
  readonly id: string
  readonly label: string
  readonly capabilities: readonly DepartmentCapability[]
  readonly taskTypes: readonly DepartmentTaskType[]
  readonly reviewAuthorities: readonly DepartmentReviewAuthority[]
  readonly reputation: number
  readonly fundingTier: number
  readonly hqSiteId: string
  readonly doctrineBias: DepartmentDoctrineBias
  readonly doctrineTags: readonly string[]
  readonly limits: DepartmentRoutingLimits
  readonly failureModes: readonly DepartmentFailureMode[]
}

export interface DepartmentCapabilityRegistry {
  readonly departments: readonly DepartmentDefinition[]
  /**
   * Explicit fallback references. References may be authored department IDs or,
   * when an authority graph is supplied, department node IDs/aliases/linked IDs.
   * Input order has no semantic weight; code-unit department ID order wins.
   */
  readonly fallbackDepartmentRefs: readonly string[]
}

export type DepartmentCapabilityRegistryValidationCode =
  | 'invalid_department_definition'
  | 'invalid_departments'
  | 'missing_department_id'
  | 'duplicate_department_id'
  | 'missing_department_label'
  | 'invalid_capabilities'
  | 'invalid_capability'
  | 'duplicate_capability'
  | 'invalid_task_types'
  | 'invalid_task_type'
  | 'duplicate_task_type'
  | 'invalid_review_authorities'
  | 'invalid_review_authority'
  | 'duplicate_review_authority'
  | 'invalid_reputation'
  | 'invalid_funding_tier'
  | 'missing_hq_site_id'
  | 'invalid_doctrine_bias'
  | 'invalid_doctrine_tags'
  | 'empty_doctrine_tag'
  | 'duplicate_doctrine_tag'
  | 'invalid_capability_limits'
  | 'invalid_capability_limit'
  | 'duplicate_capability_limit'
  | 'limit_without_capability'
  | 'invalid_excluded_mission_categories'
  | 'invalid_excluded_mission_category'
  | 'invalid_excluded_case_tags'
  | 'empty_excluded_case_tag'
  | 'invalid_failure_modes'
  | 'invalid_failure_mode'
  | 'duplicate_failure_mode'
  | 'missing_fallback_route'
  | 'invalid_fallback_reference'
  | 'duplicate_fallback_reference'
  | 'unknown_fallback_department'
  | 'authority_alias_conflict'
  | 'duplicate_authority_department'

export interface DepartmentCapabilityRegistryValidationIssue {
  readonly code: DepartmentCapabilityRegistryValidationCode
  readonly detail: string
  readonly relatedIds?: readonly string[]
}

export interface DepartmentCapabilityRegistryValidationResult {
  readonly valid: boolean
  readonly issues: readonly DepartmentCapabilityRegistryValidationIssue[]
}

export interface DepartmentCasePacket {
  readonly caseId: string
  readonly missionCategory: MissionCategory
  readonly caseTags: readonly string[]
}

export interface DepartmentCaseRequirements {
  readonly primaryCapability: DepartmentCapability
  readonly primaryTaskType: DepartmentTaskType
  readonly supportingCapabilities: readonly DepartmentCapability[]
}

export interface DepartmentRouteAssignment {
  readonly departmentId: string
  readonly authorityNodeId?: string
  readonly matchedCapabilities: readonly DepartmentCapability[]
  readonly doctrineMatches: readonly string[]
}

export interface DepartmentMisfitRoute {
  readonly departmentId: string
  readonly authorityNodeId?: string
  readonly reasonCode: 'no-primary-capability-match'
  readonly lowPriority: true
  readonly stigmaTag: 'capability-misfit'
}

export type DepartmentRoutingBlockerCode = 'invalid-department-registry'

export interface DepartmentResolutionResult {
  readonly caseId: string
  readonly routeKind: 'matched' | 'fallback' | 'blocked'
  readonly requirements: DepartmentCaseRequirements
  readonly primaryDepartment: DepartmentRouteAssignment | null
  readonly supportingDepartments: readonly DepartmentRouteAssignment[]
  readonly misfitRoute: DepartmentMisfitRoute | null
  readonly blockerCodes: readonly DepartmentRoutingBlockerCode[]
}

const CAPABILITY_SET = new Set<string>(DEPARTMENT_CAPABILITIES)
const TASK_TYPE_SET = new Set<string>(DEPARTMENT_TASK_TYPES)
const REVIEW_AUTHORITY_SET = new Set<string>(DEPARTMENT_REVIEW_AUTHORITIES)
const DOCTRINE_BIAS_SET = new Set<string>(DEPARTMENT_DOCTRINE_BIASES)
const FAILURE_MODE_SET = new Set<string>(DEPARTMENT_FAILURE_MODES)
const CAPABILITY_LIMIT_MODE_SET = new Set<string>(['support_only', 'denied'])
const MISSION_CATEGORY_SET = new Set<string>([
  'containment_breach',
  'investigation_lead',
  'civilian_infrastructure_incident',
  'faction_hostile_activity',
  'strategic_opportunity',
])

const TASK_TYPE_BY_CAPABILITY: Readonly<Record<DepartmentCapability, DepartmentTaskType>> = {
  research: 'research_case',
  containment: 'containment_response',
  records: 'records_review',
  procurement: 'procurement_support',
  ethics_review: 'ethics_veto',
  emergency_response: 'emergency_response',
}

const CATEGORY_REQUIREMENTS: Readonly<
  Record<
    MissionCategory,
    {
      primaryCapability: DepartmentCapability
      supportingCapabilities: readonly DepartmentCapability[]
    }
  >
> = {
  containment_breach: {
    primaryCapability: 'containment',
    supportingCapabilities: ['emergency_response', 'records'],
  },
  investigation_lead: {
    primaryCapability: 'research',
    supportingCapabilities: ['records'],
  },
  civilian_infrastructure_incident: {
    primaryCapability: 'emergency_response',
    supportingCapabilities: ['containment', 'procurement'],
  },
  faction_hostile_activity: {
    primaryCapability: 'containment',
    supportingCapabilities: ['ethics_review', 'records'],
  },
  strategic_opportunity: {
    primaryCapability: 'research',
    supportingCapabilities: ['procurement', 'records'],
  },
}

function compareCodeUnits(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalizeToken(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeCaseTag(value: unknown) {
  return typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_')
    : ''
}

function uniqueCodeUnitSorted(values: readonly string[]) {
  return [...new Set(values)].sort(compareCodeUnits)
}

function isDepartmentCapability(value: unknown): value is DepartmentCapability {
  return typeof value === 'string' && CAPABILITY_SET.has(value)
}

function isDepartmentTaskType(value: unknown): value is DepartmentTaskType {
  return typeof value === 'string' && TASK_TYPE_SET.has(value)
}

function isDepartmentReviewAuthority(value: unknown): value is DepartmentReviewAuthority {
  return typeof value === 'string' && REVIEW_AUTHORITY_SET.has(value)
}

function isDepartmentDoctrineBias(value: unknown): value is DepartmentDoctrineBias {
  return typeof value === 'string' && DOCTRINE_BIAS_SET.has(value)
}

function isDepartmentFailureMode(value: unknown): value is DepartmentFailureMode {
  return typeof value === 'string' && FAILURE_MODE_SET.has(value)
}

function pushIssue(
  issues: DepartmentCapabilityRegistryValidationIssue[],
  code: DepartmentCapabilityRegistryValidationCode,
  detail: string,
  relatedIds?: readonly string[]
) {
  issues.push({ code, detail, relatedIds })
}

function validateKnownTokenList(
  issues: DepartmentCapabilityRegistryValidationIssue[],
  departmentId: string,
  fieldName: 'capabilities' | 'taskTypes' | 'reviewAuthorities' | 'failureModes',
  values: unknown,
  valid: (value: unknown) => boolean,
  invalidArrayCode: DepartmentCapabilityRegistryValidationCode,
  invalidValueCode: DepartmentCapabilityRegistryValidationCode,
  duplicateCode: DepartmentCapabilityRegistryValidationCode
) {
  if (!Array.isArray(values)) {
    pushIssue(
      issues,
      invalidArrayCode,
      `Department ${departmentId} ${fieldName} must be an array.`,
      [departmentId]
    )
    return
  }

  const seen = new Set<string>()
  for (const value of values) {
    if (!valid(value)) {
      pushIssue(
        issues,
        invalidValueCode,
        `Department ${departmentId} has invalid ${fieldName} value ${String(value)}.`,
        [departmentId]
      )
      continue
    }

    if (seen.has(value)) {
      pushIssue(
        issues,
        duplicateCode,
        `Department ${departmentId} repeats ${fieldName} value ${value}.`,
        [departmentId, value]
      )
    } else {
      seen.add(value)
    }
  }
}

function departmentNodeReferences(node: AuthorityGraphNode) {
  return uniqueCodeUnitSorted([
    normalizeToken(node.id),
    ...(node.aliases ?? []).flatMap((alias) => [
      normalizeToken(alias.aliasId),
      normalizeToken(alias.label),
    ]),
    ...(node.linkedDepartmentIds ?? []).map(normalizeToken),
  ]).filter((value) => value.length > 0)
}

function departmentAuthorityNodes(graph: AuthorityGraph) {
  return graph.nodes
    .filter((node) => node.nodeType === 'department')
    .sort((left, right) => compareCodeUnits(left.id, right.id))
}

function authorityNodesMatchingRef(graph: AuthorityGraph, ref: string) {
  const token = normalizeToken(ref)
  if (!token) {
    return []
  }

  return departmentAuthorityNodes(graph).filter((node) =>
    departmentNodeReferences(node).includes(token)
  )
}

export function resolveDepartmentDefinitionReference(
  registry: DepartmentCapabilityRegistry,
  ref: string,
  authorityGraph?: AuthorityGraph
): DepartmentDefinition | undefined {
  const token = normalizeToken(ref)
  if (!token || !Array.isArray(registry.departments)) {
    return undefined
  }

  const directMatches = registry.departments.filter(
    (department) => department && normalizeToken(department.id) === token
  )
  if (directMatches.length > 1) {
    return undefined
  }

  if (!authorityGraph) {
    return directMatches.length === 1 ? directMatches[0] : undefined
  }

  const matchedNodes = authorityNodesMatchingRef(authorityGraph, token)
  if (matchedNodes.length > 1) {
    return undefined
  }
  if (directMatches.length === 1) {
    return directMatches[0]
  }
  if (matchedNodes.length === 0) {
    return undefined
  }

  const nodeRefs = departmentNodeReferences(matchedNodes[0])
  const registryMatches = registry.departments.filter((department) =>
    nodeRefs.includes(normalizeToken(department.id))
  )

  return registryMatches.length === 1 ? registryMatches[0] : undefined
}

function resolveAuthorityNodeId(
  graph: AuthorityGraph | undefined,
  departmentId: string
): string | undefined {
  if (!graph) {
    return undefined
  }

  const matches = authorityNodesMatchingRef(graph, departmentId)
  return matches.length === 1 ? matches[0].id : undefined
}

function validateDepartmentDefinition(
  definition: DepartmentDefinition
): DepartmentCapabilityRegistryValidationIssue[] {
  const issues: DepartmentCapabilityRegistryValidationIssue[] = []
  if (!definition || typeof definition !== 'object') {
    pushIssue(
      issues,
      'invalid_department_definition',
      'Department registry contains a malformed department definition.'
    )
    return issues
  }

  const departmentId = normalizeToken(definition.id) || '(unknown)'

  if (!normalizeToken(definition.id)) {
    pushIssue(issues, 'missing_department_id', 'Department definition is missing id.')
  }

  if (!normalizeToken(definition.label)) {
    pushIssue(issues, 'missing_department_label', `Department ${departmentId} is missing label.`, [
      departmentId,
    ])
  }

  validateKnownTokenList(
    issues,
    departmentId,
    'capabilities',
    definition.capabilities,
    isDepartmentCapability,
    'invalid_capabilities',
    'invalid_capability',
    'duplicate_capability'
  )
  validateKnownTokenList(
    issues,
    departmentId,
    'taskTypes',
    definition.taskTypes,
    isDepartmentTaskType,
    'invalid_task_types',
    'invalid_task_type',
    'duplicate_task_type'
  )
  validateKnownTokenList(
    issues,
    departmentId,
    'reviewAuthorities',
    definition.reviewAuthorities,
    isDepartmentReviewAuthority,
    'invalid_review_authorities',
    'invalid_review_authority',
    'duplicate_review_authority'
  )
  validateKnownTokenList(
    issues,
    departmentId,
    'failureModes',
    definition.failureModes,
    isDepartmentFailureMode,
    'invalid_failure_modes',
    'invalid_failure_mode',
    'duplicate_failure_mode'
  )

  if (
    !Number.isFinite(definition.reputation) ||
    definition.reputation < 0 ||
    definition.reputation > 100
  ) {
    pushIssue(
      issues,
      'invalid_reputation',
      `Department ${departmentId} reputation must be finite and between 0 and 100.`,
      [departmentId]
    )
  }

  if (
    !Number.isInteger(definition.fundingTier) ||
    definition.fundingTier < 1 ||
    definition.fundingTier > 5
  ) {
    pushIssue(
      issues,
      'invalid_funding_tier',
      `Department ${departmentId} fundingTier must be an integer between 1 and 5.`,
      [departmentId]
    )
  }

  if (!normalizeToken(definition.hqSiteId)) {
    pushIssue(issues, 'missing_hq_site_id', `Department ${departmentId} is missing hqSiteId.`, [
      departmentId,
    ])
  }

  if (!isDepartmentDoctrineBias(definition.doctrineBias)) {
    pushIssue(
      issues,
      'invalid_doctrine_bias',
      `Department ${departmentId} has invalid doctrineBias ${String(definition.doctrineBias)}.`,
      [departmentId]
    )
  }

  if (!Array.isArray(definition.doctrineTags)) {
    pushIssue(
      issues,
      'invalid_doctrine_tags',
      `Department ${departmentId} doctrineTags must be an array.`,
      [departmentId]
    )
  } else {
    const seenTags = new Set<string>()
    for (const tag of definition.doctrineTags) {
      const normalized = normalizeCaseTag(tag)
      if (!normalized) {
        pushIssue(
          issues,
          'empty_doctrine_tag',
          `Department ${departmentId} contains an empty doctrine tag.`,
          [departmentId]
        )
      } else if (seenTags.has(normalized)) {
        pushIssue(
          issues,
          'duplicate_doctrine_tag',
          `Department ${departmentId} repeats doctrine tag ${normalized}.`,
          [departmentId, normalized]
        )
      } else {
        seenTags.add(normalized)
      }
    }
  }

  const limits = definition.limits
  if (!limits || !Array.isArray(limits.capabilityLimits)) {
    pushIssue(
      issues,
      'invalid_capability_limits',
      `Department ${departmentId} capabilityLimits must be an array.`,
      [departmentId]
    )
  } else {
    const seenLimits = new Set<string>()
    const capabilities = new Set(
      Array.isArray(definition.capabilities)
        ? definition.capabilities.filter(isDepartmentCapability)
        : []
    )

    for (const limit of limits.capabilityLimits) {
      if (
        !limit ||
        !isDepartmentCapability(limit.capability) ||
        !CAPABILITY_LIMIT_MODE_SET.has(limit.mode)
      ) {
        pushIssue(
          issues,
          'invalid_capability_limit',
          `Department ${departmentId} contains a malformed capability limit.`,
          [departmentId]
        )
        continue
      }

      if (seenLimits.has(limit.capability)) {
        pushIssue(
          issues,
          'duplicate_capability_limit',
          `Department ${departmentId} repeats a limit for ${limit.capability}.`,
          [departmentId, limit.capability]
        )
      } else {
        seenLimits.add(limit.capability)
      }

      if (!capabilities.has(limit.capability)) {
        pushIssue(
          issues,
          'limit_without_capability',
          `Department ${departmentId} limits unowned capability ${limit.capability}.`,
          [departmentId, limit.capability]
        )
      }
    }

    if (
      limits.excludedMissionCategories !== undefined &&
      !Array.isArray(limits.excludedMissionCategories)
    ) {
      pushIssue(
        issues,
        'invalid_excluded_mission_categories',
        `Department ${departmentId} excludedMissionCategories must be an array.`,
        [departmentId]
      )
    } else {
      for (const category of limits.excludedMissionCategories ?? []) {
        if (!MISSION_CATEGORY_SET.has(category)) {
          pushIssue(
            issues,
            'invalid_excluded_mission_category',
            `Department ${departmentId} excludes invalid mission category ${String(category)}.`,
            [departmentId]
          )
        }
      }
    }

    if (limits.excludedCaseTags !== undefined && !Array.isArray(limits.excludedCaseTags)) {
      pushIssue(
        issues,
        'invalid_excluded_case_tags',
        `Department ${departmentId} excludedCaseTags must be an array.`,
        [departmentId]
      )
    } else {
      for (const tag of limits.excludedCaseTags ?? []) {
        if (!normalizeToken(tag)) {
          pushIssue(
            issues,
            'empty_excluded_case_tag',
            `Department ${departmentId} contains an empty excluded case tag.`,
            [departmentId]
          )
        }
      }
    }
  }

  return issues
}

export function validateDepartmentCapabilityRegistry(
  registry: DepartmentCapabilityRegistry,
  authorityGraph?: AuthorityGraph
): DepartmentCapabilityRegistryValidationResult {
  const issues: DepartmentCapabilityRegistryValidationIssue[] = []
  const departments = Array.isArray(registry.departments) ? registry.departments : []
  const seenIds = new Set<string>()

  if (!Array.isArray(registry.departments)) {
    pushIssue(issues, 'invalid_departments', 'Department registry departments must be an array.')
  }

  for (const department of departments) {
    issues.push(...validateDepartmentDefinition(department))
    if (!department || typeof department !== 'object') {
      continue
    }
    const id = normalizeToken(department.id)
    if (!id) {
      continue
    }

    if (seenIds.has(id)) {
      pushIssue(issues, 'duplicate_department_id', `Duplicate department id ${id}.`, [id])
    } else {
      seenIds.add(id)
    }
  }

  if (
    !Array.isArray(registry.fallbackDepartmentRefs) ||
    registry.fallbackDepartmentRefs.length === 0
  ) {
    pushIssue(
      issues,
      'missing_fallback_route',
      'Department registry requires at least one explicit fallback department reference.'
    )
  } else {
    const seenFallbackRefs = new Set<string>()
    for (const ref of registry.fallbackDepartmentRefs) {
      const normalizedRef = normalizeToken(ref)
      if (!normalizedRef) {
        pushIssue(
          issues,
          'invalid_fallback_reference',
          'Department registry contains an empty fallback department reference.'
        )
        continue
      }

      if (seenFallbackRefs.has(normalizedRef)) {
        pushIssue(
          issues,
          'duplicate_fallback_reference',
          `Department registry repeats fallback reference ${normalizedRef}.`,
          [normalizedRef]
        )
      } else {
        seenFallbackRefs.add(normalizedRef)
      }

      if (!resolveDepartmentDefinitionReference(registry, ref, authorityGraph)) {
        pushIssue(
          issues,
          'unknown_fallback_department',
          `Fallback department reference ${ref} does not resolve unambiguously.`,
          [ref]
        )
      }
    }
  }

  if (authorityGraph) {
    const refNodeIds = new Map<string, string[]>()
    for (const node of departmentAuthorityNodes(authorityGraph)) {
      for (const ref of departmentNodeReferences(node)) {
        const nodeIds = refNodeIds.get(ref) ?? []
        nodeIds.push(node.id)
        refNodeIds.set(ref, nodeIds)
      }
    }

    for (const [ref, nodeIds] of refNodeIds) {
      const uniqueNodeIds = uniqueCodeUnitSorted(nodeIds)
      if (uniqueNodeIds.length > 1) {
        pushIssue(
          issues,
          'authority_alias_conflict',
          `Department authority reference ${ref} maps to multiple nodes.`,
          uniqueNodeIds
        )
      }
    }

    const departmentIdsByNode = new Map<string, string[]>()
    for (const department of departments) {
      const matchingNodes = authorityNodesMatchingRef(authorityGraph, department.id)
      if (matchingNodes.length !== 1) {
        continue
      }

      const nodeId = matchingNodes[0].id
      const departmentIds = departmentIdsByNode.get(nodeId) ?? []
      departmentIds.push(department.id)
      departmentIdsByNode.set(nodeId, departmentIds)
    }

    for (const [nodeId, departmentIds] of departmentIdsByNode) {
      const uniqueDepartmentIds = uniqueCodeUnitSorted(departmentIds)
      if (uniqueDepartmentIds.length > 1) {
        pushIssue(
          issues,
          'duplicate_authority_department',
          `Authority department node ${nodeId} maps to multiple registry departments.`,
          uniqueDepartmentIds
        )
      }
    }
  }

  const sortedIssues = [...issues].sort((left, right) => {
    const codeCompare = compareCodeUnits(left.code, right.code)
    return codeCompare !== 0 ? codeCompare : compareCodeUnits(left.detail, right.detail)
  })

  return Object.freeze({
    valid: sortedIssues.length === 0,
    issues: Object.freeze(sortedIssues.map((issue) => Object.freeze(issue))),
  })
}

function capabilitiesFromCaseTags(tags: readonly string[]) {
  const capabilities = new Set<DepartmentCapability>()

  for (const rawTag of tags) {
    const tag = normalizeCaseTag(rawTag)
    if (!tag) {
      continue
    }

    if (
      tag === 'containment' ||
      tag === 'breach' ||
      tag === 'hazard' ||
      tag.endsWith('_hazard') ||
      tag.endsWith('hazard')
    ) {
      capabilities.add('containment')
    }
    if (tag === 'research' || tag === 'analysis' || tag === 'investigation') {
      capabilities.add('research')
    }
    if (tag === 'records' || tag === 'records_review' || tag === 'archive') {
      capabilities.add('records')
    }
    if (tag === 'procurement' || tag === 'equipment_request' || tag === 'supply') {
      capabilities.add('procurement')
    }
    if (tag === 'ethics' || tag === 'ethics_veto' || tag === 'welfare_review') {
      capabilities.add('ethics_review')
    }
    if (tag === 'emergency' || tag === 'emergency_response' || tag === 'rescue') {
      capabilities.add('emergency_response')
    }
  }

  return [...capabilities].sort(compareCodeUnits)
}

export function deriveDepartmentCaseRequirements(
  packet: DepartmentCasePacket
): DepartmentCaseRequirements {
  const categoryRequirements = CATEGORY_REQUIREMENTS[packet.missionCategory]
  const tagCapabilities = capabilitiesFromCaseTags(packet.caseTags)
  const primaryCapability =
    packet.missionCategory === 'strategic_opportunity' && tagCapabilities.length > 0
      ? tagCapabilities[0]
      : categoryRequirements.primaryCapability
  const supportingCapabilities = uniqueCodeUnitSorted([
    ...categoryRequirements.supportingCapabilities,
    ...tagCapabilities.filter((capability) => capability !== primaryCapability),
  ]) as DepartmentCapability[]

  return Object.freeze({
    primaryCapability,
    primaryTaskType: TASK_TYPE_BY_CAPABILITY[primaryCapability],
    supportingCapabilities: Object.freeze(supportingCapabilities),
  })
}

function normalizedCaseTags(packet: DepartmentCasePacket) {
  return uniqueCodeUnitSorted(packet.caseTags.map(normalizeCaseTag).filter((tag) => tag.length > 0))
}

function departmentExcludedFromCase(
  department: DepartmentDefinition,
  packet: DepartmentCasePacket,
  caseTags: readonly string[]
) {
  if (department.limits.excludedMissionCategories?.includes(packet.missionCategory)) {
    return true
  }

  const excludedTags = new Set((department.limits.excludedCaseTags ?? []).map(normalizeCaseTag))
  return caseTags.some((tag) => excludedTags.has(tag))
}

function capabilityLimitMode(department: DepartmentDefinition, capability: DepartmentCapability) {
  return department.limits.capabilityLimits.find((limit) => limit.capability === capability)?.mode
}

function canOwnPrimary(
  department: DepartmentDefinition,
  requirements: DepartmentCaseRequirements,
  packet: DepartmentCasePacket,
  caseTags: readonly string[]
) {
  return (
    !departmentExcludedFromCase(department, packet, caseTags) &&
    department.capabilities.includes(requirements.primaryCapability) &&
    department.taskTypes.includes(requirements.primaryTaskType) &&
    capabilityLimitMode(department, requirements.primaryCapability) === undefined
  )
}

function canSupportCapability(
  department: DepartmentDefinition,
  capability: DepartmentCapability,
  packet: DepartmentCasePacket,
  caseTags: readonly string[]
) {
  return (
    !departmentExcludedFromCase(department, packet, caseTags) &&
    department.capabilities.includes(capability) &&
    department.taskTypes.includes(TASK_TYPE_BY_CAPABILITY[capability]) &&
    capabilityLimitMode(department, capability) !== 'denied'
  )
}

function doctrineMatches(department: DepartmentDefinition, caseTags: readonly string[]) {
  const caseTagSet = new Set(caseTags)
  return uniqueCodeUnitSorted(
    department.doctrineTags
      .map(normalizeCaseTag)
      .filter((tag) => tag.length > 0 && caseTagSet.has(tag))
  )
}

const GENERIC_DOCTRINE_TAGS = new Set([
  'analysis',
  'containment',
  'emergency',
  'evidence',
  'hostile',
  'infrastructure',
  'records_review',
  'supply',
])

function doctrineMatchScore(department: DepartmentDefinition, caseTags: readonly string[]) {
  return doctrineMatches(department, caseTags).reduce(
    (score, tag) => score + (GENERIC_DOCTRINE_TAGS.has(tag) ? 1 : 2),
    0
  )
}

function comparePrimaryCandidates(
  left: DepartmentDefinition,
  right: DepartmentDefinition,
  caseTags: readonly string[]
) {
  const doctrineDelta = doctrineMatchScore(right, caseTags) - doctrineMatchScore(left, caseTags)
  if (doctrineDelta !== 0) {
    return doctrineDelta
  }

  if (right.reputation !== left.reputation) {
    return right.reputation - left.reputation
  }

  if (right.fundingTier !== left.fundingTier) {
    return right.fundingTier - left.fundingTier
  }

  return compareCodeUnits(left.id, right.id)
}

function makeAssignment(
  department: DepartmentDefinition,
  capabilities: readonly DepartmentCapability[],
  caseTags: readonly string[],
  authorityGraph?: AuthorityGraph
): DepartmentRouteAssignment {
  const authorityNodeId = resolveAuthorityNodeId(authorityGraph, department.id)

  return Object.freeze({
    departmentId: department.id,
    ...(authorityNodeId ? { authorityNodeId } : {}),
    matchedCapabilities: Object.freeze([...capabilities].sort(compareCodeUnits)),
    doctrineMatches: Object.freeze(doctrineMatches(department, caseTags)),
  })
}

function blockedResolution(
  packet: DepartmentCasePacket,
  requirements: DepartmentCaseRequirements
): DepartmentResolutionResult {
  return Object.freeze({
    caseId: packet.caseId,
    routeKind: 'blocked',
    requirements,
    primaryDepartment: null,
    supportingDepartments: Object.freeze([]),
    misfitRoute: null,
    blockerCodes: Object.freeze(['invalid-department-registry'] as const),
  })
}

export function resolveDepartments(
  packet: DepartmentCasePacket,
  registry: DepartmentCapabilityRegistry,
  authorityGraph?: AuthorityGraph
): DepartmentResolutionResult {
  const requirements = deriveDepartmentCaseRequirements(packet)
  if (!validateDepartmentCapabilityRegistry(registry, authorityGraph).valid) {
    return blockedResolution(packet, requirements)
  }

  const caseTags = normalizedCaseTags(packet)
  const primary = registry.departments
    .filter((department) => canOwnPrimary(department, requirements, packet, caseTags))
    .sort((left, right) => comparePrimaryCandidates(left, right, caseTags))[0]

  if (!primary) {
    const fallback = uniqueCodeUnitSorted(
      registry.fallbackDepartmentRefs
        .map((ref) => resolveDepartmentDefinitionReference(registry, ref, authorityGraph)?.id)
        .filter((id): id is string => Boolean(id))
    )
      .map((id) => registry.departments.find((department) => department.id === id))
      .find((department): department is DepartmentDefinition => Boolean(department))

    if (!fallback) {
      return blockedResolution(packet, requirements)
    }

    const authorityNodeId = resolveAuthorityNodeId(authorityGraph, fallback.id)
    const misfitRoute = Object.freeze({
      departmentId: fallback.id,
      ...(authorityNodeId ? { authorityNodeId } : {}),
      reasonCode: 'no-primary-capability-match' as const,
      lowPriority: true as const,
      stigmaTag: 'capability-misfit' as const,
    })

    return Object.freeze({
      caseId: packet.caseId,
      routeKind: 'fallback',
      requirements,
      primaryDepartment: null,
      supportingDepartments: Object.freeze([]),
      misfitRoute,
      blockerCodes: Object.freeze([]),
    })
  }

  const supporting = registry.departments
    .filter((department) => department.id !== primary.id)
    .map((department) => ({
      department,
      matchedCapabilities: requirements.supportingCapabilities.filter((capability) =>
        canSupportCapability(department, capability, packet, caseTags)
      ),
    }))
    .filter((candidate) => candidate.matchedCapabilities.length > 0)
    .sort((left, right) => {
      if (right.matchedCapabilities.length !== left.matchedCapabilities.length) {
        return right.matchedCapabilities.length - left.matchedCapabilities.length
      }

      const doctrineDelta =
        doctrineMatchScore(right.department, caseTags) -
        doctrineMatchScore(left.department, caseTags)
      if (doctrineDelta !== 0) {
        return doctrineDelta
      }

      if (right.department.reputation !== left.department.reputation) {
        return right.department.reputation - left.department.reputation
      }

      if (right.department.fundingTier !== left.department.fundingTier) {
        return right.department.fundingTier - left.department.fundingTier
      }

      return compareCodeUnits(left.department.id, right.department.id)
    })
    .map((candidate) =>
      makeAssignment(candidate.department, candidate.matchedCapabilities, caseTags, authorityGraph)
    )

  return Object.freeze({
    caseId: packet.caseId,
    routeKind: 'matched',
    requirements,
    primaryDepartment: makeAssignment(
      primary,
      [requirements.primaryCapability],
      caseTags,
      authorityGraph
    ),
    supportingDepartments: Object.freeze(supporting),
    misfitRoute: null,
    blockerCodes: Object.freeze([]),
  })
}

function defineDepartment(definition: DepartmentDefinition): DepartmentDefinition {
  return Object.freeze({
    ...definition,
    capabilities: Object.freeze([...definition.capabilities]),
    taskTypes: Object.freeze([...definition.taskTypes]),
    reviewAuthorities: Object.freeze([...definition.reviewAuthorities]),
    doctrineTags: Object.freeze([...definition.doctrineTags]),
    limits: Object.freeze({
      capabilityLimits: Object.freeze(
        definition.limits.capabilityLimits.map((limit) => Object.freeze({ ...limit }))
      ),
      excludedMissionCategories: definition.limits.excludedMissionCategories
        ? Object.freeze([...definition.limits.excludedMissionCategories])
        : undefined,
      excludedCaseTags: definition.limits.excludedCaseTags
        ? Object.freeze([...definition.limits.excludedCaseTags])
        : undefined,
    }),
    failureModes: Object.freeze([...definition.failureModes]),
  })
}

/** Baseline authored pack. Additional packs may extend this registry without persistence. */
export const DEFAULT_DEPARTMENT_CAPABILITY_REGISTRY: DepartmentCapabilityRegistry = Object.freeze({
  departments: Object.freeze([
    defineDepartment({
      id: 'department:biohazard-response',
      label: 'Biohazard Response Department',
      capabilities: ['containment', 'research', 'emergency_response'],
      taskTypes: ['containment_response', 'research_case', 'emergency_response'],
      reviewAuthorities: ['containment_disposition', 'research_release'],
      reputation: 72,
      fundingTier: 4,
      hqSiteId: 'site:biosecurity-annex',
      doctrineBias: 'containment_first',
      doctrineTags: ['biohazard', 'contamination', 'pathogen'],
      limits: { capabilityLimits: [] },
      failureModes: ['resource_shortfall', 'review_bottleneck'],
    }),
    defineDepartment({
      id: 'department:concept-embodiment-research',
      label: 'Concept Embodiment Research Department',
      capabilities: ['research', 'records', 'ethics_review'],
      taskTypes: ['research_case', 'records_review', 'ethics_veto'],
      reviewAuthorities: ['research_release', 'records_release', 'ethics_veto'],
      reputation: 70,
      fundingTier: 4,
      hqSiteId: 'site:conceptual-research-wing',
      doctrineBias: 'evidence_first',
      doctrineTags: ['concept_embodiment', 'cognitive_hazard', 'semantic_instability'],
      limits: { capabilityLimits: [] },
      failureModes: ['doctrine_mismatch', 'review_bottleneck'],
    }),
    defineDepartment({
      id: 'department:emergency-response',
      label: 'Emergency Response Department',
      capabilities: ['emergency_response', 'containment'],
      taskTypes: ['emergency_response', 'containment_response'],
      reviewAuthorities: ['emergency_command'],
      reputation: 78,
      fundingTier: 4,
      hqSiteId: 'site:response-command',
      doctrineBias: 'readiness_first',
      doctrineTags: ['emergency', 'rescue', 'infrastructure'],
      limits: {
        capabilityLimits: [{ capability: 'containment', mode: 'support_only' }],
      },
      failureModes: ['resource_shortfall'],
    }),
    defineDepartment({
      id: 'department:ethics-review',
      label: 'Ethics Review Department',
      capabilities: ['ethics_review', 'records'],
      taskTypes: ['ethics_veto', 'records_review'],
      reviewAuthorities: ['ethics_veto', 'records_release'],
      reputation: 68,
      fundingTier: 3,
      hqSiteId: 'site:review-chambers',
      doctrineBias: 'welfare_first',
      doctrineTags: ['ethics', 'welfare_review', 'protected_status'],
      limits: {
        capabilityLimits: [{ capability: 'records', mode: 'support_only' }],
      },
      failureModes: ['review_bottleneck'],
    }),
    defineDepartment({
      id: 'department:field-containment',
      label: 'Field Containment Department',
      capabilities: ['containment', 'emergency_response'],
      taskTypes: ['containment_response', 'emergency_response'],
      reviewAuthorities: ['containment_disposition'],
      reputation: 76,
      fundingTier: 4,
      hqSiteId: 'site:field-operations',
      doctrineBias: 'containment_first',
      doctrineTags: ['breach', 'containment', 'hostile'],
      limits: { capabilityLimits: [] },
      failureModes: ['doctrine_mismatch', 'resource_shortfall'],
    }),
    defineDepartment({
      id: 'department:general-intake',
      label: 'General Intake Department',
      capabilities: [],
      taskTypes: [],
      reviewAuthorities: [],
      reputation: 35,
      fundingTier: 2,
      hqSiteId: 'site:intake-annex',
      doctrineBias: 'balanced',
      doctrineTags: ['general_intake'],
      limits: { capabilityLimits: [] },
      failureModes: ['capability_gap'],
    }),
    defineDepartment({
      id: 'department:procurement-logistics',
      label: 'Procurement and Logistics Department',
      capabilities: ['procurement', 'emergency_response'],
      taskTypes: ['procurement_support', 'emergency_response'],
      reviewAuthorities: ['procurement_approval'],
      reputation: 64,
      fundingTier: 5,
      hqSiteId: 'site:logistics-yard',
      doctrineBias: 'resource_conservative',
      doctrineTags: ['equipment_request', 'infrastructure', 'supply'],
      limits: {
        capabilityLimits: [{ capability: 'emergency_response', mode: 'support_only' }],
      },
      failureModes: ['resource_shortfall'],
    }),
    defineDepartment({
      id: 'department:records-analysis',
      label: 'Records and Analysis Department',
      capabilities: ['research', 'records'],
      taskTypes: ['research_case', 'records_review'],
      reviewAuthorities: ['research_release', 'records_release'],
      reputation: 74,
      fundingTier: 3,
      hqSiteId: 'site:central-archive',
      doctrineBias: 'evidence_first',
      doctrineTags: ['analysis', 'archive', 'evidence', 'records_review'],
      limits: { capabilityLimits: [] },
      failureModes: ['authority_gap', 'review_bottleneck'],
    }),
  ]),
  fallbackDepartmentRefs: Object.freeze(['department:general-intake']),
})
