import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { usePrefersReducedMotion } from '../hooks/useMotionPreferences';

/**
 * A light fade+rise on the new route's content each time the path changes.
 * Deliberately enter-only (no exit/cross-fade of the old page) — React
 * Router's <Outlet> already swaps the DOM synchronously, so animating only
 * the incoming content avoids any "old page lingers/flashes" coordination
 * that an exit animation would need, and adds zero navigation delay.
 */
export default function PageTransition({ children }) {
  const location = useLocation();
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (reducedMotion || !el) return undefined;
    const tween = gsap.fromTo(el, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
    return () => tween.kill();
  }, [location.pathname, reducedMotion]);

  return <div ref={ref}>{children}</div>;
}
