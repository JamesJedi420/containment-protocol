import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import type { GameState } from '../../src/domain/models'

// Four fresh contexts per comparison, including UI, reloads and assertions.
// Per attempt; excludes server startup and is not a player latency target.
export const CAMPAIGN_COMPARISON_TIMEOUT_MS = 240_000

// Compact UTF-8 GameState endpoints, not the storage envelope or peak heap.
// Baseline and headroom rationale: planning/spe-3352-fixture-budgets-slice.md.
const MAX_FINAL_BYTES = 512 * 1024
const MAX_GROWTH_BYTES = 256 * 1024

export async function expectCampaignStateBudget(
  path: string,
  initial: GameState,
  final: GameState
) {
  const initialBytes = Buffer.byteLength(JSON.stringify(initial), 'utf8')
  const finalBytes = Buffer.byteLength(JSON.stringify(final), 'utf8')
  const growthBytes = finalBytes - initialBytes
  await test.info().attach(`campaign-budget-${path}`, {
    body: JSON.stringify({
      path,
      initialBytes,
      finalBytes,
      growthBytes,
      maxFinalBytes: MAX_FINAL_BYTES,
      maxGrowthBytes: MAX_GROWTH_BYTES,
      comparisonTimeoutMs: CAMPAIGN_COMPARISON_TIMEOUT_MS,
    }),
    contentType: 'application/json',
  })
  expect(finalBytes, `${path}: saved GameState endpoint byte budget`).toBeLessThanOrEqual(
    MAX_FINAL_BYTES
  )
  expect(growthBytes, `${path}: net two-week GameState byte growth budget`).toBeLessThanOrEqual(
    MAX_GROWTH_BYTES
  )
}
