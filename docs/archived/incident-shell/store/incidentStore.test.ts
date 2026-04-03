import { fallbackStorage, resolveStorage, useIncidentStore } from './incidentStore'

beforeEach(() => {
  useIncidentStore.persist.clearStorage()
  useIncidentStore.getState().reset()
})

describe('incidentStore', () => {
  it('toggles acknowledged sectors on and off', () => {
    useIncidentStore.getState().toggleAcknowledged('C-12')
    expect(useIncidentStore.getState().acknowledgedSectors).toEqual(['C-12'])

    useIncidentStore.getState().toggleAcknowledged('C-12')
    expect(useIncidentStore.getState().acknowledgedSectors).toEqual([])
  })

  it('clears all acknowledged sectors at once', () => {
    useIncidentStore.getState().toggleAcknowledged('C-12')
    useIncidentStore.getState().toggleAcknowledged('D-09')

    useIncidentStore.getState().clearAcknowledged()

    expect(useIncidentStore.getState().acknowledgedSectors).toEqual([])
  })

  it('resets filters and search back to defaults', () => {
    useIncidentStore.getState().setSearchQuery('orchard')
    useIncidentStore.getState().setStatusFilter('warning')
    useIncidentStore.getState().toggleAcknowledged('D-09')

    useIncidentStore.getState().reset()

    expect(useIncidentStore.getState()).toMatchObject({
      acknowledgedSectors: [],
      searchQuery: '',
      statusFilter: 'all',
    })
  })

  it('persists only the command state subset', () => {
    useIncidentStore.getState().setSearchQuery('rook')
    useIncidentStore.getState().setStatusFilter('critical')
    useIncidentStore.getState().toggleAcknowledged('D-09')

    const storedState = useIncidentStore.persist
      .getOptions()
      .storage?.getItem('containment-protocol-command-state')

    expect(storedState).toMatchObject({
      state: {
        acknowledgedSectors: ['D-09'],
        searchQuery: 'rook',
        statusFilter: 'critical',
      },
    })
  })

  it('falls back to in-memory storage when local storage is unavailable', () => {
    const originalStorage = window.localStorage
    const brokenStorage = {} as Storage

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: brokenStorage,
    })

    try {
      const storage = resolveStorage()

      expect(storage).toBe(fallbackStorage)

      storage.setItem('fallback-key', 'fallback-value')
      expect(storage.getItem('fallback-key')).toBe('fallback-value')

      storage.removeItem('fallback-key')
      expect(storage.getItem('fallback-key')).toBeNull()
    } finally {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: originalStorage,
      })
    }
  })
})
