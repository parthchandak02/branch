import { create } from 'zustand'
import type { BranchEvent } from './data/events'

export type DataMode = 'loading' | 'live' | 'sample'

export interface EventStats {
  totalEvents: number
  repoCount: number
  eventsToday: number
  eventTypeCounts: Record<string, number>
}

function computeStats(events: BranchEvent[]): EventStats {
  const repos = new Set(events.map((event) => event.repo.name))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const eventsToday = events.filter((event) => {
    const created = new Date(event.created_at)
    created.setHours(0, 0, 0, 0)
    return created.getTime() === today.getTime()
  }).length

  const eventTypeCounts: Record<string, number> = {}
  for (const event of events) {
    eventTypeCounts[event.type] = (eventTypeCounts[event.type] ?? 0) + 1
  }

  return {
    totalEvents: events.length,
    repoCount: repos.size,
    eventsToday,
    eventTypeCounts,
  }
}

interface AppState {
  events: BranchEvent[]
  selectedEvent: BranchEvent | null
  dataMode: DataMode
  /** Why the last request failed, if it did (shown next to the mode). */
  fetchError: string | null
  lastFetchTime: number | null
  stats: EventStats
  setEvents: (events: BranchEvent[], mode: DataMode) => void
  setSelectedEvent: (event: BranchEvent | null) => void
  setLastFetchTime: (time: number) => void
  setFetchError: (error: string | null) => void
}

const emptyStats = computeStats([])

export const useStore = create<AppState>((set) => ({
  events: [],
  selectedEvent: null,
  dataMode: 'loading',
  fetchError: null,
  lastFetchTime: null,
  stats: emptyStats,
  setEvents: (events, mode) =>
    set({
      events,
      dataMode: mode,
      stats: computeStats(events),
    }),
  setSelectedEvent: (event) => set({ selectedEvent: event }),
  setLastFetchTime: (time) => set({ lastFetchTime: time }),
  setFetchError: (error) => set({ fetchError: error }),
}))
