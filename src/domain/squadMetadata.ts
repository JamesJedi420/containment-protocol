import type { Id } from './models'

export interface SquadMetadata {
  squadId: Id
  name: string
  role: string
  doctrine: string
  shift: string
  assignedZone: string
  designatedLeaderId: Id
}

export interface CreateSquadMetadataInput {
  squadId: Id
  name: string
  role: string
  doctrine: string
  shift: string
  assignedZone: string
  designatedLeaderId: Id
}

export interface UpdateSquadMetadataInput {
  name?: string
  role?: string
  doctrine?: string
  shift?: string
  assignedZone?: string
  designatedLeaderId?: Id
}

export type SquadMetadataFailureCode =
  | 'invalid_squad_id'
  | 'invalid_name'
  | 'invalid_role'
  | 'invalid_doctrine'
  | 'invalid_shift'
  | 'invalid_assigned_zone'
  | 'invalid_designated_leader_id'

export type CreateSquadMetadataResult =
  | {
      ok: true
      metadata: SquadMetadata
    }
  | {
      ok: false
      code: SquadMetadataFailureCode
    }

export type UpdateSquadMetadataResult =
  | {
      ok: true
      metadata: SquadMetadata
      changed: boolean
    }
  | {
      ok: false
      code: SquadMetadataFailureCode
      metadata: SquadMetadata
    }

function normalizeText(value: string | undefined | null) {
  return typeof value === 'string' ? value.trim() : ''
}

function validateCanonicalValue(
  code: SquadMetadataFailureCode,
  value: string | undefined | null
): { ok: true; value: string } | { ok: false; code: SquadMetadataFailureCode } {
  const normalized = normalizeText(value)

  if (normalized.length === 0) {
    return { ok: false, code }
  }

  return { ok: true, value: normalized }
}

function cloneMetadata(metadata: SquadMetadata): SquadMetadata {
  return {
    squadId: metadata.squadId,
    name: metadata.name,
    role: metadata.role,
    doctrine: metadata.doctrine,
    shift: metadata.shift,
    assignedZone: metadata.assignedZone,
    designatedLeaderId: metadata.designatedLeaderId,
  }
}

export function createSquadMetadata(input: CreateSquadMetadataInput): CreateSquadMetadataResult {
  const squadId = validateCanonicalValue('invalid_squad_id', input.squadId)
  if (!squadId.ok) {
    return { ok: false, code: squadId.code }
  }

  const name = validateCanonicalValue('invalid_name', input.name)
  if (!name.ok) {
    return { ok: false, code: name.code }
  }

  const role = validateCanonicalValue('invalid_role', input.role)
  if (!role.ok) {
    return { ok: false, code: role.code }
  }

  const doctrine = validateCanonicalValue('invalid_doctrine', input.doctrine)
  if (!doctrine.ok) {
    return { ok: false, code: doctrine.code }
  }

  const shift = validateCanonicalValue('invalid_shift', input.shift)
  if (!shift.ok) {
    return { ok: false, code: shift.code }
  }

  const assignedZone = validateCanonicalValue('invalid_assigned_zone', input.assignedZone)
  if (!assignedZone.ok) {
    return { ok: false, code: assignedZone.code }
  }

  const designatedLeaderId = validateCanonicalValue(
    'invalid_designated_leader_id',
    input.designatedLeaderId
  )
  if (!designatedLeaderId.ok) {
    return { ok: false, code: designatedLeaderId.code }
  }

  return {
    ok: true,
    metadata: {
      squadId: squadId.value,
      name: name.value,
      role: role.value,
      doctrine: doctrine.value,
      shift: shift.value,
      assignedZone: assignedZone.value,
      designatedLeaderId: designatedLeaderId.value,
    },
  }
}

export function updateSquadMetadata(
  metadata: SquadMetadata,
  patch: UpdateSquadMetadataInput
): UpdateSquadMetadataResult {
  const current = cloneMetadata(metadata)
  const next: SquadMetadata = cloneMetadata(metadata)

  if (Object.prototype.hasOwnProperty.call(patch, 'name')) {
    const name = validateCanonicalValue('invalid_name', patch.name)
    if (!name.ok) {
      return { ok: false, code: name.code, metadata: current }
    }
    next.name = name.value
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'role')) {
    const role = validateCanonicalValue('invalid_role', patch.role)
    if (!role.ok) {
      return { ok: false, code: role.code, metadata: current }
    }
    next.role = role.value
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'doctrine')) {
    const doctrine = validateCanonicalValue('invalid_doctrine', patch.doctrine)
    if (!doctrine.ok) {
      return { ok: false, code: doctrine.code, metadata: current }
    }
    next.doctrine = doctrine.value
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'shift')) {
    const shift = validateCanonicalValue('invalid_shift', patch.shift)
    if (!shift.ok) {
      return { ok: false, code: shift.code, metadata: current }
    }
    next.shift = shift.value
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'assignedZone')) {
    const assignedZone = validateCanonicalValue('invalid_assigned_zone', patch.assignedZone)
    if (!assignedZone.ok) {
      return { ok: false, code: assignedZone.code, metadata: current }
    }
    next.assignedZone = assignedZone.value
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'designatedLeaderId')) {
    const designatedLeaderId = validateCanonicalValue(
      'invalid_designated_leader_id',
      patch.designatedLeaderId
    )
    if (!designatedLeaderId.ok) {
      return { ok: false, code: designatedLeaderId.code, metadata: current }
    }
    next.designatedLeaderId = designatedLeaderId.value
  }

  const changed =
    current.name !== next.name ||
    current.role !== next.role ||
    current.doctrine !== next.doctrine ||
    current.shift !== next.shift ||
    current.assignedZone !== next.assignedZone ||
    current.designatedLeaderId !== next.designatedLeaderId

  return {
    ok: true,
    metadata: next,
    changed,
  }
}

export function getSquadMetadata(metadata: SquadMetadata): SquadMetadata {
  return cloneMetadata(metadata)
}
