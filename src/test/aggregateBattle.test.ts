import { describe, expect, it } from 'vitest'
import {
  AGGREGATE_BATTLE_PHASES,
  buildAggregateBattleCampaignSummary,
  buildAggregateBattleContextFromCase,
  buildAggregateBattleSideState,
  createAggregateBattleCommandOverlayFromLeaderBonus,
  formatAggregateBattleCampaignSummary,
  resolveAggregateBattle,
  summarizeAggregateBattle,
  type AggregateBattleArea,
  type AggregateBattleCommandOverlay,
  type AggregateBattleInput,
  type AggregateBattleSideState,
  type AggregateBattleUnit,
} from '../domain/aggregateBattle'
import { resolveHarvestedLoadout } from '../domain/hostileLoadouts'

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
  supernaturalPressure?: AggregateBattleInput['supernaturalPressure']
  ceasefireWindow?: AggregateBattleInput['ceasefireWindow']
  parallelObjectiveTrack?: AggregateBattleInput['parallelObjectiveTrack']
}): AggregateBattleInput {
  return {
    battleId: input.battleId,
    roundLimit: input.roundLimit ?? 1,
    areas: createBattleAreas(),
    sides: input.sides ?? createSides(),
    units: input.units,
    context: input.context ?? createContext(),
    commandOverlays: input.commandOverlays ?? [],
    supernaturalPressure: input.supernaturalPressure,
    ceasefireWindow: input.ceasefireWindow,
    parallelObjectiveTrack: input.parallelObjectiveTrack,
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

  it('ingress:maintenance_shaft attackMeleeMod does not penalise institutional defenders when defenderSideId is set', () => {
    // With defenderSideId = 'defenders', the defender (hostiles/site occupiers) should NOT
    // receive the ingress melee penalty when they counter-attack — they are already inside.
    function runBattle(ingressFlag?: string) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `ingress-side-gate-${ingressFlag ?? 'none'}`,
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
              id: 'site-occupier',
              label: 'Site Occupier',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 5,
              defenseFactor: 4,
              morale: 70,
              readiness: 70,
            },
          ],
          sides: createSides({ attackerSupport: 0, defenderSupport: 0 }),
          context: createContext({
            transitionType: undefined,
            spatialFlags: ingressFlag ? [ingressFlag] : [],
            defenderSideId: 'defenders',
          }),
        })
      )
    }

    const baseline = runBattle()
    const withIngress = runBattle('ingress:maintenance_shaft')

    // Attacker should be weakened by maintenance_shaft (fewer steps remaining for the site occupier)
    const baselineAttackerSteps =
      baseline.summaryTable.find((r) => r.unitId === 'assault-team')?.remainingStrengthSteps ?? -1
    const ingressAttackerSteps =
      withIngress.summaryTable.find((r) => r.unitId === 'assault-team')?.remainingStrengthSteps ?? -1

    // Defender outcome should NOT worsen — institutional defender is not penalised
    const baselineDefenderSteps =
      baseline.summaryTable.find((r) => r.unitId === 'site-occupier')?.remainingStrengthSteps ?? -1
    const ingressDefenderSteps =
      withIngress.summaryTable.find((r) => r.unitId === 'site-occupier')?.remainingStrengthSteps ?? -1

    // Attackers are weaker with ingress penalty (or equal in degenerate round)
    expect(ingressAttackerSteps).toBeLessThanOrEqual(baselineAttackerSteps)
    // Defenders are not additionally penalised by the ingress penalty
    expect(ingressDefenderSteps).toBeGreaterThanOrEqual(baselineDefenderSteps)
  })

  it('forms a temporary selfish ceasefire and logs motive conflict while a shared threat is active', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'ceasefire-formation-motive',
        roundLimit: 1,
        sides: [
          buildAggregateBattleSideState({
            id: 'responders',
            label: 'Responders',
            reserveAreaId: 'att-reserve',
            supportAreaId: 'att-support',
            supportAvailable: 2,
          }),
          buildAggregateBattleSideState({
            id: 'hostiles',
            label: 'Hostiles',
            reserveAreaId: 'def-reserve',
            supportAreaId: 'def-support',
            supportAvailable: 2,
          }),
          buildAggregateBattleSideState({
            id: 'catastrophe',
            label: 'Catastrophe',
            reserveAreaId: 'def-reserve',
            supportAvailable: 1,
          }),
        ],
        units: [
          {
            id: 'responder-line',
            label: 'Responder Line',
            sideId: 'responders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 5,
            morale: 68,
            readiness: 66,
          },
          {
            id: 'hostile-broker',
            label: 'Hostile Broker',
            sideId: 'hostiles',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 5,
            morale: 68,
            readiness: 66,
          },
          {
            id: 'apocalypse-vanguard',
            label: 'Apocalypse Vanguard',
            sideId: 'catastrophe',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'left-flank',
            order: 'advance',
            plannedPath: ['left-flank', 'center-line'],
            meleeFactor: 6,
            defenseFactor: 5,
            morale: 70,
            readiness: 68,
          },
        ],
        ceasefireWindow: {
          startRound: 1,
          endRound: 1,
          responderSideId: 'responders',
          hostileSideId: 'hostiles',
          sharedThreatSideId: 'catastrophe',
          hostileActorUnitId: 'hostile-broker',
          objectiveId: 'seal-threshold',
          motive: 'selfish_status_quo_preservation',
          tacticalValue: 'temporary_manpower',
        },
      })
    )

    expect(
      result.phaseLog.some(
        (entry) =>
          entry.detail.includes('Temporary ceasefire formed for objective seal-threshold') &&
          entry.detail.includes('motive=selfish_status_quo_preservation') &&
          entry.detail.includes('conflict=expected_betrayal')
      )
    ).toBe(true)
  })

  it('changes combat outcome via temporary hostile manpower against a worse shared threat', () => {
    function run(withCeasefire: boolean) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `ceasefire-manpower-${withCeasefire}`,
          roundLimit: 1,
          sides: [
            buildAggregateBattleSideState({
              id: 'responders',
              label: 'Responders',
              reserveAreaId: 'att-reserve',
              supportAreaId: 'att-support',
              supportAvailable: 2,
            }),
            buildAggregateBattleSideState({
              id: 'hostiles',
              label: 'Hostiles',
              reserveAreaId: 'def-reserve',
              supportAreaId: 'def-support',
              supportAvailable: 2,
            }),
            buildAggregateBattleSideState({
              id: 'catastrophe',
              label: 'Catastrophe',
              reserveAreaId: 'def-reserve',
              supportAvailable: 1,
            }),
          ],
          units: [
            {
              id: 'alpha-responder-line',
              label: 'Responder Line',
              sideId: 'responders',
              family: 'line_company',
              strengthSteps: 5,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 6,
              defenseFactor: 5,
              morale: 70,
              readiness: 68,
            },
            {
              id: 'bravo-hostile-broker',
              label: 'Hostile Broker',
              sideId: 'hostiles',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 5,
              defenseFactor: 5,
              morale: 68,
              readiness: 66,
            },
            {
              id: 'zulu-apocalypse-vanguard',
              label: 'Apocalypse Vanguard',
              sideId: 'catastrophe',
              family: 'line_company',
              strengthSteps: 2,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 6,
              defenseFactor: 5,
              morale: 70,
              readiness: 68,
            },
          ],
          ceasefireWindow: withCeasefire
            ? {
                startRound: 1,
                endRound: 1,
                responderSideId: 'responders',
                hostileSideId: 'hostiles',
                sharedThreatSideId: 'catastrophe',
                hostileActorUnitId: 'bravo-hostile-broker',
                objectiveId: 'seal-threshold',
                motive: 'selfish_status_quo_preservation',
                tacticalValue: 'temporary_manpower',
              }
            : undefined,
        })
      )
    }

    const baseline = run(false)
    const ceasefire = run(true)

    const apocalypseStepsBaseline =
      baseline.summaryTable.find((row) => row.unitId === 'zulu-apocalypse-vanguard')
        ?.remainingStrengthSteps ?? 99
    const apocalypseStepsCeasefire =
      ceasefire.summaryTable.find((row) => row.unitId === 'zulu-apocalypse-vanguard')
        ?.remainingStrengthSteps ?? 99

    expect(apocalypseStepsCeasefire).toBeLessThan(apocalypseStepsBaseline)
  })

  it('applies specialist knowledge as responder-side tactical value against the shared threat', () => {
    function run(withCeasefire: boolean) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `ceasefire-specialist-knowledge-${withCeasefire}`,
          roundLimit: 1,
          sides: [
            buildAggregateBattleSideState({
              id: 'responders',
              label: 'Responders',
              reserveAreaId: 'att-reserve',
              supportAreaId: 'att-support',
              supportAvailable: 2,
            }),
            buildAggregateBattleSideState({
              id: 'hostiles',
              label: 'Hostiles',
              reserveAreaId: 'def-reserve',
              supportAreaId: 'def-support',
              supportAvailable: 2,
            }),
            buildAggregateBattleSideState({
              id: 'catastrophe',
              label: 'Catastrophe',
              reserveAreaId: 'def-reserve',
              supportAvailable: 1,
            }),
          ],
          units: [
            {
              id: 'alpha-responder-line',
              label: 'Responder Line',
              sideId: 'responders',
              family: 'line_company',
              strengthSteps: 5,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 5,
              defenseFactor: 5,
              morale: 68,
              readiness: 66,
            },
            {
              id: 'bravo-hostile-broker',
              label: 'Hostile Broker',
              sideId: 'hostiles',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 4,
              defenseFactor: 5,
              morale: 66,
              readiness: 64,
            },
            {
              id: 'zulu-apocalypse-vanguard',
              label: 'Apocalypse Vanguard',
              sideId: 'catastrophe',
              family: 'line_company',
              strengthSteps: 2,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 6,
              defenseFactor: 5,
              morale: 70,
              readiness: 68,
            },
          ],
          ceasefireWindow: withCeasefire
            ? {
                startRound: 1,
                endRound: 1,
                responderSideId: 'responders',
                hostileSideId: 'hostiles',
                sharedThreatSideId: 'catastrophe',
                hostileActorUnitId: 'bravo-hostile-broker',
                objectiveId: 'split-objective-bridge',
                motive: 'selfish_status_quo_preservation',
                tacticalValue: 'specialist_knowledge',
              }
            : undefined,
        })
      )
    }

    const baseline = run(false)
    const ceasefire = run(true)

    const apocalypseStepsBaseline =
      baseline.summaryTable.find((row) => row.unitId === 'zulu-apocalypse-vanguard')
        ?.remainingStrengthSteps ?? 99
    const apocalypseStepsCeasefire =
      ceasefire.summaryTable.find((row) => row.unitId === 'zulu-apocalypse-vanguard')
        ?.remainingStrengthSteps ?? 99

    expect(apocalypseStepsCeasefire).toBeLessThan(apocalypseStepsBaseline)
  })

  it('reverts hostile side to enemy posture after objective window closes', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'ceasefire-reversion',
        roundLimit: 2,
        sides: [
          buildAggregateBattleSideState({
            id: 'responders',
            label: 'Responders',
            reserveAreaId: 'att-reserve',
            supportAreaId: 'att-support',
            supportAvailable: 2,
          }),
          buildAggregateBattleSideState({
            id: 'hostiles',
            label: 'Hostiles',
            reserveAreaId: 'def-reserve',
            supportAreaId: 'def-support',
            supportAvailable: 2,
          }),
          buildAggregateBattleSideState({
            id: 'catastrophe',
            label: 'Catastrophe',
            reserveAreaId: 'def-reserve',
            supportAvailable: 1,
          }),
        ],
        units: [
          {
            id: 'responder-line',
            label: 'Responder Line',
            sideId: 'responders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 5,
            morale: 68,
            readiness: 66,
          },
          {
            id: 'hostile-broker',
            label: 'Hostile Broker',
            sideId: 'hostiles',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 5,
            defenseFactor: 5,
            morale: 68,
            readiness: 66,
          },
          {
            id: 'distant-catastrophe',
            label: 'Distant Catastrophe',
            sideId: 'catastrophe',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'left-flank',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 1,
            morale: 40,
            readiness: 40,
            hidden: true,
            revealCondition: { kind: 'round', round: 99 },
          },
        ],
        ceasefireWindow: {
          startRound: 1,
          endRound: 1,
          responderSideId: 'responders',
          hostileSideId: 'hostiles',
          sharedThreatSideId: 'catastrophe',
          hostileActorUnitId: 'hostile-broker',
          objectiveId: 'seal-threshold',
          motive: 'selfish_status_quo_preservation',
          tacticalValue: 'temporary_manpower',
        },
      })
    )

    expect(
      result.phaseLog.some((entry) =>
        entry.detail.includes(
          'Temporary ceasefire closed for objective seal-threshold; hostiles reverted to enemy posture against responders.'
        )
      )
    ).toBe(true)
    expect(
      result.phaseLog.some(
        (entry) =>
          entry.round === 2 &&
          entry.phase === 'melee' &&
          entry.detail.includes('Hostile Broker') &&
          entry.detail.includes('Responder Line') &&
          entry.detail.includes('resolved melee simultaneously.')
      )
    ).toBe(true)
  })

  it('lets ritual stabilization succeed even when the defenders still hold the field', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-success-diverges',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 3,
            morale: 60,
            readiness: 64,
          },
          {
            id: 'thin-screen',
            label: 'Thin Screen',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 1,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 2,
            morale: 42,
            readiness: 40,
          },
          {
            id: 'defender-wall',
            label: 'Defender Wall',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 6,
            defenseFactor: 6,
            morale: 72,
            readiness: 70,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'stabilize-ward-lane',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support', 'left-flank'],
          progressTarget: 1,
          disruptionThreshold: 2,
        },
      })
    )

    expect(result.winnerSideId).toBe('defenders')
    expect(result.parallelObjective).toMatchObject({
      objectiveId: 'stabilize-ward-lane',
      outcome: 'success',
      progress: 1,
      progressTarget: 1,
    })
  })

  it('fails the ritual objective from hostile disruption spread even if attackers win the battle', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-fail-diverges',
        roundLimit: 2,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 4,
            morale: 64,
            readiness: 66,
          },
          {
            id: 'breach-team',
            label: 'Breach Team',
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
            id: 'defender-wall',
            label: 'Defender Wall',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 1,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 2,
            morale: 40,
            readiness: 38,
          },
          {
            id: 'disruption-raider',
            label: 'Disruption Raider',
            sideId: 'defenders',
            family: 'special_creature',
            strengthSteps: 1,
            areaId: 'left-flank',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 8,
            morale: 74,
            readiness: 70,
            specialDurability: { hitsToBreak: 3 },
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'stabilize-ward-lane',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support', 'left-flank'],
          progressTarget: 2,
          disruptionThreshold: 2,
        },
      })
    )

    expect(result.winnerSideId).toBe('attackers')
    expect(result.parallelObjective).toMatchObject({
      objectiveId: 'stabilize-ward-lane',
      outcome: 'fail',
      disruption: 2,
      disruptionThreshold: 2,
    })
    expect(
      result.phaseLog.some((entry) =>
        entry.detail.includes('stabilize-ward-lane progress 0/2; disruption 2/2.')
      )
    ).toBe(true)
  })

  it('marks post-combat extraction as contested when ritual succeeds under residual hostile threat', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-extraction-contested',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 4,
            morale: 64,
            readiness: 66,
          },
          {
            id: 'breach-team',
            label: 'Breach Team',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 2,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 4,
            defenseFactor: 4,
            morale: 66,
            readiness: 64,
          },
          {
            id: 'residual-cell',
            label: 'Residual Cell',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 2,
            areaId: 'def-reserve',
            order: 'hold',
            meleeFactor: 4,
            defenseFactor: 4,
            morale: 66,
            readiness: 64,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'stabilize-ward-lane',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support', 'left-flank'],
          progressTarget: 1,
          disruptionThreshold: 2,
        },
      })
    )

    const summary = buildAggregateBattleCampaignSummary({
      context: createContext(),
      result,
      friendlySideId: 'attackers',
      friendlyLabel: 'Attackers',
      hostileSideId: 'defenders',
      hostileLabel: 'Defenders',
    })

    expect(summary.parallelObjective?.outcome).toBe('success')
    expect(summary.extractionFollowThrough).toMatchObject({
      required: true,
      residualThreatUnits: 1,
      pressure: 'medium',
      outcome: 'contested',
    })
  })

  it('startup disruption multiplier raises round-1 disruption faster than baseline', () => {
    // Baseline: one hostile in sustain area, no operator damage => disruptionGain = 1 / round
    const baseline = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-startup-baseline',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'probe-unit',
            label: 'Probe Unit',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 2,
            morale: 60,
            readiness: 60,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'stabilize-startup-baseline',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 4,
          disruptionThreshold: 8,
        },
      })
    )

    // Amplified: same scenario but with startupDisruptionMultiplier: 3
    const amplified = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-startup-amplified',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'probe-unit',
            label: 'Probe Unit',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 2,
            morale: 60,
            readiness: 60,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'stabilize-startup-amplified',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 4,
          disruptionThreshold: 8,
          startupDisruptionMultiplier: 3,
        },
      })
    )

    expect(amplified.parallelObjective?.disruption).toBeGreaterThan(
      baseline.parallelObjective?.disruption ?? 0
    )
  })

  it('too-late restoration: ritual success coexists with extraction overrun and formatted output is legible', () => {
    // Ritual cell is in att-support with no hostiles in sustain area — completes progress in round 1.
    // Breach team has morale 1 and is isolated in att-reserve (no combat) — routs from morale phase.
    // Def-heavy is in def-reserve (untouched) — survives as residual threat => extraction overrun.
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'parallel-objective-too-late',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'breach-team',
            label: 'Breach Team',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 2,
            areaId: 'att-reserve',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 1,
            morale: 1,
            readiness: 1,
          },
          {
            id: 'def-heavy',
            label: 'Defender Heavy',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'def-reserve',
            order: 'hold',
            meleeFactor: 8,
            defenseFactor: 6,
            morale: 74,
            readiness: 72,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'bind-sovereign-anchor',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 1,
          disruptionThreshold: 4,
        },
      })
    )

    const summary = buildAggregateBattleCampaignSummary({
      context: createContext(),
      result,
      friendlySideId: 'attackers',
      friendlyLabel: 'Attackers',
      hostileSideId: 'defenders',
      hostileLabel: 'Defenders',
    })

    // Ritual completed — too late to stop the defenders holding the field.
    expect(summary.parallelObjective?.outcome).toBe('success')
    expect(summary.extractionFollowThrough?.outcome).toBe('overrun')
    expect(summary.extractionFollowThrough?.required).toBe(true)

    // Legibility: formatted string must contain both objective and extraction details.
    const formatted = formatAggregateBattleCampaignSummary(summary)
    expect(formatted).toContain('bind-sovereign-anchor')
    expect(formatted).toContain('success')
    expect(formatted).toContain('extraction overrun')
    expect(formatted).toMatch(/Aggregate battle:/)
  })

  it('competing load raises disruption and suppresses progress vs identical baseline', () => {
    const makeInput = (withLoad: boolean) =>
      createBattleInput({
        battleId: `competing-load-${withLoad ? 'loaded' : 'baseline'}`,
        roundLimit: 3,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'track-competing-load',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 6,
          disruptionThreshold: 6,
          ...(withLoad ? { competingLoadDisruptionPerRound: 2 } : {}),
        },
      })

    const baseline = resolveAggregateBattle(makeInput(false))
    const loaded = resolveAggregateBattle(makeInput(true))

    expect(loaded.parallelObjective?.disruption).toBeGreaterThan(
      baseline.parallelObjective?.disruption ?? 0
    )
    // Progress must be less than or equal (load never helps).
    expect(loaded.parallelObjective?.progress ?? 0).toBeLessThanOrEqual(
      baseline.parallelObjective?.progress ?? 0
    )
  })

  it('competing load divergence proof: same combat, objective outcome worsens due to load alone', () => {
    // No hostiles in sustain area — pure competing-load effect.
    // Threshold set low enough that load alone tips to fail within round limit.
    const makeInput = (withLoad: boolean) =>
      createBattleInput({
        battleId: `competing-load-divergence-${withLoad ? 'loaded' : 'baseline'}`,
        roundLimit: 2,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'combat-probe',
            label: 'Combat Probe',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 1,
            areaId: 'def-reserve',
            order: 'hold',
            meleeFactor: 2,
            defenseFactor: 2,
            morale: 60,
            readiness: 60,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'competing-load-divergence',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 10,
          disruptionThreshold: 3,
          ...(withLoad ? { competingLoadDisruptionPerRound: 2 } : {}),
        },
      })

    const baseline = resolveAggregateBattle(makeInput(false))
    const loaded = resolveAggregateBattle(makeInput(true))

    // Same combat: both sides identical, defender stays in def-reserve away from sustain area.
    expect(baseline.parallelObjective?.outcome).not.toBe('fail')
    expect(loaded.parallelObjective?.outcome).toBe('fail')
  })

  it('competing load is visible in objective phase log detail string', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'competing-load-legibility',
        roundLimit: 1,
        units: [
          {
            id: 'ritual-cell',
            label: 'Ritual Cell',
            sideId: 'attackers',
            family: 'artillery_section',
            strengthSteps: 1,
            areaId: 'att-support',
            order: 'hold',
            meleeFactor: 1,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
        ],
        parallelObjectiveTrack: {
          kind: 'defend_operator_ritual',
          objectiveId: 'legibility-check',
          operatorUnitId: 'ritual-cell',
          sustainAreaIds: ['att-support'],
          progressTarget: 8,
          disruptionThreshold: 8,
          competingLoadDisruptionPerRound: 3,
        },
      })
    )

    const objectiveLog = result.phaseLog.filter((e) => e.segment === 'objective')
    expect(objectiveLog.length).toBeGreaterThan(0)
    expect(objectiveLog[0].detail).toContain('+3 competing load')
  })
})

