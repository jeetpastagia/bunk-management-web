import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './useMotionPreferences';

/**
 * Attaches a subtle mouse-driven 3D tilt + lift to whatever element the
 * returned ref is put on. Pair with the `.tilt-card` CSS class (index.css)
 * for the transform-origin/transition/perspective setup.
 *
 * Writes directly to el.style instead of React state so a fast mousemove
 * never triggers a re-render — this is a pure DOM/GPU-transform effect.
 */
export function usePointerTilt({ max = 8, lift = 6, scale = 1.015, disabled = false } = {}) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || reducedMotion) return undefined;
    // Touch devices have no hover concept — a tilt-on-hover listener would
    // just be dead weight there.
    if (window.matchMedia('(hover: none)').matches) return undefined;

    let frame = null;

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(${-lift}px) scale3d(${scale}, ${scale}, ${scale})`;
      });
    };

    const handleLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = '';
    };

    el.addEventListener('pointermove', handleMove);
    el.addEventListener('pointerleave', handleLeave);
    return () => {
      el.removeEventListener('pointermove', handleMove);
      el.removeEventListener('pointerleave', handleLeave);
      if (frame) cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [disabled, reducedMotion, max, lift, scale]);

  return ref;
}
