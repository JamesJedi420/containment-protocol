/** Validate an explicitly authored escalation increment; omission is permitted. */
export class InvalidMissionEscalationRuleError extends Error {
  constructor() {
    super(
      'This campaign cannot be loaded because an active mission has an invalid escalation increment. Keep the original save and restore a compatible backup.'
    )
    this.name = 'InvalidMissionEscalationRuleError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function assertMissionEscalationCompatibility(game: unknown): void {
  if (!isRecord(game) || !isRecord(game.cases)) return

  for (const value of Object.values(game.cases)) {
    if (!isRecord(value) || value.status === 'resolved') continue
    const rule = value.onUnresolved
    if (!isRecord(rule) || rule.stageDelta === undefined) continue
    const increment = rule.stageDelta
    if (typeof increment !== 'number' || !Number.isInteger(increment) || increment < 0) {
      throw new InvalidMissionEscalationRuleError()
    }
  }
}
