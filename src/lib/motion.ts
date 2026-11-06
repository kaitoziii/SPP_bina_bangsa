import { Variants, Transition } from "framer-motion";

// Natural Apple-like spring & easing configurations
export const transitionFast: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const transitionSmooth: Transition = {
  duration: 0.25,
  ease: [0.16, 1, 0.3, 1], // Apple cubic-bezier easeOut
};

export const transitionPage: Transition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1],
};

// Page transitions: subtle fade and 8-12px vertical shift
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitionSmooth,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: { duration: 0.15 },
  },
};

// Staggered lists / cards
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04, // 40ms stagger
      delayChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitionSmooth,
  },
};

// Modals, dialogs, sheets
export const modalOverlayVariants: Variants = {
  closed: { opacity: 0 },
  open: { opacity: 1, transition: { duration: 0.2 } },
};

export const modalContentVariants: Variants = {
  closed: { opacity: 0, scale: 0.97, y: 8 },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 350,
      damping: 28,
    },
  },
};

// Micro-interactions for buttons
export const buttonPress = {
  whileHover: { scale: 1.01 },
  whileTap: { scale: 0.98 },
  transition: { duration: 0.1 },
};

// Status Badge crossfade transition
export const badgeVariants: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.15 } },
};
