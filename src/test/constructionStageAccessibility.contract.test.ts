import { describe, expect, it } from 'vitest'
import {
  evaluateConstructionStageAccessibility,
  projectFacilitySectionGraphToConstructionTopology,
  type ConstructionStageAccessibilityRequest,
  type ConstructionStageStep,
} from '../domain/constructionStageAccessibility'
import { readProductionFacilitySectionGraph } from '../domain/facilitySectionGraph'

/**
 * Linear corridor: entry — a — b — c — exit
 * Used as a structurally valid final plan whose intermediate order can block access.
 */
const CORRIDOR_NODES = ['entry', 'a', 'b', 'c', 'exit'] as const
const CORRIDOR_EDGES = [
  { fromNodeId: 'entry', toNodeId: 'a' },
  { fromNodeId: 'a', toNodeId: 'b' },
  { fromNodeId: 'b', toNodeId: 'c' },
  { fromNodeId: 'c', toNodeId: 'exit' },
] as const

function baseRequest(
  overrides?: Partial<ConstructionStageAccessibilityRequest>
): ConstructionStageAccessibilityRequest {
  return {
    nodeIds: [...CORRIDOR_NODES],
    baseEdges: [...CORRIDOR_EDGES],
    accessRootNodeIds: ['entry'],
    steps: [],
    ...overrides,
  }
}

