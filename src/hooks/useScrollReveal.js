import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePrefersReducedMotion } from './useMotionPreferences';

gsap.registerPlugin(ScrollTrigger);

/**
 * Fades + rises the direct children of the returned ref's element into
 * place as they enter the viewport, staggered. Used the same way on every
 * page for consistency — a page's own JSX doesn't need to know GSAP exists,
 * it just spreads the ref onto its outer container.
 *
 * `gsap.context` + `ctx.revert()` on cleanup is what satisfies the
 * "cleanup Three.js/GSAP resources on unmount" requirement — without it,
 * ScrollTrigger instances and DOM listeners would pile up across route
 * navigations in this SPA.
 */
export function useScrollReveal({ selector = ':scope > *', y = 24, stagger = 0.08, disabled = false } = {}) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || reducedMotion) return undefined;

    const targets = el.querySelectorAll(selector);
    if (!targets.length) return undefined;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
          stagger,
          // Without this, GSAP leaves an inline `transform: translate3d(0,0,0)`
          // on each revealed card even once it settles at y:0 — a transform
          // of any value (including identity) creates a new CSS stacking
          // context, which silently traps that card's own z-30 children
          // (e.g. the DatePicker dropdown in Attendance's date-row card)
          // inside it. The dropdown could then never paint above a later
          // sibling card, since the sibling's own stacking context painted
          // after the trapped one regardless of the dropdown's z-index —
          // this was the actual cause of the calendar rendering behind the
          // lecture list below it.
          clearProps: 'transform',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        }
      );
    }, el);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, reducedMotion, selector, y, stagger]);

  return ref;
}
