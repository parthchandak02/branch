import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Background } from './components/Background'
import { BranchTree } from './components/BranchTree'
import { Chrome } from './components/Chrome'
import { fetchEvents, SAMPLE_EVENTS } from './data/events'
import { useStore } from './store'

function DataLoader() {
  const setEvents = useStore((state) => state.setEvents)
  const setLastFetchTime = useStore((state) => state.setLastFetchTime)
  const setFetchError = useStore((state) => state.setFetchError)

  useEffect(() => {
    let active = true
    let timer: number | undefined

    const load = async () => {
      const result = await fetchEvents()
      if (!active) return
      if (result.events) {
        setEvents(result.events, 'live')
        setLastFetchTime(Date.now())
        setFetchError(null)
      } else {
        // Keep live events already on screen; only show the samples if nothing loaded yet.
        if (useStore.getState().dataMode !== 'live') setEvents(SAMPLE_EVENTS, 'sample')
        setFetchError(result.error ?? 'request failed')
      }
      timer = window.setTimeout(() => void load(), result.nextPollMs)
    }

    void load()

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [setEvents, setLastFetchTime, setFetchError])

  return null
}

export default function App() {
  return (
    <div className="app">
      <DataLoader />
      <div className="canvas-layer">
        <Canvas
          camera={{ position: [0, 1.5, 9], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
        >
          <Suspense fallback={null}>
            <Background />
            <BranchTree />
            <OrbitControls
              enableDamping
              dampingFactor={0.06}
              minDistance={4}
              maxDistance={18}
              maxPolarAngle={Math.PI * 0.85}
            />
          </Suspense>
        </Canvas>
      </div>
      <Chrome />
    </div>
  )
}
