export class UnsupportedInventoryQuantityError extends Error {
  constructor() {
    super('Inventory quantity is outside the supported safe integer range.')
    this.name = 'UnsupportedInventoryQuantityError'
  }
}

/** Aggregate stock must retain exact single-unit arithmetic across save/load and consumption. */
export function sanitizeInventoryQuantity(value: unknown, fallback = 0): number {
  const quantity = typeof value === 'number' ? value : fallback
  if (!Number.isFinite(quantity) || Math.abs(quantity) > Number.MAX_SAFE_INTEGER) {
    throw new UnsupportedInventoryQuantityError()
  }
  return Math.max(0, Math.trunc(quantity))
}

export function hasInventoryCapacity(stock: unknown, quantity: number): boolean {
  return (
    Number.isSafeInteger(quantity) &&
    quantity >= 0 &&
    quantity <= Number.MAX_SAFE_INTEGER - sanitizeInventoryQuantity(stock)
  )
}