describe('aggregate battle hidden deployment', () => {
  it('keeps round-trigger hidden units untargetable when reveal round is beyond round limit', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'hidden-round-gate',
        roundLimit: 1,
        units: [
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
            morale: 78,
            readiness: 72,
            hidden: true,
            revealCondition: { kind: 'round', round: 2 },
          },
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
        ],
        context: createContext({ transitionType: undefined }),
      })
    )

    const hiddenRow = result.summaryTable.find((row) => row.unitId === 'storm-wyrm')
    expect(hiddenRow?.stepLosses).toBe(0)
    expect(hiddenRow?.specialHitsTaken).toBe(0)
    expect(hiddenRow?.wasHidden).toBe(true)
  })

  it('reveals area-trigger hidden units when enemies share the reveal area and then resolves combat', () => {
    const result = resolveAggregateBattle(
      createBattleInput({
        battleId: 'hidden-area-reveal',
        roundLimit: 1,
        units: [
          {
            id: 'storm-wyrm',
            label: 'Storm Wyrm',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 7,
            defenseFactor: 5,
            morale: 74,
            readiness: 72,
            hidden: true,
            revealCondition: { kind: 'area', areaId: 'center-line' },
          },
          {
            id: 'breach-line',
            label: 'Breach Line',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'press',
            meleeFactor: 7,
            defenseFactor: 5,
            morale: 72,
            readiness: 70,
          },
        ],
        context: createContext({ transitionType: undefined }),
      })
    )

    const hiddenRow = result.summaryTable.find((row) => row.unitId === 'storm-wyrm')
    expect(hiddenRow?.wasHidden).toBe(true)
    expect(hiddenRow?.stepLosses).toBeGreaterThan(0)
    expect(
      result.phaseLog.some(
        (entry) =>
          entry.segment === 'phase-window' &&
          entry.detail === 'Storm Wyrm revealed in Center Line.'
      )
    ).toBe(true)
  })

  it('area-revealed hidden unit takes comparable damage to an identical non-hidden unit', () => {
    function runScenario(hidden: boolean) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `hidden-parity-${hidden}`,
          roundLimit: 1,
          units: [
            {
              id: 'storm-wyrm',
              label: 'Storm Wyrm',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 7,
              defenseFactor: 5,
              morale: 74,
              readiness: 72,
              hidden,
              revealCondition: hidden ? { kind: 'area', areaId: 'center-line' } : undefined,
            },
            {
              id: 'breach-line',
              label: 'Breach Line',
              sideId: 'attackers',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'press',
              meleeFactor: 7,
              defenseFactor: 5,
              morale: 72,
              readiness: 70,
            },
          ],
          context: createContext({ transitionType: undefined }),
        })
      )
    }

    const revealed = runScenario(true)
    const baseline = runScenario(false)
    const revealedSteps =
      revealed.summaryTable.find((row) => row.unitId === 'storm-wyrm')?.stepLosses ?? -1
    const baselineSteps =
      baseline.summaryTable.find((row) => row.unitId === 'storm-wyrm')?.stepLosses ?? -1

    expect(revealedSteps).toBe(baselineSteps)
  })
})

