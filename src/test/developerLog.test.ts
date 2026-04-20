import { describe, expect, it } from 'vitest'
import { createStartingState } from '../data/startingState'
import {
  DEVELOPER_LOG_RETENTION_LIMIT,
  appendDeveloperLogEvent,
  buildDeveloperLogSnapshot,
  clearDeveloperLog,
} from '../domain/developerLog'

describe('developerLog', () => {
  it('appends deterministic developer log events with newest-first snapshots', () => {
    let state = createStartingState()
    state = appendDeveloperLogEvent(state, {
      type: 'flag.set',
      summary: 'Flag set: contact.ivy.introduced',
      details: {
        flagId: 'contact.ivy.introduced',
        value: true,
      },
    })
    state = appendDeveloperLogEvent(state, {
      type: 'progress_clock.changed',
      summary: 'Progress clock changed: incident.chain.breach',
      details: {
        clockId: 'incident.chain.breach',
        value: 2,
        max: 4,
      },
    })

    const snapshot = buildDeveloperLogSnapshot(state)

    expect(snapshot.nextEventSequence).toBe(3)
    expect(snapshot.entries).toHaveLength(2)
    expect(snapshot.entries[0]).toMatchObject({
      id: 'devlog-0002',
      week: 1,
      type: 'progress_clock.changed',
      summary: 'Progress clock changed: incident.chain.breach',
      details: {
        clockId: 'incident.chain.breach',
        value: 2,
        max: 4,
      },
    })
    expect(snapshot.entries[1]).toMatchObject({
      id: 'devlog-0001',
      type: 'flag.set',
    })
  })

  it('trims the oldest entries at the retention boundary', () => {
    let state = createStartingState()

    for (let index = 0; index < DEVELOPER_LOG_RETENTION_LIMIT + 5; index += 1) {
      state = appendDeveloperLogEvent(state, {
        type: 'flag.set',
        summary: `Flag set ${index}`,
        details: {
          flagId: `flag.${index}`,
        },
      })
    }

    const snapshot = buildDeveloperLogSnapshot(state, DEVELOPER_LOG_RETENTION_LIMIT + 20)

    expect(snapshot.entries).toHaveLength(DEVELOPER_LOG_RETENTION_LIMIT)
    expect(snapshot.entries.at(-1)?.summary).toBe('Flag set 5')
    expect(snapshot.entries[0]?.summary).toBe(
      `Flag set ${DEVELOPER_LOG_RETENTION_LIMIT + 4}`
    )
  })

  it('clears the log and resets the next event sequence', () => {
    let state = createStartingState()
    state = appendDeveloperLogEvent(state, {
      type: 'save.exported',
      summary: 'Save exported',
    })

    state = clearDeveloperLog(state)

    const snapshot = buildDeveloperLogSnapshot(state)

    expect(snapshot.entries).toEqual([])
    expect(snapshot.nextEventSequence).toBe(1)
  })
})
