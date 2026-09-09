import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from './useMotionPreferences';

/** Pulls the element a few px toward the pointer while hovered — used for primary CTA buttons. */
export function useMagneticHover({ strength = 0.25, max = 8, disabled = false } = {}) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || reducedMotion) return undefined;
    if (window.matchMedia('(hover: none)').matches) return undefined;

    let frame = null;
    const clamp = (v) => Math.max(-max, Math.min(max, v));

    const handleMove = (e) => {
      const rect = el.getBoundingClientRect();
      const dx = clamp((e.clientX - rect.left - rect.width / 2) * strength);
      const dy = clamp((e.clientY - rect.top - rect.height / 2) * strength);
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
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
  }, [disabled, reducedMotion, strength, max]);

  return ref;
}
