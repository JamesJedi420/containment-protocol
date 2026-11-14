import { test, expect } from '@playwright/test'
import { createStartingState } from '../src/data/startingState'
import {
  clearCampaignStorage,
  advanceOperationalWeek,
  attachPageErrorProbe,
  expectNoPageErrors,
} from './support/cpApp'

// Constructed live-store states exercise projection edges. Legacy import currently drops defeatConditionCertainty (SPE-58); no persistence or acquisition claim.
function fixture() {
  const game = createStartingState()
  game.reports = [
    {
      week: 1,
      rngStateBefore: 1,
      rngStateAfter: 2,
      newCases: [],
      progressedCases: [],
      resolvedCases: [],
      failedCases: [],
      partialCases: [],
      unresolvedTriggers: [],
      spawnedCases: [],
      maxStage: 1,
      avgFatigue: 0,
      teamStatus: [],
      notes: [],
    },
  ]
  game.knowledge = {
    't_nightwatch::case-001': {
      entityId: 't_nightwatch',
      entityType: 'team',
      subjectId: 'case-001',
      subjectType: 'anomaly',
      tier: 'partial',
      defeatConditionCertainty: 'family',
      trueClassification: 'PRIVATE_CLASSIFICATION',
      source: 'PRIVATE_SOURCE',
      relayFailed: true,
      lastRelayFailedWeek: 1,
      fusedFrom: ['PRIVATE_FUSION_A', 'PRIVATE_FUSION_B'],
      lastFusedWeek: 1,
    },
    't_greentape::case-002': {
      entityId: 't_greentape',
      entityType: 'team',
      subjectId: 'case-002',
      subjectType: 'hazard',
      tier: 'confirmed',
      masked: true,
      defeatConditionCertainty: 'exact',
    },
  }
  return JSON.stringify(game)
}

for (const width of [1440, 390, 320]) {
  test(`knowledge audience preview is isolated and keyboard operable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const probe = attachPageErrorProbe(page)
    await clearCampaignStorage(page)
    await page.evaluate(async (raw) => {
      const modulePath = '/src/app/store/gameStore.ts'
      const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
      useGameStore.setState({ game: JSON.parse(raw) as import('../src/domain/models').GameState })
    }, fixture())
    await page.getByRole('link', { name: 'Reports', exact: true }).first().click()
    await page.getByRole('link', { name: /^Week 1$/i }).click()
    const panel = page.getByRole('region', { name: 'Knowledge audience preview' })
    await expect(panel).toBeVisible()
    const publicChoice = panel.getByRole('radio', { name: 'Public', exact: true })
    const restrictedChoice = panel.getByRole('radio', {
      name: 'Restricted / operator',
      exact: true,
    })
    await expect(publicChoice).toBeChecked()
    expect(
      await panel
        .locator('label')
        .evaluateAll((labels) =>
          labels.every((label) => label.getBoundingClientRect().height >= 48)
        )
    ).toBe(true)
    await expect(panel.getByText('Subject case-001: Bypass method family suspected.')).toBeVisible()
    expect(await panel.innerHTML()).not.toMatch(/PRIVATE|Team t_greentape|Relay failed/)
    const before = await page.evaluate(async () => {
      const modulePath = '/src/app/store/gameStore.ts'
      const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
      return JSON.stringify(useGameStore.getState().game.knowledge)
    })
    await publicChoice.focus()
    await publicChoice.press('ArrowRight')
    await expect(restrictedChoice).toBeChecked()
    await expect(restrictedChoice).toBeFocused()
    await expect(panel.getByText('Team t_greentape', { exact: true })).toBeVisible()
    await expect(panel.getByText('Relay failed (week 1)', { exact: true })).toBeVisible()
    await expect(panel.getByText(/Fused from PRIVATE_FUSION_A/)).toBeVisible()
    expect(await panel.innerHTML()).not.toContain('PRIVATE_CLASSIFICATION')
    await panel.screenshot({ path: testInfo.outputPath(`restricted-${width}.png`) })
    await restrictedChoice.press('ArrowLeft')
    await expect(publicChoice).toBeChecked()
    await expect(publicChoice).toBeFocused()
    expect(await panel.innerHTML()).not.toMatch(/PRIVATE|Team t_greentape|Relay failed/)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true)
    const after = await page.evaluate(async () => {
      const modulePath = '/src/app/store/gameStore.ts'
      const { useGameStore }: typeof import('../src/app/store/gameStore') = await import(modulePath)
      return JSON.stringify(useGameStore.getState().game.knowledge)
    })
    expect(after).toBe(before)
    await panel.screenshot({ path: testInfo.outputPath(`public-${width}.png`) })
    await expectNoPageErrors(probe)
    probe.dispose()
  })
}

test('a new campaign reaches the preview through advance-week and report controls', async ({
  page,
}) => {
  const probe = attachPageErrorProbe(page)
  await clearCampaignStorage(page)
  await advanceOperationalWeek(page)
  await page.getByRole('link', { name: 'Reports', exact: true }).first().click()
  await page.getByRole('link', { name: /^Week 1$/i }).click()
  const panel = page.getByRole('region', { name: 'Knowledge audience preview' })
  await expect(panel).toBeVisible()
  await panel.getByRole('radio', { name: 'Restricted / operator', exact: true }).check()
  await expect(
    panel.getByRole('radio', { name: 'Restricted / operator', exact: true })
  ).toBeChecked()
  await expectNoPageErrors(probe)
  probe.dispose()
})
