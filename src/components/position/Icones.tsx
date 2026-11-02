// Icônes SVG (jeu « Lucide » simplifié) : cohérentes sur tous les appareils, colorables, masquées aux lecteurs d'écran.
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const IconeLieu = ({ className }: { className?: string }) => (
  <svg {...base} className={className}><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
)
export const IconeCible = ({ className }: { className?: string }) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="8" /></svg>
)
export const IconeHorloge = ({ className }: { className?: string }) => (
  <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
)
export const IconeFermer = ({ className }: { className?: string }) => (
  <svg {...base} className={className}><path d="M18 6 6 18M6 6l12 12" /></svg>
)
