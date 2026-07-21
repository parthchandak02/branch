import { useMemo } from 'react'
import * as THREE from 'three'

const BG = '#0a0a0f'
const DOT_COLOR = '#2979ff'
const SPACING = 0.45
const GRID = 80

export function Background() {
  const geometry = useMemo(() => {
    const positions: number[] = []
    const half = (GRID * SPACING) / 2

    for (let x = 0; x < GRID; x += 1) {
      for (let y = 0; y < GRID; y += 1) {
        positions.push(x * SPACING - half, y * SPACING - half, -12)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geo
  }, [])

  return (
    <>
      <color attach="background" args={[BG]} />
      <points geometry={geometry}>
        <pointsMaterial
          color={DOT_COLOR}
          size={0.035}
          transparent
          opacity={0.08}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </>
  )
}
