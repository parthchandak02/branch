import { Suspense, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Background } from './components/Background'
import { BranchTree } from './components/BranchTree'
import { Chrome } from './components/Chrome'
import { fetchEvents, POLL_INTERVAL } from './data/events'
import { useStore } from './store'

function DataLoader() {
  const setEvents = useStore((state) => state.setEvents)
  const setLastFetchTime = useStore((state) => state.setLastFetchTime)

  useEffect(() => {
    let active = true

    const load = async () => {
      const result = await fetchEvents()
      if (!active) return
      setEvents(result.events, result.mode)
      setLastFetchTime(Date.now())
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, POLL_INTERVAL)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [setEvents, setLastFetchTime])

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
