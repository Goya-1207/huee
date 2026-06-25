// ─── SVG icon set (stroke-based, currentColor) ───
const Ic = {
  pin: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="12" cy="10" r="2.4" fill="currentColor"/>
    </svg>
  ),
  flag: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 21V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 4.5h10.5l-2 3.5 2 3.5H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  swap: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M7 4v13m0 0l-3-3m3 3l3-3M17 20V7m0 0l-3 3m3-3l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  walk: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="13" cy="4.5" r="1.8" fill="currentColor"/>
      <path d="M13 8l-3 2 1 4m2-6l3 1.5 1 3.5m-4-5l-1.5 6L7 21m4-5l3 1 1.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  clock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  male: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="10" cy="14" r="5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M14 10l5-5m0 0h-4m4 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  female: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M12 14v7m-3-3h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  acc: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="11" cy="4.5" r="1.8" fill="currentColor"/>
      <path d="M9 8v5h4l3 6m-7-11h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 15a4.5 4.5 0 11-5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  drop: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3s6 6.5 6 10.5a6 6 0 01-12 0C6 9.5 12 3 12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  sparkle: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  ),
  home: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M4 11l8-6.5L20 11v8.5a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1V11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  ),
  map: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 4v14m6-10v14" stroke="currentColor" strokeWidth="1.8"/>
    </svg>
  ),
  user: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M4.5 20a7.5 7.5 0 0115 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  ),
  arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 12h13m0 0l-5-5m5 5l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevR: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  near: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.6" opacity="0.6"/>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" opacity="0.3"/>
    </svg>
  ),
  transfer: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M5 8h11m0 0l-3-3m3 3l-3 3M19 16H8m0 0l3-3m-3 3l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  terminal: (p) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path d="M6 20V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 5.5h11l-2 3 2 3H6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="6" cy="20" r="1.6" fill="currentColor"/>
    </svg>
  ),
};

Object.assign(window, { Ic });
