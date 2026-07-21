import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { QuietZone } from './QuietZone'

const LEGEND = [
  { label: 'Push', color: 'var(--accent-push)' },
  { label: 'Issue', color: 'var(--accent-issue)' },
  { label: 'Star', color: 'var(--accent-star)' },
  { label: 'PR', color: 'var(--accent-pr)' },
  { label: 'Fork', color: 'var(--accent-fork)' },
] as const

function formatSecondsAgo(timestamp: number | null): string {
  if (timestamp === null) return '—'
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  return `${seconds}s ago`
}

export function Chrome() {
  const stats = useStore((state) => state.stats)
  const dataMode = useStore((state) => state.dataMode)
  const lastFetchTime = useStore((state) => state.lastFetchTime)
  const [, tick] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => tick((value) => value + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="chrome-layer">
      <div id="hero">
        <div className="hero-number">{stats.totalEvents}</div>
        <div className="hero-label">
          {stats.eventsToday} event{stats.eventsToday === 1 ? '' : 's'} today
        </div>
      </div>

      <div id="stamp">
        GitHub Events · {stats.repoCount} repo{stats.repoCount === 1 ? '' : 's'} ·{' '}
        {stats.totalEvents} leaves · {dataMode} · {formatSecondsAgo(lastFetchTime)}
      </div>

      <div id="desc">
        Each branch is a repository; glowing leaves are recent GitHub events. Leaf size
        reflects commit count on pushes. Tap a leaf for details.
      </div>

      <div id="legend">
        {LEGEND.map((item) => (
          <span key={item.label} className="legend-item">
            <span className="legend-dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>

      <QuietZone />
    </div>
  )
}
