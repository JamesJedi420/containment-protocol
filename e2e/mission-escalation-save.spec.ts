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

test('incomplete escalation saves fail safely while a valid campaign continues', async ({
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
    delete incomplete.state.game.cases[spawned.id].onUnresolved.stageDelta
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
      page.getByRole('status').filter({ hasText: 'incomplete escalation rule' })
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
    await advanceOperationalWeek(page)
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
        await expect(recovery.getByRole('alert')).toContainText('incomplete escalation rule')
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
        expectNoPageErrors(recoveryProbe)
        recoveryProbe.dispose()
        await recovery.reload()
        await expect(
          recovery.getByRole('heading', { name: 'Saved campaign unavailable' })
        ).toBeVisible()
        expect(await recovery.evaluate((storageKey) => localStorage.getItem(storageKey), key)).toBe(
          broken
        )
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