describe('SPE-3440 construction-stage accessibility', () => {
  it('blocks a structurally valid final plan when intermediate order removes required work access', () => {
    // Seal a→b first; later work at c is unreachable from entry.
    const badOrder: ConstructionStageStep[] = [
      {
        stepId: 'seal-a-b',
        workLocationNodeId: 'a',
        removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
      },
      {
        stepId: 'finish-c',
        workLocationNodeId: 'c',
      },
    ]
    const result = evaluateConstructionStageAccessibility(baseRequest({ steps: badOrder }))
    expect(result.outcome).toBe('blocked')
    expect(result.authoredTopologyUnchanged).toBe(true)
    expect(result.steps[1]).toMatchObject({
      stepId: 'finish-c',
      outcome: 'blocked',
      reasons: ['work_location_unreachable'],
      affectedRoute: { fromNodeId: 'entry', toNodeId: 'c' },
    })
  })

  it('permits the same plan when steps are reordered to preserve access', () => {
    const goodOrder: ConstructionStageStep[] = [
      {
        stepId: 'finish-c',
        workLocationNodeId: 'c',
      },
      {
        stepId: 'seal-a-b',
        workLocationNodeId: 'a',
        removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
      },
    ]
    const result = evaluateConstructionStageAccessibility(baseRequest({ steps: goodOrder }))
    expect(result).toMatchObject({
      outcome: 'permitted',
      reasons: ['ok'],
      authoredTopologyUnchanged: true,
    })
    expect(result.steps.every((step) => step.outcome === 'permitted')).toBe(true)
  })

  it('marks unsafe when a step strands an occupant without egress', () => {
    const result = evaluateConstructionStageAccessibility(
      baseRequest({
        occupants: [
          {
            occupantId: 'worker-1',
            nodeId: 'c',
            egressTargetNodeId: 'exit',
          },
        ],
        steps: [
          {
            stepId: 'seal-c-exit',
            workLocationNodeId: 'c',
            removesEdges: [{ fromNodeId: 'c', toNodeId: 'exit' }],
          },
        ],
      })
    )
    expect(result.outcome).toBe('unsafe')
    expect(result.steps[0]).toMatchObject({
      outcome: 'unsafe',
      reasons: ['occupant_egress_lost'],
      affectedOccupantId: 'worker-1',
      affectedRoute: { fromNodeId: 'c', toNodeId: 'exit' },
    })
  })

  it('allows a temporary access provision to enable a blocked step', () => {
    const withoutTemp = evaluateConstructionStageAccessibility(
      baseRequest({
        steps: [
          {
            stepId: 'seal-a-b',
            workLocationNodeId: 'a',
            removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
          },
          {
            stepId: 'finish-c',
            workLocationNodeId: 'c',
          },
        ],
      })
    )
    expect(withoutTemp.outcome).toBe('blocked')

    const withTemp = evaluateConstructionStageAccessibility(
      baseRequest({
        temporaryAccess: [
          {
            accessId: 'scaffold-entry-c',
            addsEdges: [{ fromNodeId: 'entry', toNodeId: 'c' }],
            activeThroughStepIndex: 1,
          },
        ],
        steps: [
          {
            stepId: 'seal-a-b',
            workLocationNodeId: 'a',
            removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
          },
          {
            stepId: 'finish-c',
            workLocationNodeId: 'c',
          },
        ],
      })
    )
    expect(withTemp.outcome).toBe('permitted')
    expect(withTemp.steps[1]?.outcome).toBe('permitted')
  })

  it('fails closed when temporary access ends and a required permanent route is missing', () => {
    const result = evaluateConstructionStageAccessibility(
      baseRequest({
        temporaryAccess: [
          {
            accessId: 'scaffold-b-c',
            addsEdges: [{ fromNodeId: 'b', toNodeId: 'c' }],
            activeThroughStepIndex: 0,
          },
        ],
        requiredPermanentEdges: [{ fromNodeId: 'b', toNodeId: 'c' }],
        steps: [
          {
            stepId: 'work-b',
            workLocationNodeId: 'b',
            removesEdges: [{ fromNodeId: 'b', toNodeId: 'c' }],
          },
        ],
      })
    )
    expect(result.outcome).toBe('blocked')
    expect(result.reasons).toContain('required_permanent_route_missing')
    expect(result.steps.at(-1)).toMatchObject({
      stepId: '__permanent_route_check__',
      outcome: 'blocked',
      affectedRoute: { fromNodeId: 'b', toNodeId: 'c' },
    })
  })

  it('blocks personnel-ineligible work locations without inventing eligibility authority', () => {
    const result = evaluateConstructionStageAccessibility(
      baseRequest({
        personnelAllowedNodeIds: ['a', 'b'],
        steps: [{ stepId: 'work-c', workLocationNodeId: 'c' }],
      })
    )
    expect(result.steps[0]).toMatchObject({
      outcome: 'blocked',
      reasons: ['personnel_class_ineligible'],
    })
  })

  it('fail-closes malformed requests and unknown references', () => {
    expect(evaluateConstructionStageAccessibility(baseRequest({ nodeIds: [] })).reasons).toContain(
      'malformed_request'
    )
    expect(
      evaluateConstructionStageAccessibility(baseRequest({ accessRootNodeIds: [] })).reasons
    ).toContain('malformed_request')
    expect(
      evaluateConstructionStageAccessibility(
        baseRequest({
          steps: [{ stepId: 'x', workLocationNodeId: 'missing' }],
        })
      ).reasons
    ).toContain('unknown_node')
    expect(
      evaluateConstructionStageAccessibility(
        baseRequest({
          baseEdges: [{ fromNodeId: 'entry', toNodeId: 'ghost' }],
          steps: [],
        })
      ).reasons
    ).toContain('unknown_edge')
    expect(
      evaluateConstructionStageAccessibility(
        baseRequest({
          steps: [
            {
              stepId: 'bad-remove',
              workLocationNodeId: 'a',
              removesEdges: [{ fromNodeId: 'a', toNodeId: 'ghost' }],
            },
          ],
        })
      ).reasons
    ).toContain('unknown_edge')
    expect(
      evaluateConstructionStageAccessibility(
        baseRequest({
          steps: [
            {
              stepId: 'bad-node-remove',
              workLocationNodeId: 'a',
              removesNodeIds: ['ghost'],
            },
          ],
        })
      ).reasons
    ).toContain('unknown_node')
    expect(
      evaluateConstructionStageAccessibility(
        baseRequest({
          steps: [
            { stepId: 'dup', workLocationNodeId: 'a' },
            { stepId: 'dup', workLocationNodeId: 'b' },
          ],
        })
      ).reasons
    ).toContain('duplicate_step_id')
  })

  it('rechecks occupant egress after temporary access ends', () => {
    const result = evaluateConstructionStageAccessibility(
      baseRequest({
        occupants: [
          {
            occupantId: 'worker-1',
            nodeId: 'c',
            egressTargetNodeId: 'exit',
          },
        ],
        temporaryAccess: [
          {
            accessId: 'temp-c-exit',
            addsEdges: [{ fromNodeId: 'c', toNodeId: 'exit' }],
            activeThroughStepIndex: 0,
          },
        ],
        steps: [
          {
            stepId: 'seal-permanent-c-exit',
            workLocationNodeId: 'c',
            removesEdges: [{ fromNodeId: 'c', toNodeId: 'exit' }],
          },
        ],
      })
    )
    expect(result.outcome).toBe('unsafe')
    expect(result.reasons).toContain('occupant_egress_lost')
    expect(result.steps.at(-1)).toMatchObject({
      stepId: '__post_temporary_occupant_check__',
      outcome: 'unsafe',
      affectedOccupantId: 'worker-1',
    })
  })

  it('is deterministic across repeated evaluation of unchanged state', () => {
    const request = baseRequest({
      steps: [
        { stepId: 'finish-c', workLocationNodeId: 'c' },
        {
          stepId: 'seal-a-b',
          workLocationNodeId: 'a',
          removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
        },
      ],
    })
    const first = evaluateConstructionStageAccessibility(request)
    const second = evaluateConstructionStageAccessibility(request)
    expect(second).toEqual(first)
  })

  it('consumes SPE-2932 production graph topology without mutating the graph', () => {
    const graph = readProductionFacilitySectionGraph()
    const topology = projectFacilitySectionGraphToConstructionTopology(graph)
    expect(topology).toBeDefined()
    const result = evaluateConstructionStageAccessibility({
      ...topology!,
      steps: [
        {
          stepId: 'work-med-bay',
          workLocationNodeId: 'room:med_bay',
        },
        {
          stepId: 'seal-med-clinical',
          workLocationNodeId: 'room:med_bay',
          removesEdges: [{ fromNodeId: 'room:med_bay', toNodeId: 'section:clinical' }],
        },
      ],
    })
    expect(result.outcome).toBe('permitted')
    expect(result.authoredTopologyUnchanged).toBe(true)
    // Same plan sealed first blocks later containment-cell work via clinical staging.
    const blocked = evaluateConstructionStageAccessibility({
      ...topology!,
      accessRootNodeIds: ['section:clinical'],
      steps: [
        {
          stepId: 'seal-med-clinical',
          workLocationNodeId: 'room:med_bay',
          removesEdges: [{ fromNodeId: 'room:med_bay', toNodeId: 'section:clinical' }],
        },
        {
          stepId: 'work-containment',
          workLocationNodeId: 'room:containment_cell',
        },
      ],
    })
    expect(blocked.outcome).toBe('blocked')
    expect(blocked.reasons).toContain('work_location_unreachable')
  })

  it('does not mutate caller-owned authored topology arrays', () => {
    const nodeIds = ['entry', 'a', 'b']
    const baseEdges = [
      { fromNodeId: 'entry', toNodeId: 'a' },
      { fromNodeId: 'a', toNodeId: 'b' },
    ]
    const snapshot = structuredClone({ nodeIds, baseEdges })
    evaluateConstructionStageAccessibility({
      nodeIds,
      baseEdges,
      accessRootNodeIds: ['entry'],
      steps: [
        {
          stepId: 'seal',
          workLocationNodeId: 'a',
          removesEdges: [{ fromNodeId: 'a', toNodeId: 'b' }],
        },
      ],
    })
    expect({ nodeIds, baseEdges }).toEqual(snapshot)
  })
})
