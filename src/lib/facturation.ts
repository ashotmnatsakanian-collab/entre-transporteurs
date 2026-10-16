// Règles d'ouverture du paiement pour les commissionnaires.
//
// Tant que Stripe n'est pas configuré, l'accès est gratuit pour tous (période de lancement).
// Quand il l'est, FACTURATION_A_PARTIR_DU fixe la date d'entrée en vigueur : avant cette date l'accès reste
// libre (et un bandeau annonce le changement), à partir de cette date chaque commissionnaire bénéficie de
// 30 jours d'essai sans carte. Cela tient l'engagement des CGU : prévenir au moins 30 jours avant toute
// facturation, sans que l'essai soit « consommé » pendant le lancement gratuit.

export const JOURS_ESSAI = 30
const MS_PAR_JOUR = 86_400_000

export function paiementConfigure(): boolean {
  return !!process.env.STRIPE_SECRET_KEY
}

/** Date d'entrée en vigueur de la facturation, ou null si non renseignée / invalide. */
export function debutFacturation(): Date | null {
  const brut = process.env.FACTURATION_A_PARTIR_DU?.trim()
  if (!brut) return null
  const d = new Date(brut)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Le paiement est-il exigé des commissionnaires à cet instant ? */
export function facturationActive(maintenant: Date = new Date()): boolean {
  if (!paiementConfigure()) return false
  const debut = debutFacturation()
  return !debut || maintenant >= debut
}

/** Date future à laquelle l'accès deviendra payant, pour informer les commissionnaires (sinon null). */
export function facturationAnnoncee(maintenant: Date = new Date()): Date | null {
  if (!paiementConfigure()) return null
  const debut = debutFacturation()
  return debut && maintenant < debut ? debut : null
}

/**
 * Fin d'essai effective : jamais avant « début de facturation + 30 jours », pour que les comptes créés
 * pendant le lancement gratuit disposent eux aussi d'un vrai mois d'essai.
 */
export function finEssaiEffective(dateFinEssai: Date | null): Date | null {
  const debut = debutFacturation()
  if (!debut) return dateFinEssai
  const plancher = new Date(debut.getTime() + JOURS_ESSAI * MS_PAR_JOUR)
  return dateFinEssai && dateFinEssai > plancher ? dateFinEssai : plancher
}

export function joursRestants(fin: Date, maintenant: Date = new Date()): number {
  return Math.ceil((fin.getTime() - maintenant.getTime()) / MS_PAR_JOUR)
}
