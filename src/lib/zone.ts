// Zone de recherche d'un commissionnaire : autour d'une ville (rayon), départements ou région.
// Fichier SANS dépendance serveur : partagé par les écrans de recherche et leurs tests.
import { departement, departementsDeLaRegion, libelleDepartement, region } from './referentiel-geo'

export type ModeZone = 'ville' | 'departements' | 'region'

export interface Zone {
  mode: ModeZone
  /** Mode « ville » : centre de la recherche (centre de la commune choisie) */
  lat?: number
  lng?: number
  insee?: string
  villeNom?: string
  rayonKm: number
  /** Mode « départements » : un ou plusieurs codes */
  departements: string[]
  /** Mode « région » : code région */
  region?: string
}

export const MAX_DEPARTEMENTS_RECHERCHE = 12
export const ZONE_PAR_DEFAUT: Zone = { mode: 'ville', rayonKm: 100, departements: [] }

/** La zone est-elle assez précise pour lancer une recherche ? */
export function zoneComplete(z: Zone): boolean {
  if (z.mode === 'ville') return z.lat !== undefined && z.lng !== undefined
  if (z.mode === 'departements') return z.departements.length > 0
  return !!z.region
}

/** Critères géographiques au format attendu par les API (POST /api/recherche, GET /api/annonces). */
export function zonePourApi(z: Zone): { lat?: number; lng?: number; rayonKm?: number; departements?: string[]; region?: string } {
  if (z.mode === 'ville') return { lat: z.lat, lng: z.lng, rayonKm: z.rayonKm }
  if (z.mode === 'departements') return { departements: z.departements }
  return { region: z.region }
}

export function zonePourQuery(z: Zone): Record<string, string> {
  const api = zonePourApi(z)
  const q: Record<string, string> = {}
  if (api.lat !== undefined && api.lng !== undefined) {
    q.lat = String(api.lat)
    q.lng = String(api.lng)
    q.rayonKm = String(api.rayonKm ?? z.rayonKm)
  }
  if (api.departements?.length) q.departements = api.departements.join(',')
  if (api.region) q.region = api.region
  return q
}

/** « autour de Metz (100 km) », « Moselle (57), Bas-Rhin (67) », « Grand Est ». */
export function libelleZone(z: Zone): string {
  if (z.mode === 'ville') return `autour de ${z.villeNom ?? 'la ville choisie'} (${z.rayonKm} km)`
  if (z.mode === 'departements') return z.departements.map(libelleDepartement).join(', ')
  return region(z.region)?.nom ?? ''
}

/** Codes des départements couverts par la zone (pour une alerte) ; null en mode « ville ». */
export function departementsDeLaZone(z: Zone): string[] | null {
  if (z.mode === 'departements') return z.departements
  if (z.mode === 'region' && z.region) return departementsDeLaRegion(z.region)
  return null
}

/** Distance entre deux points (km), même formule qu'en SQL (src/lib/geo.ts). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180
  const d = 6371 * Math.acos(Math.min(1, Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lng2 - lng1) * rad) + Math.sin(lat1 * rad) * Math.sin(lat2 * rad)))
  return Math.round(d * 10) / 10
}

/** Une annonce reçue en direct correspond-elle à la zone ? (même règle que la recherche côté serveur) */
export function annonceDansZone(a: { latDepart: number; lngDepart: number; departementDepart: string | null }, z: Zone): boolean {
  if (z.mode === 'ville') return z.lat !== undefined && z.lng !== undefined && distanceKm(z.lat, z.lng, a.latDepart, a.lngDepart) <= z.rayonKm
  if (!a.departementDepart) return false
  if (z.mode === 'departements') return z.departements.includes(a.departementDepart)
  return !!z.region && departement(a.departementDepart)?.region === z.region
}
