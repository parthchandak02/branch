# branch — Creative Brief

## Concept
GitHub events as a 3D glowing tree in dark space. Each repo is a branch growing from the trunk (time). Each event is a glowing leaf on its repo's branch. Push events are teal, PRs gold, stars cyan, issues coral. Bigger leaves = more commits. The tree slowly rotates. Tap a leaf to see event details in the QuietZone.

**Narrative Pattern:** Drill-down (overview of code activity timeline -> tap leaf for event details)

**Tier 2 Patterns (pick 2):** Quiet Zone (tap reveals event details + GitHub link, fades after 3s) + Hero Number (total events count + "events today" label)

## Data Source
- API endpoint: `https://api.github.com/users/parthchandak02/events?per_page=100`
- Response format: JSON array of PushEvent, PullRequestEvent, IssuesEvent, WatchEvent, ForkEvent, CreateEvent
- Fields used: `type`, `created_at`, `repo.name`, `payload.commits` (length), `payload.pull_request.title`, `payload.issue.title`, `payload.action`
- Fallback: embedded set of 10 sample events showing the same visual structure, labeled "cached"

## Visual Style
- **Preset:** Bold — Circuit (digital precision, tech aesthetic, perfect for code data)
- **Circuit palette:**
  ```js
  const PALETTE = {
    bg: '#0a0a0f',         // dark blue-black
    track: '#1a1a2e',      // slightly lighter for depth
    accent1: '#00e676',    // green — push events
    accent2: '#2979ff',    // blue — PR events
    accent3: '#ff1744',    // red — issue events
    gold: '#ffd700',       // gold — star events
    purple: '#b388ff',     // purple — fork events
    glow: '#00e676',       // green glow
    trunk: '#1a1a3e',      // trunk color
    text: 'rgba(255,255,255,0.6)',
  };
  ```
- **Motion style:** Gentle rotation, slow drift. Branch growth animation (ease-out).
- **Background:** Dark `#0a0a0f` with subtle dot grid (1px dots, 20px spacing, 8% opacity `#2979ff`)

## Toolkit Component
**Motion** (motion.dev) spring physics for QuietZone entrance/exit animation. Install: `npm install motion`

## Three Dials
- DESIGN_VARIANCE: 4 (offset — branches have organic curve, leaf positions semi-random along branch)
- MOTION_INTENSITY: 4 (gentle — slow rotation, subtle leaf pulse breathing, branch ease-in growth)
- VISUAL_DENSITY: 5 (moderate — up to 100 event leaves displayed)

## Encoding Contract
| Data Field | Visual Channel | Range | "Bigger means..." | Legend? |
|------------|----------------|-------|-------------------|---------|
| event.type (Push/PullRequest/Issues/Watch/Fork) | leaf color (teal/gold/cyan/coral/purple) | discrete | (categorical) | yes |
| payload.commits.length (pushes) | leaf radius | 0.08-0.35 scene units | more commits pushed | yes |
| time since event (created_at) | leaf opacity + vertical Y | Y: -5 to +5, opacity: 0.3-1.0 | (time ordering) | no (physical) |
| repo.name | branch grouping | one branch per repo | (layout grouping) | DECORATIVE |

## Interaction
- OrbitControls for navigation (desktop + mobile touch)
- Tap a leaf -> QuietZone shows: event type, repo name, time ago, commit count (if push), PR title (if PR), issue title (if issue), "View on GitHub" link (opens repo URL)
- First visit: gentle radial pulse at tree center, fades after 500ms
- QuietZone fades after 3s of inactivity

## Required Component Structure (exactly these files)

### src/App.tsx
Canvas -> Suspense -> Background -> BranchTree -> OrbitControls
Chrome overlay: HeroStats, DataStamp, Description, Legend, QuietZone

### src/main.tsx
ReactDOM root, import styles.css. No extra config.

### src/styles.css
Circuit palette CSS variables. Full-viewport: html/body margin:0, overflow:hidden. Chrome positions: #hero (top:24 left:24, 48px), #stamp (bottom:20 left:16, 10px), #legend (bottom:44 center, 9px), #desc (bottom:68 center, 11px), #quiet-zone (center, 300px max-width, fades with motion spring)

### src/components/Background.tsx
Dark #0a0a0f background. Dot grid effect using Points with small dots at 20px spacing. Very subtle.

### src/components/BranchTree.tsx
THE MAIN COMPONENT. Takes events array, renders a central trunk (TubeGeometry or Cylinder), and for each repo: a curved branch (CatmullRomLine3 from drei) connecting its events chronologically, with event leaves (SphereGeometry) at event positions. Events from same repo form a branch curve. Event leaves use MeshBasicMaterial + color from PALETTE based on event type. Leaf click handler sets selected event in zustand store. useFrame for gentle rotation + leaf pulse breathing animation. Stagger branch growth on mount (ease-out over 2s).

### src/components/Chrome.tsx
Renders hero number (total event count), data stamp ("GitHub Events · N repos · N leaves · live|cached · Xs ago"), description, and legend (teal/coral/gold/cyan/purple dots with Push/Issue/Star/PR/Fork labels).

### src/components/QuietZone.tsx
Floating detail panel. Uses motion.div from the `motion` library for spring-animated entrance/exit. Shows event type icon + repo name + details + "View on GitHub ->" link (target=_blank, rel=noopener noreferrer). Fades after 3s inactivity timer. Uses zustand store for selected event.

### src/data/events.ts
Fetch function: `fetchEvents()` -> GET https://api.github.com/users/parthchandak02/events?per_page=100. Parses PushEvent (commits.length for size), PullRequestEvent (title, state), IssuesEvent (title, state), WatchEvent (star), ForkEvent (fork). Falls back to embedded sample data with "cached" label. Poll interval: 60s.

### src/store.ts
Zustand store: selectedEvent | null, setSelectedEvent, events array, setEvents, stats (totalEvents, repoCount, eventTypeCounts), dataMode ('live' | 'cached'), lastFetchTime.

## Communication Requirements
**Tier 1 (mandatory):**
1. Persistent Data Stamp — "GitHub Events · N repos · N leaves · live|cached · Xs ago"
2. Data Process Honesty — fallback labeled "cached", never "live"
3. One-to-One Sensory Mapping — leaf size = commits (physical: more commits -> bigger leaf)

**Tier 2 (pick 2):**
4. Quiet Zone — tap leaf shows event type, repo, time ago, commit count, "View on GitHub ->"
5. Hero Number — 48px total event count + "events today" label in top-left

**Coherence:**
6. Circuit palette: green/blue/red/gold/purple for event types, dark bg, dot grid
7. Motion tokens: --motion-fast:160ms, --motion-base:240ms, --motion-slow:360ms
8. AI Slop Score < 30 — system-ui font, no purple gradient default, layered bg with dot grid

## Deploy
- Slug: branch
- Render tier: r3f — deploy Cloudflare Pages
- URL: https://branch.parthchandak.info
- Toolkit: motion spring physics for QuietZone entrance

## Build Steps
```bash
npm create vite@latest . -- --template react-ts
rm -f src/index.css src/App.css
npm install three @react-three/fiber @react-three/drei @types/three @react-three/postprocessing maath zustand motion
```
Then build components as specified above.