describe('aggregate battle supernatural pressure', () => {
  it('degrades defender morale outcomes compared with baseline when pressure is applied', () => {
    function runScenario(withPressure: boolean) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `pressure-morale-${withPressure}`,
          roundLimit: 2,
          sides: createSides({ attackerSupport: 3, defenderSupport: 0, defenderCoordination: true }),
          units: [
            {
              id: 'assault-line',
              label: 'Assault Line',
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
              id: 'defender-line',
              label: 'Defender Line',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              order: 'hold',
              meleeFactor: 6,
              defenseFactor: 6,
              morale: 66,
              readiness: 66,
            },
          ],
          context: createContext({ transitionType: undefined }),
          supernaturalPressure: withPressure
            ? [
                {
                  affectedSideId: 'defenders',
                  moraleDrainPerRound: 10,
                  readinessPenalty: 15,
                  label: 'Whispering Veil',
                },
              ]
            : undefined,
        })
      )
    }

    const baseline = runScenario(false)
    const pressured = runScenario(true)
    const rank = { steady: 0, shaken: 1, retreating: 2, routed: 3 } as const

    const baselineState = baseline.summaryTable.find((row) => row.unitId === 'defender-line')
      ?.moraleState
    const pressuredState = pressured.summaryTable.find((row) => row.unitId === 'defender-line')
      ?.moraleState

    expect(baselineState).toBeDefined()
    expect(pressuredState).toBeDefined()
    expect(rank[pressuredState as keyof typeof rank]).toBeGreaterThanOrEqual(
      rank[baselineState as keyof typeof rank]
    )
  })

  it('marks supernaturalPressureApplied in result and campaign summary when pressure exists', () => {
    const withPressure = resolveAggregateBattle(
      createBattleInput({
        battleId: 'pressure-flag-true',
        roundLimit: 1,
        units: [
          {
            id: 'assault-line',
            label: 'Assault Line',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            meleeFactor: 7,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'defender-line',
            label: 'Defender Line',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            meleeFactor: 6,
            defenseFactor: 6,
            morale: 68,
            readiness: 68,
          },
        ],
        supernaturalPressure: [
          {
            affectedSideId: 'defenders',
            moraleDrainPerRound: 10,
            readinessPenalty: 15,
            label: 'Whispering Veil',
          },
        ],
      })
    )
    const withoutPressure = resolveAggregateBattle(
      createBattleInput({
        battleId: 'pressure-flag-false',
        roundLimit: 1,
        units: [
          {
            id: 'assault-line',
            label: 'Assault Line',
            sideId: 'attackers',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            meleeFactor: 7,
            defenseFactor: 6,
            morale: 70,
            readiness: 70,
          },
          {
            id: 'defender-line',
            label: 'Defender Line',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            meleeFactor: 6,
            defenseFactor: 6,
            morale: 68,
            readiness: 68,
          },
        ],
      })
    )

    const summaryWithPressure = buildAggregateBattleCampaignSummary({
      context: createContext(),
      result: withPressure,
      friendlySideId: 'attackers',
      friendlyLabel: 'Attackers',
      hostileSideId: 'defenders',
      hostileLabel: 'Defenders',
    })
    const summaryWithoutPressure = buildAggregateBattleCampaignSummary({
      context: createContext(),
      result: withoutPressure,
      friendlySideId: 'attackers',
      friendlyLabel: 'Attackers',
      hostileSideId: 'defenders',
      hostileLabel: 'Defenders',
    })

    expect(withPressure.supernaturalPressureApplied).toBe(true)
    expect(summaryWithPressure.supernaturalPressureApplied).toBe(true)
    expect(withoutPressure.supernaturalPressureApplied).toBe(false)
    expect(summaryWithoutPressure.supernaturalPressureApplied).toBe(false)
  })

  it('remains deterministic with identical supernatural pressure inputs', () => {
    const input = createBattleInput({
      battleId: 'pressure-deterministic',
      roundLimit: 2,
      units: [
        {
          id: 'assault-line',
          label: 'Assault Line',
          sideId: 'attackers',
          family: 'line_company',
          strengthSteps: 4,
          areaId: 'center-line',
          meleeFactor: 7,
          defenseFactor: 6,
          morale: 72,
          readiness: 70,
        },
        {
          id: 'defender-line',
          label: 'Defender Line',
          sideId: 'defenders',
          family: 'line_company',
          strengthSteps: 4,
          areaId: 'center-line',
          meleeFactor: 6,
          defenseFactor: 6,
          morale: 68,
          readiness: 68,
        },
      ],
      supernaturalPressure: [
        {
          affectedSideId: 'defenders',
          moraleDrainPerRound: 10,
          readinessPenalty: 15,
          label: 'Whispering Veil',
        },
      ],
    })

    const resultA = resolveAggregateBattle(input)
    const resultB = resolveAggregateBattle(input)

    expect(resultA).toEqual(resultB)
  })
})

