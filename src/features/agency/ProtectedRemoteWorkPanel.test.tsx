import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import type { GameState } from '../../domain/models'
import { createStartingState } from '../../data/startingState'
import { applyProtectedRemoteWorkStep } from '../../domain/protectedRemoteWorkCellLivePath'
import { ProtectedRemoteWorkPanel } from './ProtectedRemoteWorkPanel'
import { projectProtectedRemoteWorkGameplayView } from './protectedRemoteWorkGameplayView'

describe('protected remote-work controls', () => {
  it('removes a stale announcement when authoritative work changes', async () => {
    const created = applyProtectedRemoteWorkStep(createStartingState(), {
      kind: 'create',
      workId: 'work-stale',
      stationId: 'station-a',
      operatorRef: 'agent-a',
      operatorNodeId: 'operator-room',
      targetZoneRef: 'sealed-zone',
      targetRef: 'sample-a',
      capabilityTag: 'sample_observe',
      operationKey: 'create-stale',
    })
    const aborted = applyProtectedRemoteWorkStep(created.state!, {
      kind: 'abort',
      workId: 'work-stale',
      operationKey: 'abort-stale',
    })
    function Harness() {
      const [current, setCurrent] = useState(created.state!)
      return (
        <>
          <ProtectedRemoteWorkPanel
            view={projectProtectedRemoteWorkGameplayView(current)}
            applyStep={() => {
              setCurrent(aborted.state!)
              return aborted
            }}
          />
          <button onClick={() => setCurrent(created.state!)}>Restore request</button>
          <button onClick={() => setCurrent(aborted.state!)}>Restore abort</button>
        </>
      )
    }
    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Abort remote work work-stale' }))
    expect(screen.getByRole('status')).toHaveTextContent('aborted')
    await userEvent.click(screen.getByRole('button', { name: 'Restore request' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await userEvent.click(screen.getByRole('button', { name: 'Restore abort' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })
  it('allows keyboard abort and announces the actual coordinator result', async () => {
    const created = applyProtectedRemoteWorkStep(createStartingState(), {
      kind: 'create',
      workId: 'work-a',
      stationId: 'station-a',
      operatorRef: 'agent-a',
      operatorNodeId: 'operator-room',
      targetZoneRef: 'sealed-zone',
      targetRef: 'sample-a',
      capabilityTag: 'sample_observe',
      operationKey: 'create-a',
    })
    const game = { ...created.state!, facilityProtectedRemoteWorkStation: undefined }
    function Harness() {
      const [current, setCurrent] = useState<GameState>(game)
      return (
        <ProtectedRemoteWorkPanel
          view={projectProtectedRemoteWorkGameplayView(current)}
          applyStep={(command) => {
            const result = applyProtectedRemoteWorkStep(current, command)
            if (result.state) setCurrent(result.state)
            return result
          }}
        />
      )
    }
    render(<Harness />)
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Abort remote work work-a' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('Remote work work-a: aborted.')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(
      screen.queryByRole('button', { name: 'Abort remote work work-a' })
    ).not.toBeInTheDocument()
  })
})
