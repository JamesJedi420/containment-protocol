import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import type { SectorTone } from '../data/incident'

export type SectorFilter = 'all' | SectorTone

interface IncidentState {
  acknowledgedSectors: string[]
  clearAcknowledged: () => void
  resetVersion: number
  searchQuery: string
  statusFilter: SectorFilter
  setSearchQuery: (query: string) => void
  setStatusFilter: (filter: SectorFilter) => void
  toggleAcknowledged: (sectorCode: string) => void
  reset: () => void
}

const initialState = {
  acknowledgedSectors: [] as string[],
  resetVersion: 0,
  searchQuery: '',
  statusFilter: 'all' as SectorFilter,
}

const memoryStorage = new Map<string, string>()

export const fallbackStorage: StateStorage = {
  getItem: (name) => memoryStorage.get(name) ?? null,
  setItem: (name, value) => {
    memoryStorage.set(name, value)
  },
  removeItem: (name) => {
    memoryStorage.delete(name)
  },
}

export function resolveStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    const candidate = window.localStorage

    if (
      candidate &&
      typeof candidate.getItem === 'function' &&
      typeof candidate.setItem === 'function' &&
      typeof candidate.removeItem === 'function'
    ) {
      return candidate
    }
  }

  return fallbackStorage
}

export const useIncidentStore = create<IncidentState>()(
  persist(
    (set) => ({
      ...initialState,
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      toggleAcknowledged: (sectorCode) =>
        set((state) => ({
          acknowledgedSectors: state.acknowledgedSectors.includes(sectorCode)
            ? state.acknowledgedSectors.filter((code) => code !== sectorCode)
            : [...state.acknowledgedSectors, sectorCode],
        })),
      clearAcknowledged: () => set({ acknowledgedSectors: [] }),
      reset: () =>
        set((state) => ({
          ...initialState,
          resetVersion: state.resetVersion + 1,
        })),
    }),
    {
      name: 'containment-protocol-command-state',
      partialize: ({ acknowledgedSectors, searchQuery, statusFilter }) => ({
        acknowledgedSectors,
        searchQuery,
        statusFilter,
      }),
      storage: createJSONStorage(resolveStorage),
    }
  )
)