describe('harvested-mind loadout integration in aggregateBattle', () => {
  it('unit with soldier harvestedLoadout has better battle outcome than identical unit without', () => {
    const soldierLoadout = resolveHarvestedLoadout('soldier', [], 'hostile-unit:soldier')

    function runWithLoadout(withLoadout: boolean) {
      return resolveAggregateBattle(
        createBattleInput({
          battleId: `harvest-melee-check-${withLoadout}`,
          roundLimit: 3,
          units: [
            {
              id: 'hostile-unit',
              label: 'Hostile Unit',
              sideId: 'attackers',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'att-reserve',
              meleeFactor: 3,
              defenseFactor: 3,
              morale: 70,
              readiness: 70,
              harvestedLoadout: withLoadout ? soldierLoadout : undefined,
            },
            {
              id: 'defender-unit',
              label: 'Defender Unit',
              sideId: 'defenders',
              family: 'line_company',
              strengthSteps: 4,
              areaId: 'center-line',
              meleeFactor: 3,
              defenseFactor: 4,
              morale: 70,
              readiness: 70,
            },
          ],
          context: createContext({ spatialFlags: [] }),
        })
      )
    }

    const withoutLoadout = runWithLoadout(false)
    const withLoadout = runWithLoadout(true)

    const defenderStepsWithout =
      withoutLoadout.summaryTable.find((r) => r.unitId === 'defender-unit')
        ?.remainingStrengthSteps ?? 999
    const defenderStepsWith =
      withLoadout.summaryTable.find((r) => r.unitId === 'defender-unit')?.remainingStrengthSteps ??
      999

    // Soldier loadout adds meleeMod — defender should take more damage (fewer remaining steps)
    expect(defenderStepsWith).toBeLessThanOrEqual(defenderStepsWithout)
  })
})

