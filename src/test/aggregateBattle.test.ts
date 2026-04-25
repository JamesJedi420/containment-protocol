import { describe, expect, it } from 'vitest'
import {
  AGGREGATE_BATTLE_PHASES,
  buildAggregateBattleContextFromCase,
  buildAggregateBattleSideState,
  createAggregateBattleCommandOverlayFromLeaderBonus,
  resolveAggregateBattle,
  summarizeAggregateBattle,
  type AggregateBattleArea,
  type AggregateBattleCommandOverlay,
  type AggregateBattleInput,
  type AggregateBattleSideState,
  type AggregateBattleUnit,
} from '../domain/aggregateBattle'

function createBattleAreas(): AggregateBattleArea[] {
  return [
    {
      id: 'att-reserve',
      label: 'Attacker Reserve',
      kind: 'reserve',
      occupancyCapacity: 8,
      frontageCapacity: 2,
      adjacent: ['center-line', 'left-flank'],
    },
    {
      id: 'att-support',
      label: 'Attacker Support',
      kind: 'support',
      occupancyCapacity: 4,
      frontageCapacity: 0,
      adjacent: ['left-flank'],
    },
    {
      id: 'center-line',
      label: 'Center Line',
      kind: 'line',
      occupancyCapacity: 8,
      frontageCapacity: 6,
      adjacent: ['att-reserve', 'def-reserve', 'left-flank'],
    },
    {
      id: 'left-flank',
      label: 'Left Flank',
      kind: 'line',
      occupancyCapacity: 8,
      frontageCapacity: 6,
      adjacent: ['att-reserve', 'att-support', 'center-line', 'def-support'],
    },
    {
      id: 'def-reserve',
      label: 'Defender Reserve',
      kind: 'reserve',
      occupancyCapacity: 8,
      frontageCapacity: 2,
      adjacent: ['center-line'],
    },
    {
      id: 'def-support',
      label: 'Defender Support',
      kind: 'support',
      occupancyCapacity: 4,
      frontageCapacity: 0,
      adjacent: ['left-flank'],
    },
  ]
}

function createSides(
  options: {
    attackerSupport?: number
    defenderSupport?: number
    defenderCoordination?: boolean
  } = {}
): AggregateBattleSideState[] {
  return [
    buildAggregateBattleSideState({
      id: 'attackers',
      label: 'Attackers',
      reserveAreaId: 'att-reserve',
      supportAreaId: 'att-support',
      supportAvailable: options.attackerSupport ?? 3,
      legitimacy: { sanctionLevel: 'sanctioned' },
    }),
    buildAggregateBattleSideState({
      id: 'defenders',
      label: 'Defenders',
      reserveAreaId: 'def-reserve',
      supportAreaId: 'def-support',
      supportAvailable: options.defenderSupport ?? 2,
      coordinationFrictionActive: options.defenderCoordination ?? false,
      legitimacy: { sanctionLevel: 'covert' },
    }),
  ]
}

function createContext(
  overrides: Partial<ReturnType<typeof buildAggregateBattleContextFromCase>> = {}
) {
  return {
    ...buildAggregateBattleContextFromCase({
      tags: ['ritual', 'occult'],
      requiredTags: [],
      preferredTags: [],
      siteLayer: 'transition',
      visibilityState: 'clear',
      transitionType: 'threshold',
      spatialFlags: ['night'],
    }),
    ...overrides,
  }
}

function createBattleInput(input: {
  battleId: string
  roundLimit?: number
  units: AggregateBattleUnit[]
  sides?: AggregateBattleSideState[]
  context?: ReturnType<typeof buildAggregateBattleContextFromCase>
  commandOverlays?: AggregateBattleCommandOverlay[]
}): AggregateBattleInput {
  return {
    battleId: input.battleId,
    roundLimit: input.roundLimit ?? 1,
    areas: createBattleAreas(),
    sides: input.sides ?? createSides(),
    units: input.units,
    context: input.context ?? createContext(),
    commandOverlays: input.commandOverlays ?? [],
  }
}

