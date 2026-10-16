// Limiteur de débit à fenêtre fixe, en mémoire.
// Suffisant pour une instance unique (Render gratuit) ; à remplacer par Redis
// (ex: Upstash) si l'application est répliquée sur plusieurs instances.
interface Compteur {
  n: number
  reinitLe: number
}

const g = globalThis as unknown as { _limiteurs?: Map<string, Compteur>; _limiteurNettoyage?: NodeJS.Timeout }
const compteurs = (g._limiteurs ??= new Map<string, Compteur>())

if (!g._limiteurNettoyage) {
  g._limiteurNettoyage = setInterval(() => {
    const maintenant = Date.now()
    for (const [cle, c] of compteurs) if (c.reinitLe <= maintenant) compteurs.delete(cle)
  }, 60_000)
  g._limiteurNettoyage.unref()
}

export interface ResultatLimite {
  autorise: boolean
  restant: number
  retryApresSec: number
}

export function consommer(cle: string, max: number, fenetreMs: number): ResultatLimite {
  const maintenant = Date.now()
  let c = compteurs.get(cle)
  if (!c || c.reinitLe <= maintenant) {
    c = { n: 0, reinitLe: maintenant + fenetreMs }
    compteurs.set(cle, c)
  }
  c.n += 1
  const autorise = c.n <= max
  return { autorise, restant: Math.max(0, max - c.n), retryApresSec: Math.ceil((c.reinitLe - maintenant) / 1000) }
}

/** Lecture sans consommer (ex: vérifier un verrouillage de compte). */
export function compteActuel(cle: string): number {
  const c = compteurs.get(cle)
  return c && c.reinitLe > Date.now() ? c.n : 0
}

export function reinitialiser(cle: string): void {
  compteurs.delete(cle)
}
