import { Transition, Variants } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Native iOS / iPadOS Spring Physics and Motion System
 */

export const springs = {
  // Ultra snappy response for buttons, toggles, checkmarks
  snappy: {
    type: 'spring',
    stiffness: 500,
    damping: 32,
    mass: 0.8,
  } as Transition,

  // Standard iOS fluid interactive response (sheet presentation, navigation, cards)
  standard: {
    type: 'spring',
    stiffness: 380,
    damping: 30,
    mass: 1,
  } as Transition,

  // Gentle, floating physics (large modal backdrop, page transitions)
  gentle: {
    type: 'spring',
    stiffness: 240,
    damping: 26,
    mass: 1,
  } as Transition,

  // Bouncy spring for playful icons or celebration checkmark
  bouncy: {
    type: 'spring',
    stiffness: 400,
    damping: 18,
    mass: 0.8,
  } as Transition,
};

export const timings = {
  fast: 0.15,
  standard: 0.24,
  sheet: 0.38,
  page: 0.28,
};

export const easings = {
  ios: [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

/**
 * Standard press scale configuration for iOS touch feedback
 */
export const pressAnimation = {
  scale: 0.96,
  transition: { duration: 0.12, ease: easings.ios },
};

/**
 * Bottom Sheet Variants for mobile presentation
 */
export const sheetVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0.8,
    transition: springs.standard,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: springs.standard,
  },
  exit: {
    y: '100%',
    opacity: 0.5,
    transition: { duration: 0.24, ease: [0.32, 0, 0.67, 0] },
  },
};

/**
 * Floating Centered Sheet Variants for iPadOS / Desktop
 */
export const centeredSheetVariants: Variants = {
  hidden: {
    scale: 0.94,
    opacity: 0,
    y: 12,
    transition: springs.standard,
  },
  visible: {
    scale: 1,
    opacity: 1,
    y: 0,
    transition: springs.standard,
  },
  exit: {
    scale: 0.96,
    opacity: 0,
    y: 8,
    transition: { duration: 0.18, ease: easings.ios },
  },
};

/**
 * Action Sheet Variants
 */
export const actionSheetVariants: Variants = {
  hidden: {
    y: '100%',
    opacity: 0,
    transition: springs.snappy,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: springs.snappy,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: easings.ios },
  },
};

/**
 * Context Menu / Popover scale animation
 */
export const popoverVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.92,
    y: -4,
    transition: springs.snappy,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springs.snappy,
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.14 },
  },
};

/**
 * Subtle Page Transition Variants
 */
export const pageVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 6,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: timings.page,
      ease: easings.easeOut,
    },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: {
      duration: 0.14,
      ease: easings.ios,
    },
  },
};

/**
 * Backdrop Dimming Variants
 */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { duration: timings.standard } 
  },
  exit: { 
    opacity: 0, 
    transition: { duration: 0.2 } 
  },
};

/**
 * Hook to detect and observe prefers-reduced-motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}
