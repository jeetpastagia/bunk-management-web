import { useEffect, useState } from 'react';

/**
 * Tracks the OS-level "reduce motion" accessibility setting live (it can
 * change while the app is open). Every animation feature in the app —
 * 3D scenes, scroll reveals, card tilt, page transitions — must check
 * this and fully disable itself, not just slow down, when it's true.
 */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

/**
 * A coarse, one-time-per-session "can this device comfortably handle
 * heavier 3D detail" heuristic — used to scale geometry complexity,
 * particle counts and devicePixelRatio, NOT to decide whether motion
 * happens at all (that's usePrefersReducedMotion's job).
 */
function computeDeviceTier() {
  if (typeof navigator === 'undefined') return 'high';
  const cores = navigator.hardwareConcurrency || 8;
  const mem = navigator.deviceMemory; // Chrome/Edge only; undefined elsewhere
  const smallScreen = typeof window !== 'undefined' && window.innerWidth < 640;
  const lowCores = cores <= 4;
  const lowMem = mem !== undefined && mem <= 4;
  return lowCores || lowMem || smallScreen ? 'low' : 'high';
}

export function useDeviceTier() {
  const [tier] = useState(computeDeviceTier);
  return tier; // 'low' | 'high'
}