describe('aggregate battle layer', () => {
  it('stays deterministic and preserves different family aggregation scales in one battle flow', () => {
    const input = createBattleInput({
      battleId: 'aggregation-scale-check',
      roundLimit: 1,
      units: [
        {
          id: 'alpha-company',
          label: 'Alpha Company',
          sideId: 'attackers',
          family: 'line_company',
          strengthSteps: 4,
          areaId: 'att-reserve',
          meleeFactor: 5,
          defenseFactor: 5,
          morale: 68,
          readiness: 64,
        },
        {
          id: 'iron-wings',
          label: 'Iron Wings',
          sideId: 'attackers',
          family: 'mounted_wing',
          strengthSteps: 2,
          areaId: 'att-support',
          meleeFactor: 4,
          defenseFactor: 5,
          morale: 74,
          readiness: 70,
        },
        {
          id: 'watch-horde',
          label: 'Watch Horde',
          sideId: 'defenders',
          family: 'horde_mass',
          strengthSteps: 3,
          areaId: 'def-support',
          meleeFactor: 4,
          defenseFactor: 4,
          morale: 60,
          readiness: 55,
        },
      ],
      context: createContext(),
    })

    const resultA = resolveAggregateBattle(input)
    const resultB = resolveAggregateBattle(input)

    expect(resultA).toEqual(resultB)
    expect(input.context.regionTag).toBe('occult_district')
    expect(
      resultA.summaryTable.find((row) => row.unitId === 'alpha-company')?.representedStrength
    ).toBe(160)
    expect(
      resultA.summaryTable.find((row) => row.unitId === 'iron-wings')?.representedStrength
    ).toBe(30)
    expect(summarizeAggregateBattle(resultA)[0]).toMatch(/represented/i)
  })

  it('runs the ordered multi-phase loop and resolves melee mutually', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'mutual-melee-check',
        roundLimit: 1,
        units: [
          {
            id: 'alpha-company',
            label: 'Alpha Company',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'press',
            meleeFactor: 7,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'gate-guard',
            label: 'Gate Guard',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 7,
            defenseFactor: 6,
            morale: 70,
            readiness: 68,
          },
        ],
        sides: createSides({ attackerSupport: 3, defenderSupport: 3 }),
        context: createContext({ transitionType: 'chokepoint' }),
      })
    )

    const phaseOrder = result.phaseLog
      .filter((entry) => entry.round === 1 && entry.segment === 'phase-window')
      .map((entry) => entry.phase)

    expect(phaseOrder).toEqual(AGGREGATE_BATTLE_PHASES)
    expect(
      result.phaseLog.some(
        (entry) =>
          entry.round === 1 && entry.phase === 'melee' && entry.segment === 'mutual-resolution'
      )
    ).toBe(true)
    expect(
      result.summaryTable.find((row) => row.unitId === 'alpha-company')?.remainingStrengthSteps
    ).toBe(3)
    expect(
      result.summaryTable.find((row) => row.unitId === 'gate-guard')?.remainingStrengthSteps
    ).toBe(3)
  })

  it('only applies commander overlays to formations sharing the anchor area', () => {
    const leaderBonus = {
      effectivenessMultiplier: 1.15,
      eventModifier: 0.25,
      xpBonus: 0.2,
      stressModifier: -0.1,
    }
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'command-presence-check',
        roundLimit: 1,
        sides: createSides({ attackerSupport: 3, defenderSupport: 0, defenderCoordination: true }),
        units: [
          {
            id: 'center-pressure',
            label: 'Center Pressure',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'press',
            meleeFactor: 8,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
          {
            id: 'flank-pressure',
            label: 'Flank Pressure',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'left-flank',
            order: 'press',
            meleeFactor: 8,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
          {
            id: 'command-cohort',
            label: 'Command Cohort',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 4,
            morale: 58,
            readiness: 60,
            commanderOverlayId: 'def-command',
          },
          {
            id: 'remote-cohort',
            label: 'Remote Cohort',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'left-flank',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 4,
            morale: 58,
            readiness: 60,
            commanderOverlayId: 'def-command',
          },
        ],
        context: createContext({ transitionType: undefined }),
        commandOverlays: [
          createAggregateBattleCommandOverlayFromLeaderBonus({
            id: 'def-command',
            sideId: 'defenders',
            label: 'Forward Command',
            areaId: 'def-reserve',
            anchorUnitId: 'command-cohort',
            authority: 'sanctioned',
            leaderBonus,
          }),
        ],
      })
    )

    expect(
      result.summaryTable.find((row) => row.unitId === 'command-cohort')?.remainingStrengthSteps
    ).toBe(3)
    expect(
      result.summaryTable.find((row) => row.unitId === 'remote-cohort')?.remainingStrengthSteps
    ).toBe(2)
  })

  it('denies chaining movement through hostile control zones', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'control-zone-check',
        roundLimit: 1,
        units: [
          {
            id: 'iron-wings',
            label: 'Iron Wings',
            sideId: 'attackers',
            family: 'mounted_wing',
            strengthSteps: 2,
            areaId: 'att-reserve',
            order: 'advance',
            plannedPath: ['att-reserve', 'center-line', 'def-reserve'],
            meleeFactor: 4,
            defenseFactor: 7,
            morale: 80,
            readiness: 70,
            movement: 2,
          },
          {
            id: 'gate-guard',
            label: 'Gate Guard',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 3,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 4,
            defenseFactor: 7,
            morale: 68,
            readiness: 66,
          },
        ],
        context: createContext({ transitionType: undefined }),
      })
    )

    expect(result.movementDenials).toHaveLength(1)
    expect(result.movementDenials[0]).toMatchObject({
      unitId: 'iron-wings',
      reason: 'hostile_control_chain',
      blockedAt: 'center-line',
    })
    expect(result.summaryTable.find((row) => row.unitId === 'iron-wings')?.areaId).toBe(
      'center-line'
    )
    expect(result.summaryTable.find((row) => row.unitId === 'iron-wings')?.areaId).not.toBe(
      'def-reserve'
    )
  })

  it('branches morale beyond binary outcomes and keeps routed units in a persistent fallback state', () => {
    const defenderCommand = createAggregateBattleCommandOverlayFromLeaderBonus({
      id: 'def-command',
      sideId: 'defenders',
      label: 'Rear Command',
      areaId: 'center-line',
      authority: 'covert',
      leaderBonus: {
        effectivenessMultiplier: 1.15,
        eventModifier: 0.2,
        xpBonus: 0.15,
        stressModifier: -0.1,
      },
    })

    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'morale-routing-check',
        roundLimit: 2,
        sides: createSides({ attackerSupport: 3, defenderSupport: 0, defenderCoordination: true }),
        units: [
          {
            id: 'field-guns',
            label: 'Field Guns',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-reserve',
            order: 'hold',
            meleeFactor: 2,
            missileFactor: 9,
            defenseFactor: 4,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'assault-line',
            label: 'Assault Line',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'left-flank',
            order: 'press',
            meleeFactor: 8,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
          {
            id: 'center-pressure',
            label: 'Center Pressure',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'press',
            meleeFactor: 7,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
          {
            id: 'a-camp-horde',
            label: 'Camp Horde',
            sideId: 'defenders',
            family: 'horde_mass',
            strengthSteps: 5,
            areaId: 'left-flank',
            order: 'hold',
            meleeFactor: 4,
            defenseFactor: 4,
            morale: 40,
            readiness: 45,
          },
          {
            id: 'rear-guard',
            label: 'Rear Guard',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 3,
            areaId: 'center-line',
            order: 'rally',
            meleeFactor: 5,
            defenseFactor: 5,
            morale: 58,
            readiness: 60,
            commanderOverlayId: 'def-command',
          },
        ],
        context: createContext({ transitionType: undefined }),
        commandOverlays: [defenderCommand],
      })
    )

    const routedHorde = result.summaryTable.find((row) => row.unitId === 'a-camp-horde')
    const rearGuard = result.summaryTable.find((row) => row.unitId === 'rear-guard')

    expect(routedHorde).toMatchObject({
      moraleState: 'routed',
      areaId: 'def-support',
    })
    expect(routedHorde?.routedRounds).toBeGreaterThan(0)
    expect(rearGuard?.moraleState).toMatch(/shaken|retreating/)
  })

  it('lets special units survive multiple hits on a separate durability track', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'special-durability-check',
        roundLimit: 1,
        sides: createSides({ attackerSupport: 3, defenderSupport: 1 }),
        units: [
          {
            id: 'field-guns',
            label: 'Field Guns',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-reserve',
            order: 'hold',
            meleeFactor: 2,
            missileFactor: 9,
            defenseFactor: 4,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'breach-line',
            label: 'Breach Line',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'press',
            meleeFactor: 8,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
          {
            id: 'storm-wyrm',
            label: 'Storm Wyrm',
            sideId: 'defenders',
            family: 'special_creature',
            strengthSteps: 1,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 7,
            defenseFactor: 5,
            morale: 80,
            readiness: 72,
          },
        ],
        context: createContext({ transitionType: undefined }),
      })
    )

    expect(result.summaryTable.find((row) => row.unitId === 'storm-wyrm')).toMatchObject({
      remainingStrengthSteps: 1,
      specialHitsTaken: 2,
      specialHitsToBreak: 3,
      destroyed: false,
    })
  })

  it('ingress:maintenance_shaft reduces attacker melee effectiveness vs unmodified baseline', () => {
    // Attack band 2 (value 5) vs defense band 0 (value 2, supply cut) = 2 step hits baseline.
    // maintenance_shaft applies attackMeleeMod -1: attack band 1 (value 4) = 1 step hit.
    function runWithIngress(ingressFlag?: string) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `ingress-maintenance-${ingressFlag ?? 'none'}`,
          roundLimit: 1,
          units: [
            {
              id: 'assault-team',
              label: 'Assault Team',
              sideId: 'attackers',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'press',
              meleeFactor: 5,
              defenseFactor: 4,
              morale: 70,
              readiness: 70,
            },
            {
              id: 'gate-hold',
              label: 'Gate Hold',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 2,
              defenseFactor: 2,
              morale: 70,
              readiness: 68,
            },
          ],
          sides: createSides({ attackerSupport: 3, defenderSupport: 0 }),
          context: createContext({
            transitionType: undefined,
            spatialFlags: ingressFlag ? [ingressFlag] : [],
          }),
        })
      )
    }

    const baseline = runWithIngress()
    const restricted = runWithIngress('ingress:maintenance_shaft')
    const baselineDefenderSteps =
      baseline.summaryTable.find((r) => r.unitId === 'gate-hold')?.remainingStrengthSteps ?? -1
    const restrictedDefenderSteps =
      restricted.summaryTable.find((r) => r.unitId === 'gate-hold')?.remainingStrengthSteps ?? -1

    expect(baselineDefenderSteps).toBeLessThan(restrictedDefenderSteps)
  })

  it('ingress:floodgate increases defender melee protection vs unmodified baseline', () => {
    // Attack band 2 (value 5) vs defense band 0 (value 2, supply cut) = 2 step hits baseline.
    // floodgate applies defenseVsMeleeMod +1: defender defense band 1 (value 3) = 1 step hit.
    function runWithIngress(ingressFlag?: string) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `ingress-floodgate-${ingressFlag ?? 'none'}`,
          roundLimit: 1,
          units: [
            {
              id: 'breach-team',
              label: 'Breach Team',
              sideId: 'attackers',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'press',
              meleeFactor: 5,
              defenseFactor: 4,
              morale: 70,
              readiness: 70,
            },
            {
              id: 'gate-hold',
              label: 'Gate Hold',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 2,
              defenseFactor: 2,
              morale: 70,
              readiness: 68,
            },
          ],
          sides: createSides({ attackerSupport: 3, defenderSupport: 0 }),
          context: createContext({
            transitionType: undefined,
            spatialFlags: ingressFlag ? [ingressFlag] : [],
          }),
        })
      )
    }

    const baseline = runWithIngress()
    const fortified = runWithIngress('ingress:floodgate')
    const baselineDefenderSteps =
      baseline.summaryTable.find((r) => r.unitId === 'gate-hold')?.remainingStrengthSteps ?? -1
    const fortifiedDefenderSteps =
      fortified.summaryTable.find((r) => r.unitId === 'gate-hold')?.remainingStrengthSteps ?? -1

    expect(baselineDefenderSteps).toBeLessThan(fortifiedDefenderSteps)
  })
})
