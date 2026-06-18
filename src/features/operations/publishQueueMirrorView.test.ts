import { describe, expect, it } from 'vitest'
import { createStartingState } from '../../data/startingState'
import { CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE } from '../../domain/publishAutomationCreditingHooks'
import { getPublishQueueMirrorView } from './publishQueueMirrorView'
import { formatPublishQueueStatusLabel } from '../../domain/publishQueueSurfacing'

describe('publishQueueMirrorView (SPE-2485 slice 1)', () => {
  it('returns empty mirror when publishQueueRecords map is empty', () => {
    const game = createStartingState()

    expect(game.publishQueueRecords).toEqual({})

    const view = getPublishQueueMirrorView(game)

    expect(view.isEmpty).toBe(true)
    expect(view.summary.totalRecords).toBe(0)
    expect(view.summary.readyToPublishCount).toBe(0)
    expect(view.summary.publishedCount).toBe(0)
    expect(view.records).toEqual([])
  })

  it('discriminates ready_to_publish vs published status labels', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
      'publish-queue:published': {
        ...CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
        id: 'publish-queue:published',
        label: 'Published batch',
        status: 'published',
      },
    }

    const view = getPublishQueueMirrorView(game)

    expect(view.isEmpty).toBe(false)
    expect(view.summary.readyToPublishCount).toBe(1)
    expect(view.summary.publishedCount).toBe(1)

    const readyRecord = view.records.find(
      (record) => record.id === CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id
    )
    const publishedRecord = view.records.find((record) => record.id === 'publish-queue:published')

    expect(readyRecord?.statusLabel).toBe('Ready To Publish')
    expect(publishedRecord?.statusLabel).toBe('Published')
    expect(readyRecord?.releaseArtifactRef).toBe(
      CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.releaseArtifactRef
    )
  })

  it('formats enum labels for CP-neutral UI copy', () => {
    expect(formatPublishQueueStatusLabel('needs_revision')).toBe('Needs Revision')
  })

  it('is byte-stable for repeated mirror builds', () => {
    const game = createStartingState()
    game.publishQueueRecords = {
      [CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE.id]: CANONICAL_PUBLISH_QUEUE_RECORD_FIXTURE,
    }

    const first = JSON.stringify(getPublishQueueMirrorView(game))
    const second = JSON.stringify(getPublishQueueMirrorView(game))

    expect(first).toBe(second)
  })
})
