import type { Variants } from 'framer-motion';
import { useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

/** Snappy spring — damping ≥ 25 (spec). */
export const GUIDE_SPRING = { type: 'spring' as const, stiffness: 380, damping: 30 };

export const guideRevealHidden = { opacity: 0, y: 16 };
export const guideRevealVisible = { opacity: 1, y: 0 };

export const GUIDE_VIEWPORT = { once: true, amount: 0.2 as const };

/**
 * Scroll-triggered reveal via IntersectionObserver (`useInView`).
 * Uses `useReducedMotion` from framer-motion: when true, state is instantly visible (no tween).
 */
export function useScrollReveal(options?: { amount?: number; once?: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const amount = options?.amount ?? 0.2;
  const once = options?.once ?? true;
  const isInView = useInView(ref, { once, amount });

  const motionProps = reduceMotion
    ? ({
        initial: false,
        animate: guideRevealVisible,
        transition: { duration: 0 },
      } as const)
    : ({
        ref,
        initial: guideRevealHidden,
        animate: isInView ? guideRevealVisible : guideRevealHidden,
        transition: GUIDE_SPRING,
      } as const);

  return { ref, isInView, reduceMotion, motionProps };
}

export function guideItemVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return {
      hidden: guideRevealVisible,
      visible: { ...guideRevealVisible, transition: { duration: 0 } },
    };
  }
  return {
    hidden: guideRevealHidden,
    visible: { ...guideRevealVisible, transition: GUIDE_SPRING },
  };
}

/** Container variants — only `transition.staggerChildren`. */
export function guideStaggerContainer(staggerSeconds: number, reduceMotion: boolean): Variants {
  return {
    hidden: {},
    visible: {
      transition: reduceMotion
        ? { staggerChildren: 0, delayChildren: 0 }
        : { staggerChildren: staggerSeconds, delayChildren: 0 },
    },
  };
}

/** Light section enter: fade + slide with viewport once. */
export function guideSectionWhileInView(reduceMotion: boolean) {
  if (reduceMotion) {
    return {
      initial: false,
      whileInView: guideRevealVisible,
      viewport: GUIDE_VIEWPORT,
      transition: { duration: 0 },
    } as const;
  }
  return {
    initial: guideRevealHidden,
    whileInView: guideRevealVisible,
    viewport: GUIDE_VIEWPORT,
    transition: GUIDE_SPRING,
  } as const;
}

/** Hero direito (“tese central”) entra após o stack dos CTAs (~100ms × 4 + folga). */
export function guidePanelAfterHeroVariants(reduceMotion: boolean): Variants {
  if (reduceMotion) {
    return guideItemVariants(true);
  }
  return {
    hidden: guideRevealHidden,
    visible: {
      opacity: 1,
      y: 0,
      transition: { ...GUIDE_SPRING, delay: 0.42 },
    },
  };
}

export const guideCardHover = {
  y: -2,
  transition: { duration: 0.15 },
} as const;

export const guidePrimaryCtaHoverTap = {
  whileHover: { scale: 1.02, transition: { duration: 0.15 } },
  whileTap: { scale: 0.98, transition: { duration: 0.12 } },
} as const;
