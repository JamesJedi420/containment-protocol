/**
 * SPE-3428 Temporary command delegation and deterministic handback (slice 1)
 * Pure domain helper: compact grant envelope, issuance validation, terminal transitions.
 * Does not mutate permanent office, role succession, or authority graph.
 */

export type DelegationStatus = 'active' | 'expired' | 'withdrawn' | 'handed_back' | 'superseded'

export type DelegationReason =
  | 'invalid_grantor'
  | 'ineligible_delegate'
  | 'scope_conflict'
  | 'unauthorized'
  | 'expired'
  | 'withdrawn'
  | 'handed_back'
  | 'superseded'
  | 'grantor_unavailable'
  | 'contested'

export interface TemporaryDelegation {
  id: string
  grantorId: string
  delegateId: string
  roleBasis: string
  permittedScope: string[]
  effectiveFrom: number
  effectiveUntil: number | null
  status: DelegationStatus
  issuedAt: number
  terminatedAt?: number
  terminationReason?: DelegationReason
  provenance: string
}

export interface DelegationIssuanceInput {
  id: string
  grantorId: string
  delegateId: string
  roleBasis: string
  permittedScope: string[]
  effectiveFrom: number
  effectiveUntil: number | null
  now: number
  grantorAuthorityValid: boolean
  delegateEligible: boolean
  existingActiveConflict: boolean
  provenance: string
}

export interface DelegationIssuanceResult {
  ok: boolean
  delegation?: TemporaryDelegation
  reason?: DelegationReason
}

export function issueTemporaryDelegation(input: DelegationIssuanceInput): DelegationIssuanceResult {
  if (!input.grantorAuthorityValid) {
    return { ok: false, reason: 'invalid_grantor' }
  }
  if (!input.delegateEligible) {
    return { ok: false, reason: 'ineligible_delegate' }
  }
  if (input.existingActiveConflict) {
    return { ok: false, reason: 'scope_conflict' }
  }
  if (input.permittedScope.length === 0) {
    return { ok: false, reason: 'unauthorized' }
  }
  if (input.effectiveFrom > input.now) {
    return { ok: false, reason: 'unauthorized' }
  }

  const delegation: TemporaryDelegation = {
    id: input.id,
    grantorId: input.grantorId,
    delegateId: input.delegateId,
    roleBasis: input.roleBasis,
    permittedScope: [...input.permittedScope],
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil,
    status: 'active',
    issuedAt: input.now,
    provenance: input.provenance,
  }
  return { ok: true, delegation }
}

export function isDelegationAuthorizing(
  delegation: TemporaryDelegation,
  commandScope: string,
  now: number,
): boolean {
  if (delegation.status !== 'active') return false
  if (now < delegation.effectiveFrom) return false
  if (delegation.effectiveUntil !== null && now >= delegation.effectiveUntil) return false
  return delegation.permittedScope.includes(commandScope)
}

export function terminateDelegation(
  delegation: TemporaryDelegation,
  reason: DelegationReason,
  now: number,
): TemporaryDelegation {
  if (delegation.status !== 'active') return delegation
  const status: DelegationStatus =
    reason === 'expired'
      ? 'expired'
      : reason === 'withdrawn'
        ? 'withdrawn'
        : reason === 'handed_back'
          ? 'handed_back'
          : 'superseded'
  return {
    ...delegation,
    status,
    terminatedAt: now,
    terminationReason: reason,
  }
}

export function handbackDelegation(
  delegation: TemporaryDelegation,
  now: number,
  routeStillValid: boolean,
): TemporaryDelegation {
  if (!routeStillValid) {
    return terminateDelegation(delegation, 'contested', now)
  }
  return terminateDelegation(delegation, 'handed_back', now)
}
