import type { Role, StatutAbonnement, TypeVehicule, Specificite } from '@prisma/client'

export type { Role, StatutAbonnement, TypeVehicule, Specificite }

export interface TransporteurAvecDistance {
  id: string
  userId: string
  siret: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
  zonesCirculation: string[]
  disponible: boolean
  derniereMAJ: Date
  distance_km: number
  user: { nom: string; telephone: string | null; email: string }
}

export interface VehiculeAvecTransporteur {
  id: string
  type: TypeVehicule
  specificites: Specificite[]
  longueur: number | null
  largeur: number | null
  hauteur: number | null
  chargeUtile: number
  immatriculation: string | null
  actif: boolean
  transporteurId: string
}

export interface MessageAvecExpediteur {
  id: string
  conversationId: string
  contenu: string
  lu: boolean
  createdAt: string
  expediteur: {
    id: string
    nom: string
    role: Role
  }
}

export interface ConversationAvecDetails {
  id: string
  createdAt: string
  updatedAt: string
  participants: Array<{ user: { id: string; nom: string; role: Role } }>
  messages: MessageAvecExpediteur[]
  _count: { messages: number }
}

export interface FiltresRecherche {
  lat: number
  lng: number
  rayonKm: number
  typeVehicule?: TypeVehicule
  chargeUtileMin?: number
  longueurMin?: number
  largeurMin?: number
  specificites?: Specificite[]
  disponibleSeulement?: boolean
}

export interface AnnonceAvecVehicule {
  id: string
  transporteurId: string
  villeDepart: string
  latDepart: number
  lngDepart: number
  villeArrivee: string | null
  dateDisponibilite: string
  dateDisponibiliteFin: string | null
  commentaire: string | null
  active: boolean
  vehicule: { id: string; type: TypeVehicule; chargeUtile: number } | null
}

export interface AnnonceRecherche {
  id: string
  transporteurId: string
  villeDepart: string
  villeArrivee: string | null
  dateDisponibilite: string
  dateDisponibiliteFin: string | null
  commentaire: string | null
  raisonSociale: string
  disponible: boolean
  nom: string
  telephone: string | null
  vehiculeType: TypeVehicule | null
  vehiculeChargeUtile: number | null
  distance_km: number
}

export const TYPE_VEHICULE_LABELS: Record<TypeVehicule, string> = {
  PORTEUR: 'Porteur',
  SEMI: 'Semi-remorque',
  VL: 'Véhicule léger',
  UTILITAIRE: 'Utilitaire',
  PLATEAU: 'Plateau',
  BENNE: 'Benne',
  CITERNE: 'Citerne',
  FOURGON: 'Fourgon',
}

export const SPECIFICITE_LABELS: Record<Specificite, string> = {
  HAYON: 'Hayon',
  FRIGORIFIQUE: 'Frigorifique',
  BACHE: 'Bâché',
  PLATEAU: 'Plateau',
  ADR: 'ADR',
  GRUE: 'Grue auxiliaire',
  AMPLIROLL: 'Ampliroll',
  CAISSE_MOBILE: 'Caisse mobile',
  SAVOYARDE: 'Savoyarde',
  MEGA: 'Méga',
  DOUBLE_PLANCHER: 'Double plancher',
  VEHICULE_ACCOMPAGNE: 'Véhicule accompagné',
}
