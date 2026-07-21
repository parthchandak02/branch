import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { CatmullRomLine } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { BranchEvent, EventType } from '../data/events'
import { useStore } from '../store'

const PALETTE = {
  bg: '#0a0a0f',
  track: '#1a1a2e',
  accent1: '#00e676',
  accent2: '#2979ff',
  accent3: '#ff1744',
  gold: '#ffd700',
  purple: '#b388ff',
  glow: '#00e676',
  trunk: '#1a1a3e',
  text: 'rgba(255,255,255,0.6)',
} as const

const LEAF_COLORS: Record<EventType, string> = {
  PushEvent: PALETTE.accent1,
  PullRequestEvent: PALETTE.accent2,
  IssuesEvent: PALETTE.accent3,
  WatchEvent: PALETTE.gold,
  ForkEvent: PALETTE.purple,
  CreateEvent: PALETTE.track,
}

const GROWTH_DURATION = 2
const STAGGER = 0.12

function repoAngle(repoName: string): number {
  let hash = 0
  for (let i = 0; i < repoName.length; i += 1) {
    hash = (hash * 31 + repoName.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 360) * (Math.PI / 180)
}

function timeRange(events: BranchEvent[]) {
  const times = events.map((event) => new Date(event.created_at).getTime())
  return {
    min: Math.min(...times),
    max: Math.max(...times),
  }
}

function timeToY(createdAt: string, min: number, max: number): number {
  const t = new Date(createdAt).getTime()
  const norm = (t - min) / (max - min || 1)
  return -5 + norm * 10
}

function timeToOpacity(createdAt: string, min: number, max: number): number {
  const t = new Date(createdAt).getTime()
  const norm = (t - min) / (max - min || 1)
  return 0.3 + norm * 0.7
}

function leafRadius(event: BranchEvent): number {
  if (event.type === 'PushEvent') {
    const commits = event.commitCount ?? 1
    const norm = Math.min(1, commits / 8)
    return 0.08 + norm * 0.27
  }
  return 0.12
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function eventPosition(
  event: BranchEvent,
  index: number,
  total: number,
  angle: number,
  min: number,
  max: number,
): THREE.Vector3 {
  const progress = total <= 1 ? 0.5 : index / (total - 1)
  const branchLength = 1.4 + progress * 3.2
  const organic = Math.sin(index * 0.85 + angle) * 0.35
  const lift = Math.cos(index * 0.55) * 0.25

  const x = Math.cos(angle) * branchLength + organic * Math.sin(angle + 0.6)
  const z = Math.sin(angle) * branchLength + organic * Math.cos(angle + 0.6)
  const y = timeToY(event.created_at, min, max) + lift

  return new THREE.Vector3(x, y, z)
}

interface RepoBranch {
  repo: string
  events: BranchEvent[]
  angle: number
}

function groupByRepo(events: BranchEvent[]): RepoBranch[] {
  const map = new Map<string, BranchEvent[]>()

  for (const event of events) {
    const list = map.get(event.repo.name) ?? []
    list.push(event)
    map.set(event.repo.name, list)
  }

  return [...map.entries()].map(([repo, repoEvents]) => ({
    repo,
    events: [...repoEvents].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    ),
    angle: repoAngle(repo),
  }))
}

interface LeafProps {
  event: BranchEvent
  position: THREE.Vector3
  opacity: number
  radius: number
  growth: number
  selected: boolean
  onSelect: (event: BranchEvent) => void
}

function Leaf({
  event,
  position,
  opacity,
  radius,
  growth,
  selected,
  onSelect,
}: LeafProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const color = LEAF_COLORS[event.type]

  useFrame((state) => {
    if (!meshRef.current) return
    const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.6 + position.x) * 0.05
    const scale = radius * growth * pulse * (selected ? 1.2 : 1)
    meshRef.current.scale.setScalar(scale)
  })

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    onSelect(event)
  }

  const grownPosition = position.clone().multiplyScalar(growth)

  return (
    <group position={grownPosition}>
      <mesh scale={1.5}>
        <sphereGeometry args={[radius, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.18} depthWrite={false} />
      </mesh>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * growth}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

interface BranchProps {
  branch: RepoBranch
  branchIndex: number
  min: number
  max: number
  elapsed: number
  selectedId: string | null
  onSelect: (event: BranchEvent) => void
}

function Branch({
  branch,
  branchIndex,
  min,
  max,
  elapsed,
  selectedId,
  onSelect,
}: BranchProps) {
  const growth = easeOutCubic(
    Math.min(1, Math.max(0, (elapsed - branchIndex * STAGGER) / GROWTH_DURATION)),
  )

  const positions = useMemo(
    () =>
      branch.events.map((event, index) =>
        eventPosition(event, index, branch.events.length, branch.angle, min, max),
      ),
    [branch, min, max],
  )

  const trunkPoint = useMemo(() => {
    const y = positions.length > 0 ? positions[0].y * 0.15 : 0
    return new THREE.Vector3(
      Math.cos(branch.angle) * 0.25,
      y,
      Math.sin(branch.angle) * 0.25,
    )
  }, [branch.angle, positions])

  const curvePoints = useMemo(() => {
    if (positions.length === 0) return [trunkPoint]
    return [trunkPoint, ...positions.map((point) => point.clone().multiplyScalar(growth))]
  }, [positions, trunkPoint, growth])

  return (
    <group>
      {curvePoints.length > 1 && (
        <CatmullRomLine
          points={curvePoints}
          color={PALETTE.track}
          lineWidth={1.5}
          transparent
          opacity={0.85 * growth}
        />
      )}
      {branch.events.map((event, index) => (
        <Leaf
          key={event.id}
          event={event}
          position={positions[index]}
          opacity={timeToOpacity(event.created_at, min, max)}
          radius={leafRadius(event)}
          growth={growth}
          selected={selectedId === event.id}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}

function WelcomePulse({ mountTime }: { mountTime: MutableRefObject<number | null> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const doneRef = useRef(false)

  useFrame((state) => {
    if (!meshRef.current || doneRef.current || mountTime.current === null) return
    const elapsed = state.clock.elapsedTime - mountTime.current
    if (elapsed >= 0.5) {
      doneRef.current = true
      meshRef.current.visible = false
      return
    }
    const t = elapsed / 0.5
    meshRef.current.scale.setScalar(0.5 + t * 2.5)
    const material = meshRef.current.material as THREE.MeshBasicMaterial
    material.opacity = (1 - t) * 0.35
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 24, 24]} />
      <meshBasicMaterial color={PALETTE.glow} transparent opacity={0.35} depthWrite={false} />
    </mesh>
  )
}

export function BranchTree() {
  const events = useStore((state) => state.events)
  const selectedEvent = useStore((state) => state.selectedEvent)
  const setSelectedEvent = useStore((state) => state.setSelectedEvent)
  const groupRef = useRef<THREE.Group>(null)
  const mountTime = useRef<number | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const showPulse = useRef(
    typeof window !== 'undefined' && !sessionStorage.getItem('branch-visited'),
  )

  useEffect(() => {
    if (showPulse.current) {
      sessionStorage.setItem('branch-visited', '1')
    }
  }, [])

  const branches = useMemo(() => groupByRepo(events), [events])
  const { min, max } = useMemo(() => timeRange(events), [events])

  useFrame((state) => {
    if (mountTime.current === null) mountTime.current = state.clock.elapsedTime
    const nextElapsed = state.clock.elapsedTime - mountTime.current
    if (nextElapsed <= GROWTH_DURATION + branches.length * STAGGER + 0.2) {
      setElapsed(nextElapsed)
    }

    if (groupRef.current) {
      groupRef.current.rotation.y += 0.002
    }
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 10, 12]} />
        <meshBasicMaterial color={PALETTE.trunk} />
      </mesh>

      {showPulse.current && <WelcomePulse mountTime={mountTime} />}

      {branches.map((branch, index) => (
        <Branch
          key={branch.repo}
          branch={branch}
          branchIndex={index}
          min={min}
          max={max}
          elapsed={elapsed}
          selectedId={selectedEvent?.id ?? null}
          onSelect={setSelectedEvent}
        />
      ))}
    </group>
  )
}
