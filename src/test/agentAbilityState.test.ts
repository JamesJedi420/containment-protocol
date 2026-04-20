// cspell:words cooldown
import { describe, expect, it } from 'vitest'
import { createAgent } from '../domain/agent/factory'
import { normalizeAgent } from '../domain/agent/normalize'
import type { Agent } from '../domain/models'

describe('agent ability runtime state normalization', () => {
  it('hydrates default runtime state for active abilities', () => {
    const agent = createAgent({
      id: 'a_active',
      name: 'A. Active',
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

    expect(agent.abilityState).toBeDefined()
    expect(agent.abilityState?.['signal-overclock']).toEqual({ cooldownRemaining: 0 })
  })

  it('sanitizes invalid runtime fields and preserves valid ones', () => {
    const raw: Agent = {
      id: 'a_raw',
      name: 'R. Raw',
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
      abilityState: {
        'ward-hum': {
          cooldownRemaining: -5,
          lastUsedWeek: 0,
          usesConsumedThisWeek: Number.NaN,
        },
      },
      tags: ['forensics'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    }

    const normalized = normalizeAgent(raw)

    expect(normalized.abilityState?.['ward-hum']).toEqual({
      cooldownRemaining: 0,
      lastUsedWeek: 1,
    })
  })

  it('keeps passive-only agents free of runtime ability state by default', () => {
    const agent = createAgent({
      id: 'a_passive',
      name: 'P. Passive',
      role: 'medium',
      baseStats: { combat: 20, investigation: 55, utility: 40, social: 65 },
      abilities: [
        {
          id: 'civil-calibration',
          label: 'Civil Calibration',
          type: 'passive',
          effect: { presence: 2 },
        },
      ],
      tags: ['medium'],
      relationships: {},
      fatigue: 0,
      status: 'active',
    })

    expect(agent.abilityState).toBeUndefined()
  })
})
