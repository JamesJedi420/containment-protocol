import { getEquipmentDefinition } from './equipment'

export const MAX_DAMAGED_EQUIPMENT_QUEUE_LENGTH = 64

export function sanitizeDamagedEquipmentQueue(
  value: unknown,
  inventory: Record<string, number>,
  fallback: readonly string[] = []
): string[] {
  const source = Array.isArray(value) ? value : fallback
  const seen = new Set<string>()
  const queue: string[] = []

  for (const entry of source) {
    if (typeof entry !== 'string') {
      continue
    }

    const itemId = entry.trim()
    if (!itemId || seen.has(itemId)) {
      continue
    }

    if (!getEquipmentDefinition(itemId) || (inventory[itemId] ?? 0) <= 0) {
      continue
    }

    seen.add(itemId)
    queue.push(itemId)

    if (queue.length >= MAX_DAMAGED_EQUIPMENT_QUEUE_LENGTH) {
      break
    }
  }

  return queue
}
