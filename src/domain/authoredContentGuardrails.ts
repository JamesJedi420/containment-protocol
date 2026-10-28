/**
 * SPE-2265 — authored-content generation guardrails (slice 1).
 *
 * Authoring-time validator: generation packets must cite SPE-2263 rule-token
 * lineage, respect novelty budget / forbidden breaks, and fail closed on
 * explicitly contradictory rule combinations. Release-scoped eligibility uses
 * SPE-2263 resolveCanonRule + SPE-3300 membership. No proc-gen pipeline.
 */

import {
  resolveCanonRule,
  type CanonRuleId,
  type CanonRuleRegistry,
} from './canonRuleRegistry'
import type {
  SharedUniverseCanonReleaseCatalog,
  SharedUniverseCanonReleaseId,
} from './sharedUniverseCanonReleaseCatalog'

export const AUTHORED_CONTENT_GUARDRAILS_SCHEMA_VERSION = 'spe-2265.v1' as const

export type GenerationSubjectKind = 'anomaly' | 'district' | 'faction'

export interface GenerationGuardrailRecord {
  readonly schemaVersion: typeof AUTHORED_CONTENT_GUARDRAILS_SCHEMA_VERSION
  readonly guardrailId: string
  readonly requiredRuleTokenIds: readonly CanonRuleId[]
  readonly forbiddenBreakIds: readonly string[]
  readonly motifReuseHooks: readonly string[]
  /** Max novel motif hooks beyond reuse set; 0 = no novelty allowed. */
  readonly noveltyBudget: number
}

export interface AuthoredGenerationPacket {
  readonly packetId: string
  readonly subjectKind: GenerationSubjectKind
  readonly subjectId: string
  readonly ruleTokenIds: readonly CanonRuleId[]
  readonly motifIds: readonly string[]
  readonly breakIds?: readonly string[]
  /**
   * Explicit pairwise contradictions declared on the packet
   * (ruleA cannot co-occur with ruleB unless excepted).
   */
  readonly declaredContradictions?: readonly {
    readonly ruleA: CanonRuleId
    readonly ruleB: CanonRuleId
  }[]
}

export const AUTHORED_CONTENT_GUARDRAIL_DIAGNOSTICS = [
  'missing_token_lineage',
  'unknown_rule_token',
  'unavailable_in_release',
  'forbidden_break',
  'novelty_budget_exceeded',
  'contradictory_rule_combination',
  'malformed_packet',
] as const
export type AuthoredContentGuardrailDiagnostic =
  (typeof AUTHORED_CONTENT_GUARDRAIL_DIAGNOSTICS)[number]

export interface AuthoredContentGuardrailDiagnosticRecord {
  readonly code: AuthoredContentGuardrailDiagnostic
  readonly field: string
  readonly message: string
  readonly relatedRuleIds?: readonly string[]
}

export type AuthoredContentGuardrailValidationResult =
  | {
      readonly ok: true
      readonly packet: AuthoredGenerationPacket
      readonly diagnostics: readonly AuthoredContentGuardrailDiagnosticRecord[]
    }
  | {
      readonly ok: false
      readonly diagnostics: readonly AuthoredContentGuardrailDiagnosticRecord[]
    }

