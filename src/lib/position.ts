// État de la position et de la disponibilité d'un transporteur — serveur.
import type { TransporteurProfil } from '@prisma/client'
import { disponibleMaintenant } from './disponibilite'
import { getIO } from './socket-server'

export interface EtatPosition {
  positionVille: string | null
  positionInsee: string | null
  positionDepartement: string | null
  positionRegion: string | null
  /** Disponible MAINTENANT (indicateur actif et échéance non dépassée) */
  disponible: boolean
  disponibleJusqua: Date | null
  dureeHeures: number
  derniereMAJ: Date
  rayonInterventionKm: number | null
  departements: string[]
  destinationVille: string | null
  destinationInsee: string | null
}

export function etatPosition(p: TransporteurProfil, maintenant: Date = new Date()): EtatPosition {
  const actif = disponibleMaintenant(p, maintenant)
  return {
    positionVille: p.positionVille,
    positionInsee: p.positionInsee,
    positionDepartement: p.positionDepartement,
    positionRegion: p.positionRegion,
    disponible: actif,
    disponibleJusqua: actif ? p.disponibleJusqua : null,
    dureeHeures: p.dureeDisponibiliteH,
    derniereMAJ: p.derniereMAJ,
    rayonInterventionKm: p.rayonInterventionKm,
    departements: p.zonesCirculation,
    destinationVille: p.destinationVille,
    destinationInsee: p.destinationInsee,
  }
}

/** Prévient les commissionnaires connectés à la carte qu'il faut rafraîchir les compteurs par département. */
export function diffuserChangementCarte(): void {
  getIO()?.to('carte').emit('carte-change', { t: Date.now() })
}
