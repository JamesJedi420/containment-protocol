// cspell:words cooldown cooldowns
import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import {
  canExecuteActiveAbility,
  decrementActiveAbilityCooldowns,
  markActiveAbilityUsed,
} from '../domain/sim/abilityExecution'

describe('sim active ability execution helpers', () => {
  it('checks cooldown gates for active abilities', () => {
    const base = createAgent({
      id: 'a_exec',
      name: 'A. Exec',
      role: 'tech',
      baseStats: { combat: 30, investigation: 60, utility: 55, social: 25 },
      abilities: [
        {
          id: 'signal-overclock',
          label: 'Signal Overclock',
          type: 'active',
          trigger: 'OnCaseStart',
          cooldown: 2,
          effect: { control: 3 },
        },
      ],
      tags: ['tech'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    })

    expect(canExecuteActiveAbility(base, 'signal-overclock')).toBe(true)

    const used = markActiveAbilityUsed(base, 'signal-overclock', 5)
    expect(canExecuteActiveAbility(used, 'signal-overclock')).toBe(false)
  })

  it('records usage metadata and cooldown when active ability is used', () => {
    const base = createAgent({
      id: 'a_meta',
      name: 'A. Meta',
      role: 'investigator',
      baseStats: { combat: 25, investigation: 70, utility: 40, social: 35 },
      abilities: [
        {
          id: 'ward-hum',
          label: 'Ward Hum',
          type: 'active',
          trigger: 'OnExposure',
          cooldown: 3,
          effect: { anomaly: 4 },
        },
      ],
      tags: ['forensics'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    })

    const used = markActiveAbilityUsed(base, 'ward-hum', 8)

    expect(used.abilityState?.['ward-hum']).toEqual({
      cooldownRemaining: 3,
      lastUsedWeek: 8,
      usesConsumedThisWeek: 1,
    })
  })

  it('decrements cooldowns across the agent map and resets weekly usage counters', () => {
    const base = createAgent({
      id: 'a_tick',
      name: 'A. Tick',
      role: 'medium',
      baseStats: { combat: 20, investigation: 55, utility: 40, social: 65 },
      abilities: [
        {
          id: 'focus-burst',
          label: 'Focus Burst',
          type: 'active',
          trigger: 'OnResolutionCheck',
          cooldown: 2,
          effect: { insight: 2 },
        },
      ],
      tags: ['medium'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    })

    const used = markActiveAbilityUsed(base, 'focus-burst', 6)
    const decremented = decrementActiveAbilityCooldowns({ [used.id]: used })

    expect(decremented[used.id]?.abilityState?.['focus-burst']).toEqual({
      cooldownRemaining: 1,
      lastUsedWeek: 6,
      usesConsumedThisWeek: 0,
    })
  })
})
