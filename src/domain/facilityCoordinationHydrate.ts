/**
 * Shared hydrate/parse primitives for durable facility coordination registries
 * (SPE-3439 secure transfer, SPE-3500 authorized excursion).
 */

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasOwnEnumerableKey(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.propertyIsEnumerable.call(value, key)
}

export function isNonEmptyTrimmedString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function compareCodeUnitOrder(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

export function isFiniteNonNegativeWeek(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
  )
}

export function freezeCoordinationRecord<
  T extends {
    readonly reasonCodes: readonly string[]
    readonly appliedOperationKeys: readonly string[]
  },
>(record: T): Readonly<T> {
  const defined = Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined)
  ) as T
  return Object.freeze({
    ...defined,
    reasonCodes: Object.freeze([...record.reasonCodes]),
    appliedOperationKeys: Object.freeze([...record.appliedOperationKeys]),
  })
}

export function sortUniqueCodes<T extends string>(codes: readonly T[]): readonly T[] {
  return Object.freeze([...new Set(codes)].sort(compareCodeUnitOrder) as T[])
}

export function withSortedAppliedKey(
  keys: readonly string[],
  operationKey: string
): readonly string[] {
  if (keys.includes(operationKey)) return keys
  return Object.freeze([...keys, operationKey].sort(compareCodeUnitOrder))
}
