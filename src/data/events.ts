export type EventType =
  | 'PushEvent'
  | 'PullRequestEvent'
  | 'IssuesEvent'
  | 'WatchEvent'
  | 'ForkEvent'
  | 'CreateEvent'

export interface BranchEvent {
  id: string
  type: EventType
  created_at: string
  repo: {
    name: string
    url: string
  }
  commitCount?: number
  prTitle?: string
  prState?: string
  issueTitle?: string
  issueState?: string
  action?: string
}

// Unauthenticated GitHub API calls are limited to 60 an hour per IP, shared with anything
// else on that network. Five minutes keeps one open tab at 12 calls an hour.
export const POLL_INTERVAL = 5 * 60_000

const SAMPLE_EVENTS: BranchEvent[] = [
  {
    id: 'sample-1',
    type: 'PushEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    repo: { name: 'parthchandak02/hermes-agent', url: 'https://api.github.com/repos/parthchandak02/hermes-agent' },
    commitCount: 4,
  },
  {
    id: 'sample-2',
    type: 'PullRequestEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    repo: { name: 'parthchandak02/creative-daily', url: 'https://api.github.com/repos/parthchandak02/creative-daily' },
    prTitle: 'Add canvas DPR patterns',
    prState: 'open',
    action: 'opened',
  },
  {
    id: 'sample-3',
    type: 'IssuesEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    repo: { name: 'parthchandak02/research-assistant', url: 'https://api.github.com/repos/parthchandak02/research-assistant' },
    issueTitle: 'Improve citation parsing',
    issueState: 'open',
    action: 'opened',
  },
  {
    id: 'sample-4',
    type: 'WatchEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    repo: { name: 'parthchandak02/pp-linear', url: 'https://api.github.com/repos/parthchandak02/pp-linear' },
    action: 'started',
  },
  {
    id: 'sample-5',
    type: 'ForkEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    repo: { name: 'parthchandak02/alpaca-automate', url: 'https://api.github.com/repos/parthchandak02/alpaca-automate' },
  },
  {
    id: 'sample-6',
    type: 'PushEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    repo: { name: 'parthchandak02/hermes-agent', url: 'https://api.github.com/repos/parthchandak02/hermes-agent' },
    commitCount: 1,
  },
  {
    id: 'sample-7',
    type: 'PushEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
    repo: { name: 'parthchandak02/cal-tag-app', url: 'https://api.github.com/repos/parthchandak02/cal-tag-app' },
    commitCount: 7,
  },
  {
    id: 'sample-8',
    type: 'PullRequestEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    repo: { name: 'parthchandak02/creative-daily', url: 'https://api.github.com/repos/parthchandak02/creative-daily' },
    prTitle: 'Ship branch tree viz',
    prState: 'merged',
    action: 'closed',
  },
  {
    id: 'sample-9',
    type: 'IssuesEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString(),
    repo: { name: 'parthchandak02/research-assistant', url: 'https://api.github.com/repos/parthchandak02/research-assistant' },
    issueTitle: 'Cache stale on refresh',
    issueState: 'closed',
    action: 'closed',
  },
  {
    id: 'sample-10',
    type: 'WatchEvent',
    created_at: new Date(Date.now() - 1000 * 60 * 500).toISOString(),
    repo: { name: 'parthchandak02/pp-openrouter', url: 'https://api.github.com/repos/parthchandak02/pp-openrouter' },
    action: 'started',
  },
]

const DISPLAY_TYPES = new Set<EventType>([
  'PushEvent',
  'PullRequestEvent',
  'IssuesEvent',
  'WatchEvent',
  'ForkEvent',
])

function parseGitHubEvent(raw: Record<string, unknown>, index: number): BranchEvent | null {
  const type = raw.type as EventType
  if (!DISPLAY_TYPES.has(type)) return null

  const repo = raw.repo as { name: string; url: string }
  const payload = (raw.payload ?? {}) as Record<string, unknown>
  const id = String(raw.id ?? `event-${index}`)

  const event: BranchEvent = {
    id,
    type,
    created_at: String(raw.created_at),
    repo,
    action: typeof payload.action === 'string' ? payload.action : undefined,
  }

  if (type === 'PushEvent') {
    const commits = payload.commits as unknown[] | undefined
    event.commitCount = commits?.length ?? 1
  }

  if (type === 'PullRequestEvent') {
    const pr = payload.pull_request as Record<string, unknown> | undefined
    event.prTitle = typeof pr?.title === 'string' ? pr.title : undefined
    event.prState = typeof pr?.state === 'string' ? pr.state : undefined
  }

  if (type === 'IssuesEvent') {
    const issue = payload.issue as Record<string, unknown> | undefined
    event.issueTitle = typeof issue?.title === 'string' ? issue.title : undefined
    event.issueState = typeof issue?.state === 'string' ? issue.state : undefined
  }

  return event
}

export interface FetchResult {
  /** null when the request failed: keep whatever is already on screen. */
  events: BranchEvent[] | null
  /** Short reason shown in the stamp when the request failed, e.g. "rate-limited until 14:05". */
  error?: string
  /** How long to wait before the next request. */
  nextPollMs: number
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export async function fetchEvents(): Promise<FetchResult> {
  try {
    const response = await fetch(
      'https://api.github.com/users/parthchandak02/events?per_page=100',
    )
    const remaining = response.headers.get('x-ratelimit-remaining')
    const reset = Number(response.headers.get('x-ratelimit-reset'))
    if ((response.status === 403 || response.status === 429) && (remaining === '0' || response.status === 429)) {
      const retryAfter = Number(response.headers.get('retry-after'))
      const resumeAt = Number.isFinite(retryAfter) && retryAfter > 0
        ? Date.now() + retryAfter * 1000
        : Number.isFinite(reset) && reset > 0
          ? reset * 1000
          : Date.now() + 15 * 60_000
      return {
        events: null,
        error: `rate-limited until ${formatClock(resumeAt)}`,
        nextPollMs: Math.max(POLL_INTERVAL, resumeAt - Date.now() + 5_000),
      }
    }
    if (!response.ok) throw new Error(`GitHub API ${response.status}`)

    const data = (await response.json()) as Record<string, unknown>[]
    const events = data
      .map((item, index) => parseGitHubEvent(item, index))
      .filter((event): event is BranchEvent => event !== null)
      .slice(0, 100)

    if (events.length === 0) throw new Error('No displayable events')

    // If the remaining budget is nearly spent, wait for the window to reset.
    const lowBudget = remaining !== null && Number(remaining) < 3 && Number.isFinite(reset) && reset > 0
    return {
      events,
      nextPollMs: lowBudget ? Math.max(POLL_INTERVAL, reset * 1000 - Date.now() + 5_000) : POLL_INTERVAL,
    }
  } catch (error) {
    return {
      events: null,
      error: error instanceof Error && error.message.startsWith('GitHub API') ? error.message : 'offline',
      nextPollMs: POLL_INTERVAL,
    }
  }
}

export { SAMPLE_EVENTS }

export function repoUrl(repoName: string): string {
  return `https://github.com/${repoName}`
}

export function formatTimeAgo(iso: string): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function eventTypeLabel(type: EventType): string {
  switch (type) {
    case 'PushEvent':
      return 'Push'
    case 'PullRequestEvent':
      return 'Pull Request'
    case 'IssuesEvent':
      return 'Issue'
    case 'WatchEvent':
      return 'Star'
    case 'ForkEvent':
      return 'Fork'
    default:
      return 'Event'
  }
}
