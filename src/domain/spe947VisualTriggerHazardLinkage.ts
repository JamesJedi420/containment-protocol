/**
 * SPE-2602 / SPE-947: read/compose linkage from compact spe947* evaluator maps
 * to persisted SPE-2111 visualTriggerHazardRecords.
 *
 * Authored bindings only — no propagation graph, no evaluator mutation.
 */

import type {
  Spe947ContentArtifactRecordsMap,
  Spe947ContentOwnerRecordsMap,
  Spe947CounterMemeticPlanRecordsMap,
  Spe947PlatformRecordsMap,
  Spe947PostCaseMediaCaseRecordsMap,
  Spe947VisualTriggerHazardBinding,
  Spe947VisualTriggerHazardBindingRecordsMap,
  Spe947VisualTriggerHazardLinkEntityKind,
} from './spe947EvaluatorPersistence'
import type {
  VisualTriggerHazardRecord,
  VisualTriggerHazardRecordsMap,
} from './visualTriggerHazardRegistry'

export type Spe947VisualTriggerHazardLinkStatus = 'resolved' | 'missing_registry' | 'missing_entity'

export interface Spe947VisualTriggerHazardLink {
  readonly bindingId: string
  readonly entityKind: Spe947VisualTriggerHazardLinkEntityKind
  readonly entityId: string
  readonly entityLabel: string | null
  readonly visualTriggerHazardId: string
  readonly registryLabel: string | null
  readonly status: Spe947VisualTriggerHazardLinkStatus
  readonly registryRecord: VisualTriggerHazardRecord | null
}

export interface Spe947VisualTriggerHazardLinkageMaps {
  readonly spe947PlatformRecords?: Spe947PlatformRecordsMap
  readonly spe947ContentArtifacts?: Spe947ContentArtifactRecordsMap
  readonly spe947CounterMemeticPlans?: Spe947CounterMemeticPlanRecordsMap
  readonly spe947ContentOwners?: Spe947ContentOwnerRecordsMap
  readonly spe947PostCaseMediaCases?: Spe947PostCaseMediaCaseRecordsMap
  readonly spe947VisualTriggerHazardBindings?: Spe947VisualTriggerHazardBindingRecordsMap
}

function resolveEntityLabel(
  maps: Spe947VisualTriggerHazardLinkageMaps,
  entityKind: Spe947VisualTriggerHazardLinkEntityKind,
  entityId: string
): string | null {
  switch (entityKind) {
    case 'platform': {
      const platform = maps.spe947PlatformRecords?.[entityId]
      return platform?.label ?? null
    }
    case 'content_artifact': {
      const artifact = maps.spe947ContentArtifacts?.[entityId]
      return artifact?.label ?? null
    }
    case 'counter_memetic_plan': {
      const plan = maps.spe947CounterMemeticPlans?.[entityId]
      return plan?.label ?? null
    }
    case 'content_owner': {
      const owner = maps.spe947ContentOwners?.[entityId]
      return owner?.label ?? null
    }
    case 'post_case_media_artifact': {
      const cases = maps.spe947PostCaseMediaCases ?? {}
      for (const mediaCase of Object.values(cases)) {
        const artifact = mediaCase.mediaArtifacts.find((entry) => entry.id === entityId)
        if (artifact) {
          return artifact.label
        }
      }
      return null
    }
    default: {
      const _exhaustive: never = entityKind
      return _exhaustive
    }
  }
}

/**
 * Resolve one authored binding against spe947* maps + visualTriggerHazardRecords.
 * Missing registry or entity ids never throw — status encodes the gap.
 */
export function resolveSpe947VisualTriggerHazardLink(input: {
  binding: Spe947VisualTriggerHazardBinding
  maps: Spe947VisualTriggerHazardLinkageMaps
  visualTriggerHazardRecords: VisualTriggerHazardRecordsMap
}): Spe947VisualTriggerHazardLink {
  const { binding, maps, visualTriggerHazardRecords } = input
  const entityLabel = resolveEntityLabel(maps, binding.entityKind, binding.entityId)
  const registryRecord = visualTriggerHazardRecords[binding.visualTriggerHazardId] ?? null

  let status: Spe947VisualTriggerHazardLinkStatus
  if (!registryRecord) {
    status = 'missing_registry'
  } else if (entityLabel === null) {
    status = 'missing_entity'
  } else {
    status = 'resolved'
  }

  return Object.freeze({
    bindingId: binding.id,
    entityKind: binding.entityKind,
    entityId: binding.entityId,
    entityLabel,
    visualTriggerHazardId: binding.visualTriggerHazardId,
    registryLabel: registryRecord?.label ?? null,
    status,
    registryRecord,
  })
}

/**
 * Compose all authored spe947 → SPE-2111 links. Empty bindings → empty list (no-op).
 * Deterministic order by binding id.
 */
export function composeSpe947VisualTriggerHazardLinks(input: {
  maps: Spe947VisualTriggerHazardLinkageMaps
  visualTriggerHazardRecords?: VisualTriggerHazardRecordsMap
}): readonly Spe947VisualTriggerHazardLink[] {
  const bindings = input.maps.spe947VisualTriggerHazardBindings ?? {}
  const registry = input.visualTriggerHazardRecords ?? {}
  const bindingIds = Object.keys(bindings).sort((left, right) => left.localeCompare(right))

  return Object.freeze(
    bindingIds.map((bindingId) => {
      const binding = bindings[bindingId]
      return resolveSpe947VisualTriggerHazardLink({
        binding,
        maps: input.maps,
        visualTriggerHazardRecords: registry,
      })
    })
  )
}
