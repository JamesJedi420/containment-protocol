import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import { getResolvedDifficultyRunConfiguration } from './campaignLedger'
import {
  RECOMMENDED_DIFFICULTY_PROFILE_ID,
  applyDifficultyEconomicPayout,
  applyDifficultyFatalityPressure,
  applyDifficultyInjuryPressure,
  applyDifficultyRenown,
  applyDifficultyUpkeep,
  applyDifficultyWages,
  applyDifficultyXp,
  projectBonusInstructorSlots,
  projectLowTierGraduateBountyPerSemester,
  projectMaxDeployableTeams,
  projectProspectQualityMultiplier,
  projectProspectVolumeMultiplier,
  projectStartingGold,
  resolveDifficultyRunConfiguration,
  resolveLegacyBaselineDifficulty,
  resolveLowTierGraduateBountyAward,
} from './difficultyProfileResolver'

describe('difficultyProfileResolver (SPE-3044)', () => {
  it('resolves Cozy as 1.0× baseline and Normal as recommended defaults', () => {
    const cozy = resolveDifficultyRunConfiguration({ profileId: 'cozy' })
    const normal = resolveDifficultyRunConfiguration({ profileId: 'normal' })
    expect(cozy.ok && normal.ok).toBe(true)
    if (!cozy.ok || !normal.ok) return
    expect(cozy.configuration.multipliers).toEqual({
      xp: 1,
      renown: 1,
      economicPayout: 1,
      injuryPressure: 1,
      fatalityPressure: 1,
      upkeep: 1,
      wages: 1,
    })
    expect(normal.configuration.multipliers).toEqual({
      xp: 0.8,
      renown: 0.8,
      economicPayout: 0.8,
      injuryPressure: 1.5,
      fatalityPressure: 2,
      upkeep: 1.5,
      wages: 1.25,
    })
    expect(normal.configuration.recommendedDefault).toBe(true)
    expect(RECOMMENDED_DIFFICULTY_PROFILE_ID).toBe('normal')
    expect(projectMaxDeployableTeams(normal.configuration)).toBe(16)
  })

  it('resolves Workhorse only from authored registry data and Custom with bounds', () => {
    const workhorse = resolveDifficultyRunConfiguration({
      profileId: 'workhorse',
      profileVersion: '1',
    })
    expect(workhorse.ok).toBe(true)
    if (!workhorse.ok) return
    expect(workhorse.configuration.label).toBe("Workhorse's Tier")
    expect(workhorse.configuration.multipliers.fatalityPressure).toBe(1.5)

    const custom = resolveDifficultyRunConfiguration({
      profileId: 'custom',
      custom: {
        runOptions: { maxDeployableTeams: 20, startingGold: 5000 },
        multipliers: { xp: 0.7 },
      },
    })
    expect(custom.ok).toBe(true)
    if (!custom.ok) return
    expect(custom.configuration.multipliers.xp).toBe(0.7)
    expect(projectMaxDeployableTeams(custom.configuration)).toBe(20)
    expect(projectStartingGold(custom.configuration)).toBe(5000)

    const again = resolveDifficultyRunConfiguration({
      profileId: 'custom',
      custom: {
        runOptions: { maxDeployableTeams: 20, startingGold: 5000 },
        multipliers: { xp: 0.7 },
      },
    })
    expect(again).toEqual(custom)
  })

  it('fails closed on unknown profile/version and invalid Custom / noMarketPurchases', () => {
    expect(resolveDifficultyRunConfiguration({ profileId: 'hardcore' }).ok).toBe(false)
    expect(
      resolveDifficultyRunConfiguration({ profileId: 'normal', profileVersion: '9' }).ok
    ).toBe(false)
    expect(
      resolveDifficultyRunConfiguration({
        profileId: 'custom',
        custom: { runOptions: { maxDeployableTeams: 99 } },
      }).ok
    ).toBe(false)
    expect(
      resolveDifficultyRunConfiguration({
        profileId: 'custom',
        custom: { runOptions: { noMarketPurchases: true } },
      }).ok
    ).toBe(false)
    expect(
      resolveDifficultyRunConfiguration({
        profileId: 'custom',
        custom: {
          runOptions: { noMarketPurchases: true },
          hasAlternateProgressionResourceRoute: true,
        },
      }).ok
    ).toBe(true)
  })

  it('exposes consumer adapters per modifier family and Custom options', () => {
    const normal = resolveDifficultyRunConfiguration({ profileId: 'normal' })
    expect(normal.ok).toBe(true)
    if (!normal.ok) return
    const c = normal.configuration
    expect(applyDifficultyXp(100, c)).toBe(80)
    expect(applyDifficultyRenown(100, c)).toBe(80)
    expect(applyDifficultyEconomicPayout(100, c)).toBe(80)
    expect(applyDifficultyInjuryPressure(10, c)).toBe(15)
    expect(applyDifficultyFatalityPressure(10, c)).toBe(20)
    expect(applyDifficultyUpkeep(10, c)).toBe(15)
    expect(applyDifficultyWages(100, c)).toBe(125)

    const custom = resolveDifficultyRunConfiguration({
      profileId: 'custom',
      custom: {
        runOptions: {
          bonusInstructorSlots: 2,
          prospectQualityMultiplier: 1.5,
          prospectVolumeMultiplier: 2,
          lowTierGraduateBounty: 40,
        },
      },
    })
    expect(custom.ok).toBe(true)
    if (!custom.ok) return
    expect(projectBonusInstructorSlots(custom.configuration)).toBe(2)
    expect(projectProspectQualityMultiplier(custom.configuration)).toBe(1.5)
    expect(projectProspectVolumeMultiplier(custom.configuration)).toBe(2)
    expect(projectLowTierGraduateBountyPerSemester(custom.configuration)).toBe(40)
    const award = resolveLowTierGraduateBountyAward({
      configuration: custom.configuration,
      campaignBountyAwardedSoFar: 480,
    })
    expect(award.award).toBe(20)
    expect(award.remainingCap).toBe(0)
    const negative = resolveLowTierGraduateBountyAward({
      configuration: custom.configuration,
      campaignBountyAwardedSoFar: -50,
    })
    expect(negative.award).toBe(40)
    expect(negative.remainingCap).toBe(460)
  })

  it('keeps legacy baseline on Cozy 1.0× without silent Normal adoption', () => {
    const legacy = resolveLegacyBaselineDifficulty()
    expect(legacy.profileId).toBe('cozy')
    expect(legacy.multipliers.xp).toBe(1)

    const game = createStartingState()
    expect(getResolvedDifficultyRunConfiguration(game).profileId).toBe('cozy')
    game.campaignLedger = {
      ...game.campaignLedger!,
      difficultyProfile: { profileId: 'normal', profileVersion: '1' },
    }
    expect(getResolvedDifficultyRunConfiguration(game).multipliers.xp).toBe(0.8)
  })
})
