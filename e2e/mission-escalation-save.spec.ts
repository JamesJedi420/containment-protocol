import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import {
  advanceOperationalWeek,
  attachPageErrorProbe,
  clearCampaignStorage,
  expectNoPageErrors,
  openPrimaryNav,
} from './support/cpApp'

type SavedEnvelope = {
  version: number
  state: {
    game: {
      cases: Record<
        string,
        {
          id: string
          title: string
          status: string
          stage: number
          onUnresolved: { stageDelta?: number }
        }
      >
    }
  }
}

test('invalid explicit escalation increments fail safely while a valid campaign continues', async ({
  browser,
}) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
  const page = await context.newPage()
  const probe = attachPageErrorProbe(page)
  const key = 'containment-protocol-game-state'
  try {
    await clearCampaignStorage(page)
    await advanceOperationalWeek(page)
    const original = await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key)
    const envelope = JSON.parse(original) as SavedEnvelope
    const spawned = Object.values(envelope.state.game.cases).find(
      (value) => value.title === 'Campus Outbreak' && value.status === 'open'
    )
    if (!spawned) throw new Error('Expected the generated Campus Outbreak mission')
    expect(spawned.stage).toBe(4)
    expect(spawned.onUnresolved.stageDelta).toBe(2)
    const incomplete = structuredClone(envelope)
    incomplete.state.game.cases[spawned.id].onUnresolved.stageDelta = -1
    const toExport = (saved: typeof envelope) =>
      JSON.stringify({
        kind: 'containment-protocol-run',
        version: saved.version,
        exportedAt: '2026-11-05T00:00:00.000Z',
        game: saved.state.game,
      })

    await page.getByText('Campaign import and export', { exact: true }).click()
    const input = page.getByLabel('Run payload')
    await input.fill(toExport(incomplete))
    const savedBeforeImport = await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey)!,
      key
    )
    await page.getByRole('button', { name: 'Import Run' }).click()
    await expect(
      page.getByRole('status').filter({ hasText: 'invalid escalation increment' })
    ).toBeVisible()
    const savedAfterImport = await page.evaluate(
      (storageKey) => localStorage.getItem(storageKey)!,
      key
    )
    expect(createHash('sha256').update(savedAfterImport).digest('hex')).toBe(
      createHash('sha256').update(savedBeforeImport).digest('hex')
    )

    await input.fill(toExport(envelope))
    await page.getByRole('button', { name: 'Import Run' }).click()
    await expect(page.getByRole('status').filter({ hasText: /imported/i })).toBeVisible()
    const imported = JSON.parse(
      await page.evaluate((storageKey) => localStorage.getItem(storageKey)!, key)
    ) as SavedEnvelope
    expect(imported.state.game.cases[spawned.id].onUnresolved.stageDelta).toBe(2)
    await advanceOperationalWeek(page)
    await page
      .getByRole('region', { name: 'Latest report' })
      .getByRole('link', { name: 'Week 2', exact: true })
      .click()
    const unresolved = page
      .getByRole('region', { name: 'Case outcomes' })
      .locator('section')
      .filter({ has: page.getByText('Unresolved cases', { exact: true }) })
    const outbreakResult = unresolved
      .locator(':scope > ul > li')
      .filter({ hasText: 'Campus Outbreak' })
    await expect(outbreakResult).toContainText(
      'difficulty, escalation pressure, duration, and deadline pressure'
    )
    await expect(outbreakResult).toContainText('Funding -35, containment -11, reputation -13.')
    await openPrimaryNav(page, 'Cases')
    await page
      .getByRole('region', { name: 'Case triage queue' })
      .getByRole('listitem')
      .filter({ hasText: 'Campus Outbreak' })
      .first()
      .getByRole('button', { name: 'Select Campus Outbreak for triage detail' })
      .click()
    await expect(
      page.getByRole('region', { name: 'Case triage detail: Campus Outbreak' })
    ).toContainText('Stage 5')
    await page.reload()
    await page
      .getByRole('region', { name: 'Case triage queue' })
      .getByRole('listitem')
      .filter({ hasText: 'Campus Outbreak' })
      .first()
      .getByRole('button', { name: 'Select Campus Outbreak for triage detail' })
      .click()
    await expect(
      page.getByRole('region', { name: 'Case triage detail: Campus Outbreak' })
    ).toContainText('Stage 5')

    for (const version of [envelope.version, 1]) {
      const broken = JSON.stringify({ ...incomplete, version })
      const recoveryContext = await browser.newContext({ baseURL: 'http://127.0.0.1:5173' })
      try {
        const recovery = await recoveryContext.newPage()
        const recoveryProbe = attachPageErrorProbe(recovery)
        await recovery.goto('/')
        await recovery.evaluate(
          ({ storageKey, value }) => localStorage.setItem(storageKey, value),
          {
            storageKey: key,
            value: broken,
          }
        )
        await recovery.reload()
        await expect(
          recovery.getByRole('heading', { name: 'Saved campaign unavailable' })
        ).toBeVisible()
        await expect(recovery.getByRole('alert')).toContainText('invalid escalation increment')
        await recovery.getByText('Show original saved data').focus()
        await recovery.keyboard.press('Enter')
        await expect(recovery.getByLabel('Original saved campaign data')).toHaveValue(broken)
        await recovery.evaluate(async () => {
          const modulePath = '/src/app/store/gameStore.ts'
          const { useGameStore } = await import(modulePath)
          useGameStore.setState({ gameReplacementRevision: 99 })
        })
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
        await recovery.reload()
        await expect(
          recovery.getByRole('heading', { name: 'Saved campaign unavailable' })
        ).toBeVisible()
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
        const restoreInput = recovery.getByLabel('Compatible run export')
        await restoreInput.fill(toExport(incomplete))
        await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
        await expect(recovery.getByRole('status')).toContainText('invalid escalation increment')
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
        await restoreInput.fill(
          JSON.stringify({
            kind: 'containment-protocol-run',
            version: envelope.version,
            exportedAt: '2026-11-05T00:00:00.000Z',
            game: null,
          })
        )
        await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
        await expect(recovery.getByRole('status')).toContainText(
          'does not contain saved campaign cases'
        )
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
        await restoreInput.fill(
          JSON.stringify({
            kind: 'containment-protocol-run',
            version: envelope.version,
            exportedAt: '2026-11-05T00:00:00.000Z',
            game: { ...envelope.state.game, cases: { invalid: null } },
          })
        )
        await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
        await expect(recovery.getByRole('status')).toContainText(
          'does not contain saved campaign cases'
        )
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
        await restoreInput.fill(toExport(envelope))
        if (version === envelope.version) {
          await recovery.evaluate(() => {
            const originalSetItem = Storage.prototype.setItem
            Storage.prototype.setItem = function (storageKey, value) {
              if (storageKey.includes('.recovery-')) throw new Error('Browser storage is full')
              return originalSetItem.call(this, storageKey, value)
            }
            window.addEventListener(
              'restore-native-storage',
              () => {
                Storage.prototype.setItem = originalSetItem
              },
              { once: true }
            )
          })
          await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
          await expect(recovery.getByRole('status')).toContainText('Browser storage is full')
          expect(
            await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)
          ).toBe(broken)
          await recovery.evaluate(() => window.dispatchEvent(new Event('restore-native-storage')))
          await recovery.evaluate((storageKey) => {
            const originalSetItem = Storage.prototype.setItem
            Storage.prototype.setItem = function (candidate, value) {
              if (candidate === storageKey) throw new Error('Could not replace the active save')
              return originalSetItem.call(this, candidate, value)
            }
            window.addEventListener(
              'restore-native-storage',
              () => {
                Storage.prototype.setItem = originalSetItem
              },
              { once: true }
            )
          }, key)
          await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
          await expect(recovery.getByRole('status')).toContainText(
            'Could not replace the active save'
          )
          expect(
            await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)
          ).toBe(broken)
          await recovery.evaluate(() => window.dispatchEvent(new Event('restore-native-storage')))
        }
        await recovery.getByRole('button', { name: 'Restore compatible run' }).click()
        await expect(recovery.getByRole('heading', { name: 'Operations Overview' })).toBeVisible()
        const copies = await recovery.evaluate((storageKey) => {
          return Object.keys(localStorage)
            .filter((candidate) => candidate.startsWith(`${storageKey}.recovery-`))
            .map((candidate) => localStorage.getItem(candidate))
        }, key)
        expect(copies).toContain(broken)
        const restored = JSON.parse(
          await recovery.evaluate((storageKey) => localStorage.getItem(storageKey)!, key)
        ) as SavedEnvelope
        expect(restored.state.game.cases[spawned.id].onUnresolved.stageDelta).toBe(2)
        await advanceOperationalWeek(recovery)
        await openPrimaryNav(recovery, 'Cases')
        await recovery
          .getByRole('region', { name: 'Case triage queue' })
          .getByRole('listitem')
          .filter({ hasText: 'Campus Outbreak' })
          .first()
          .getByRole('button', { name: 'Select Campus Outbreak for triage detail' })
          .click()
        await expect(
          recovery.getByRole('region', { name: 'Case triage detail: Campus Outbreak' })
        ).toContainText('Stage 5')
        await recovery.reload()
        await recovery
          .getByRole('region', { name: 'Case triage queue' })
          .getByRole('listitem')
          .filter({ hasText: 'Campus Outbreak' })
          .first()
          .getByRole('button', { name: 'Select Campus Outbreak for triage detail' })
          .click()
        await expect(
          recovery.getByRole('region', { name: 'Case triage detail: Campus Outbreak' })
        ).toContainText('Stage 5')
        expectNoPageErrors(recoveryProbe)
        recoveryProbe.dispose()
      } finally {
        await recoveryContext.close()
      }
    }
    expectNoPageErrors(probe)
  } finally {
    probe.dispose()
    await context.close()
  }
})