function compareStrings(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function freezeDiagnostics(
  diagnostics: readonly AuthoredContentGuardrailDiagnosticRecord[],
): readonly AuthoredContentGuardrailDiagnosticRecord[] {
  return Object.freeze(
    [...diagnostics]
      .sort(
        (a, b) =>
          compareStrings(a.code, b.code) || compareStrings(a.field, b.field),
      )
      .map((entry) =>
        Object.freeze({
          ...entry,
          relatedRuleIds: entry.relatedRuleIds
            ? Object.freeze([...entry.relatedRuleIds].sort(compareStrings))
            : undefined,
        }),
      ),
  )
}

/**
 * Validate an authored/generated content packet against guardrails + SPE-2263.
 */
export function validateAuthoredContentGeneration(input: {
  readonly guardrail: GenerationGuardrailRecord
  readonly packet: AuthoredGenerationPacket
  readonly registry: CanonRuleRegistry
  readonly boundReleaseId?: SharedUniverseCanonReleaseId | null
  readonly releaseCatalog?: SharedUniverseCanonReleaseCatalog | null
}): AuthoredContentGuardrailValidationResult {
  const diagnostics: AuthoredContentGuardrailDiagnosticRecord[] = []
  const { guardrail, packet, registry } = input

  if (
    typeof packet.packetId !== 'string' ||
    packet.packetId.trim().length === 0 ||
    !Array.isArray(packet.ruleTokenIds)
  ) {
    return {
      ok: false,
      diagnostics: freezeDiagnostics([
        {
          code: 'malformed_packet',
          field: 'packet',
          message: 'packetId and ruleTokenIds are required',
        },
      ]),
    }
  }

  const required = new Set(guardrail.requiredRuleTokenIds.map((id) => id.trim()))
  const provided = packet.ruleTokenIds.map((id) => id.trim()).filter((id) => id.length > 0)

  if (provided.length === 0) {
    diagnostics.push({
      code: 'missing_token_lineage',
      field: 'ruleTokenIds',
      message: 'Generation packet missing canon rule token lineage',
    })
  }

  for (const requiredId of required) {
    if (!provided.includes(requiredId)) {
      diagnostics.push({
        code: 'missing_token_lineage',
        field: 'ruleTokenIds',
        message: `Missing required rule token ${requiredId}`,
        relatedRuleIds: [requiredId],
      })
    }
  }

  for (const tokenId of provided) {
    const resolution = resolveCanonRule({
      registry,
      ruleId: tokenId,
      caseOrSubjectId: packet.subjectId,
      boundReleaseId: input.boundReleaseId,
      releaseCatalog: input.releaseCatalog,
    })
    if (resolution.kind === 'unknown_rule') {
      diagnostics.push({
        code: 'unknown_rule_token',
        field: 'ruleTokenIds',
        message: `Unknown rule token ${tokenId}`,
        relatedRuleIds: [tokenId],
      })
    } else if (resolution.kind === 'unavailable_in_release') {
      diagnostics.push({
        code: 'unavailable_in_release',
        field: 'ruleTokenIds',
        message: `Rule token ${tokenId} unavailable under bound release`,
        relatedRuleIds: [tokenId],
      })
    }
    // exception_recorded / superseded / applied are acceptable lineage evidence
  }

  const forbidden = new Set(guardrail.forbiddenBreakIds.map((id) => id.trim()))
  for (const breakId of packet.breakIds ?? []) {
    if (forbidden.has(breakId.trim())) {
      diagnostics.push({
        code: 'forbidden_break',
        field: 'breakIds',
        message: `Forbidden break ${breakId}`,
      })
    }
  }

  const reuse = new Set(guardrail.motifReuseHooks.map((id) => id.trim()))
  let novelCount = 0
  for (const motif of packet.motifIds) {
    if (!reuse.has(motif.trim())) novelCount += 1
  }
  if (novelCount > guardrail.noveltyBudget) {
    diagnostics.push({
      code: 'novelty_budget_exceeded',
      field: 'motifIds',
      message: `Novelty budget ${guardrail.noveltyBudget} exceeded (${novelCount} novel motifs)`,
    })
  }

  const providedSet = new Set(provided)
  for (const contradiction of packet.declaredContradictions ?? []) {
    const a = contradiction.ruleA.trim()
    const b = contradiction.ruleB.trim()
    if (providedSet.has(a) && providedSet.has(b)) {
      // Exception on either rule for this subject can authorize unusual combinations.
      const resA = resolveCanonRule({
        registry,
        ruleId: a,
        caseOrSubjectId: packet.subjectId,
        boundReleaseId: input.boundReleaseId,
        releaseCatalog: input.releaseCatalog,
      })
      const resB = resolveCanonRule({
        registry,
        ruleId: b,
        caseOrSubjectId: packet.subjectId,
        boundReleaseId: input.boundReleaseId,
        releaseCatalog: input.releaseCatalog,
      })
      if (resA.kind === 'exception_recorded' || resB.kind === 'exception_recorded') {
        continue
      }
      diagnostics.push({
        code: 'contradictory_rule_combination',
        field: 'declaredContradictions',
        message: `Contradictory rule combination ${a} + ${b}`,
        relatedRuleIds: [a, b],
      })
    }
  }

  const frozen = freezeDiagnostics(diagnostics)
  if (frozen.length > 0) {
    return { ok: false, diagnostics: frozen }
  }
  return {
    ok: true,
    packet: Object.freeze({
      ...packet,
      ruleTokenIds: Object.freeze([...provided]),
      motifIds: Object.freeze([...packet.motifIds]),
    }),
    diagnostics: frozen,
  }
}
