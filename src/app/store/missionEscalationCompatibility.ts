/** Reject an active saved case when its future deadline behavior is unknown. */
export class MissingMissionEscalationRuleError extends Error {
  constructor() {
    super(
      'This campaign cannot be loaded because an active mission has an incomplete escalation rule. Keep the original save and restore a compatible backup.'
    )
    this.name = 'MissingMissionEscalationRuleError'
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
    const increment = isRecord(rule) ? rule.stageDelta : undefined
    if (typeof increment !== 'number' || !Number.isInteger(increment) || increment < 0) {
      throw new MissingMissionEscalationRuleError()
    }
  }
}
