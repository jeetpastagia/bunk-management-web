import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { useDeviceTier } from '../hooks/useMotionPreferences';

/**
 * The floating brand shape: a torus knot in the app's brand purple, always
 * slowly rotating (Float, for the "subtle floating/rotation" requirement)
 * and gently easing toward wherever the pointer is (state.pointer is R3F's
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
        <meshStandardMaterial color="#6E5BFF" roughness={0.25} metalness={0.55} emissive="#231a66" emissiveIntensity={0.4} />
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
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 3, 4]} intensity={1.1} color="#8B7BFF" />
        <pointLight position={[-3, -2, -2]} intensity={0.6} color="#F2B84B" />
        <Suspense fallback={null}>
          <BrandShape lowDetail={tier === 'low'} />
        </Suspense>
      </Canvas>
    </div>
  );
}