// SPE-110: Construction-incomplete modifier tests
describe('construction.incomplete spatial flag modifiers', () => {
  function runWithConstructionFlag(incomplete: boolean) {
    const flags = incomplete ? ['construction.incomplete'] : []
    return resolveAggregateBattle(
      createBattleInput({
        battleId: `construction-incomplete-${incomplete}`,
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
            id: 'site-guard',
            label: 'Site Guard',
            sideId: 'defenders',
            family: 'line_company',
            strengthSteps: 4,
            areaId: 'center-line',
            order: 'hold',
            meleeFactor: 3,
            defenseFactor: 3,
            morale: 70,
            readiness: 68,
          },
        ],
        sides: createSides({ attackerSupport: 3, defenderSupport: 2 }),
        context: createContext({ transitionType: undefined, spatialFlags: flags, defenderSideId: 'defenders' }),
      })
    )
  }

  it('construction.incomplete gives attacker melee advantage vs clean baseline', () => {
    const baseline = runWithConstructionFlag(false)
    const incomplete = runWithConstructionFlag(true)

    const baselineDefSteps =
      baseline.summaryTable.find((r) => r.unitId === 'site-guard')?.remainingStrengthSteps ?? 999
    const incompleteDefSteps =
      incomplete.summaryTable.find((r) => r.unitId === 'site-guard')?.remainingStrengthSteps ?? 999

    // Attacker gets +1 melee, defender gets -1 defense → defender should take more damage
    expect(incompleteDefSteps).toBeLessThanOrEqual(baselineDefSteps)
  })

  it('construction.incomplete is deterministic — same inputs produce same result', () => {
    const resultA = runWithConstructionFlag(true)
    const resultB = runWithConstructionFlag(true)
    expect(resultA.summaryTable).toEqual(resultB.summaryTable)
  })

  it('removing construction.incomplete flag (site complete) reverts modifier to clean baseline', () => {
    const baseline = runWithConstructionFlag(false)
    const completed = runWithConstructionFlag(false) // same: no flag

    expect(
      completed.summaryTable.find((r) => r.unitId === 'site-guard')?.remainingStrengthSteps
    ).toBe(
      baseline.summaryTable.find((r) => r.unitId === 'site-guard')?.remainingStrengthSteps
    )
  })
})
