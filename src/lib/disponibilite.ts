// Règles de la « disponibilité maintenant » : elle expire automatiquement. Fichier SANS dépendance serveur.

export const DUREES_DISPONIBILITE_H = [4, 12, 24, 48] as const
export type DureeDisponibiliteH = (typeof DUREES_DISPONIBILITE_H)[number]
export const DUREE_PAR_DEFAUT_H: DureeDisponibiliteH = 24

const MS_PAR_HEURE = 3_600_000

export function dureeValide(heures: unknown): heures is DureeDisponibiliteH {
  return typeof heures === 'number' && (DUREES_DISPONIBILITE_H as readonly number[]).includes(heures)
}

/** Date de fin d'une disponibilité commencée maintenant. */
export function finDisponibilite(heures: number, maintenant: Date = new Date()): Date {
  return new Date(maintenant.getTime() + heures * MS_PAR_HEURE)
}

export interface EtatDisponibilite {
  disponible: boolean
  disponibleJusqua: Date | null
}

/** Disponible MAINTENANT = indicateur actif ET échéance non dépassée (une échéance absente vaut « expirée »). */
export function disponibleMaintenant(p: EtatDisponibilite, maintenant: Date = new Date()): boolean {
  return p.disponible && !!p.disponibleJusqua && p.disponibleJusqua.getTime() > maintenant.getTime()
}

/** Faut-il envoyer le rappel de renouvellement ? Dans les 2 dernières heures, pour une disponibilité d'au moins 6 h, une seule fois. */
export function rappelRenouvellementDu(
  p: EtatDisponibilite & { dureeH: number; rappelEnvoyeLe: Date | null },
  maintenant: Date = new Date()
): boolean {
  if (!disponibleMaintenant(p, maintenant) || p.rappelEnvoyeLe || p.dureeH < 6) return false
  return p.disponibleJusqua!.getTime() - maintenant.getTime() <= 2 * MS_PAR_HEURE
}
