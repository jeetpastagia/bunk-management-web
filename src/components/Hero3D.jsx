import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useDeviceTier } from '../hooks/useMotionPreferences';

/**
 * The floating brand shape: a dark graphite/gunmetal torus knot (matching
 * the app's black/dark-gray theme — no blue/purple accent), always slowly
 * rotating (Float, for the "subtle floating/rotation" requirement) and
 * gently easing toward wherever the pointer is (state.pointer is R3F's
 * built-in normalized -1..1 pointer position — no extra event listeners
 * needed). Geometry segment count drops sharply on low-tier devices.
 */
function BrandShape({ lowDetail }) {
  const meshRef = useRef(null);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    mesh.rotation.x += delta * 0.15;
    mesh.rotation.y += delta * 0.22;
    const targetX = state.pointer.y * 0.35;
    const targetY = state.pointer.x * 0.35;
    mesh.rotation.x += (targetX - mesh.rotation.x) * 0.03;
    mesh.rotation.y += (targetY - mesh.rotation.y) * 0.03;
  });

  return (
    <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.7}>
      <mesh ref={meshRef}>
        <torusKnotGeometry args={[1, 0.32, lowDetail ? 64 : 180, lowDetail ? 8 : 24]} />
        <meshStandardMaterial color="#3F3F46" roughness={0.3} metalness={0.75} emissive="#0A0A0C" emissiveIntensity={0.3} />
      </mesh>
    </Float>
  );
}

/**
 * Decorative-only 3D scene (aria-hidden). Meant to sit behind existing page
 * content via absolute positioning from the caller, never to gate it —
 * import this with React.lazy() so its ~150KB+ of Three.js/R3F code never
 * loads on pages that don't use it.
 */
export default function Hero3D({ className = '' }) {
  const tier = useDeviceTier();
  const dpr = tier === 'low' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

  return (
    <div className={className} aria-hidden="true">
      <Canvas
        dpr={dpr}
        gl={{ antialias: tier !== 'low', alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 4.5], fov: 45 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[3, 3, 4]} intensity={1.2} color="#E4E4E7" />
        <pointLight position={[-3, -2, -2]} intensity={0.5} color="#8F8F97" />
        <Suspense fallback={null}>
          <BrandShape lowDetail={tier === 'low'} />
        </Suspense>
      </Canvas>
    </div>
  );
}
