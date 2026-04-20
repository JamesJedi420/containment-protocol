import { describe, it, expect } from 'vitest'
import {
  createInitialResearchState,
  queueResearchProject,
  activateResearchProjects,
  advanceResearchProgress,
  recomputeResearchState,
} from '../domain/research'
import type { ResearchState } from '../domain/models'

describe('Research System', () => {
  it('deterministically queues and activates research projects respecting slots', () => {
    let state: ResearchState = createInitialResearchState()
    // Add two available projects
    state = {
      ...state,
      projects: {
        p1: {
          projectId: 'p1',
          category: 'anomaly',
          status: 'available',
          costTime: 2,
          costMaterials: 0,
          costData: 0,
          progressTime: 0,
          unlocks: [],
        },
        p2: {
          projectId: 'p2',
          category: 'equipment',
          status: 'available',
          costTime: 2,
          costMaterials: 0,
          costData: 0,
          progressTime: 0,
          unlocks: [],
        },
      },
      availableProjectIds: ['p1', 'p2'],
      researchSlots: 1,
    }
    state = queueResearchProject(state, 'p1')
    state = queueResearchProject(state, 'p2')
    expect(state.queuedProjectIds).toEqual(['p1', 'p2'])
    state = activateResearchProjects(state, 1)
    expect(state.activeProjectIds).toEqual(['p1'])
    expect(state.queuedProjectIds).toEqual(['p2'])
  })

  it('progresses and completes research projects deterministically', () => {
    let state: ResearchState = createInitialResearchState()
    state = {
      ...state,
      projects: {
        p1: {
          projectId: 'p1',
          category: 'anomaly',
          status: 'active',
          costTime: 2,
          costMaterials: 0,
          costData: 0,
          progressTime: 0,
          unlocks: [],
          startedWeek: 1,
        },
      },
      activeProjectIds: ['p1'],
    }
    state = advanceResearchProgress(state, 2, 0, 0)
    expect(state.projects.p1.progressTime).toBe(1)
    expect(state.projects.p1.status).toBe('active')
    state = advanceResearchProgress(state, 3, 0, 0)
    expect(state.projects.p1.progressTime).toBe(2)
    expect(state.projects.p1.status).toBe('completed')
    expect(state.completedProjectIds).toContain('p1')
  })

  it('enforces research and facility prerequisites and blocks projects', () => {
    let state: ResearchState = createInitialResearchState()
    state = {
      ...state,
      projects: {
        p1: {
          projectId: 'p1',
          category: 'anomaly',
          status: 'locked',
          costTime: 1,
          costMaterials: 0,
          costData: 0,
          progressTime: 0,
          unlocks: [],
          requiredResearchIds: ['p0'],
        },
      },
    }
    // No completed research, should be blocked
    state = recomputeResearchState(state, 1)
    expect(state.projects.p1.status).toBe('blocked')
    expect(state.blockedProjectIds).toContain('p1')
    // Mark p0 as completed, should become available
    state = {
      ...state,
      completedProjectIds: ['p0'],
    }
    state = recomputeResearchState(state, 2)
    expect(state.projects.p1.status).toBe('available')
    expect(state.availableProjectIds).toContain('p1')
  })
})