test('an optional no-escalation rule loads and does not invent mission follow-ups', async ({
  page,
}) => {
  await clearCampaignStorage(page)
  await page.getByText('Campaign import and export', { exact: true }).click()
  await page.getByRole('button', { name: 'Export Run' }).click()
  const key = 'containment-protocol-game-state'
  const envelope = JSON.parse(
    await page.evaluate((k) => localStorage.getItem(k)!, key)
  ) as SavedEnvelope
  const mission = Object.values(envelope.state.game.cases).find(
    (value) => value.title === 'The Whispering Archive'
  )
  if (!mission) throw new Error('Expected the starter mission')
  mission.onUnresolved = {}
  const payload = JSON.stringify({
    kind: 'containment-protocol-run',
    version: envelope.version,
    exportedAt: '2026-11-05T00:00:00.000Z',
    game: envelope.state.game,
  })

  await page.getByLabel('Run payload').fill(payload)
  await page.getByRole('button', { name: 'Import Run' }).click()
  await expect(page.getByRole('status').filter({ hasText: /imported/i })).toBeVisible()
  await page.reload()
  await advanceOperationalWeek(page)
  const loaded = JSON.parse(
    await page.evaluate((k) => localStorage.getItem(k)!, key)
  ) as SavedEnvelope
  expect(loaded.state.game.cases[mission.id].stage).toBe(mission.stage)
  await page
    .getByRole('region', { name: 'Latest report' })
    .getByRole('link', { name: 'Week 1', exact: true })
    .click()
  const result = page
    .getByRole('region', { name: 'Case outcomes' })
    .locator('section')
    .filter({ has: page.getByText('Unresolved cases', { exact: true }) })
    .locator(':scope > ul > li')
    .filter({ hasText: 'The Whispering Archive' })
  await expect(result).not.toContainText('Spawned follow-up case')
  await expect(result).not.toContainText('Case escalated to stage')
  await page.reload()
  await expect(result).not.toContainText('Spawned follow-up case')
})
