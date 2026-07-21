import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  eventTypeLabel,
  formatTimeAgo,
  repoUrl,
  type EventType,
} from '../data/events'
import { useStore } from '../store'

const TYPE_COLORS: Record<EventType, string> = {
  PushEvent: '#00e676',
  PullRequestEvent: '#2979ff',
  IssuesEvent: '#ff1744',
  WatchEvent: '#ffd700',
  ForkEvent: '#b388ff',
  CreateEvent: '#1a1a2e',
}

const FADE_MS = 3000

export function QuietZone() {
  const selectedEvent = useStore((state) => state.selectedEvent)
  const setSelectedEvent = useStore((state) => state.setSelectedEvent)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!selectedEvent) return
    timerRef.current = setTimeout(() => {
      setSelectedEvent(null)
    }, FADE_MS)
  }

  useEffect(() => {
    resetTimer()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [selectedEvent, setSelectedEvent])

  useEffect(() => {
    const onActivity = () => resetTimer()
    window.addEventListener('pointerdown', onActivity)
    window.addEventListener('keydown', onActivity)
    return () => {
      window.removeEventListener('pointerdown', onActivity)
      window.removeEventListener('keydown', onActivity)
    }
  }, [selectedEvent])

  return (
    <div id="quiet-zone">
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            key={selectedEvent.id}
            className="quiet-panel"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
          >
            <div className="quiet-type">
              <span
                className="quiet-type-dot"
                style={{ background: TYPE_COLORS[selectedEvent.type] }}
              />
              {eventTypeLabel(selectedEvent.type)}
            </div>
            <div className="quiet-repo">{selectedEvent.repo.name}</div>
            <div className="quiet-detail">{formatTimeAgo(selectedEvent.created_at)}</div>
            {selectedEvent.type === 'PushEvent' && selectedEvent.commitCount !== undefined && (
              <div className="quiet-detail">
                {selectedEvent.commitCount} commit{selectedEvent.commitCount === 1 ? '' : 's'}
              </div>
            )}
            {selectedEvent.prTitle && (
              <div className="quiet-detail">PR: {selectedEvent.prTitle}</div>
            )}
            {selectedEvent.issueTitle && (
              <div className="quiet-detail">Issue: {selectedEvent.issueTitle}</div>
            )}
            <a
              className="quiet-link"
              href={repoUrl(selectedEvent.repo.name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub →
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
