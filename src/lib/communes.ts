// Résolution d'une commune à partir de son code INSEE, auprès de l'API officielle (geo.api.gouv.fr).
// Le serveur ne fait JAMAIS confiance aux coordonnées, au nom ni au département envoyés par le navigateur :
// il les retrouve lui-même. Les coordonnées enregistrées sont donc toujours celles du CENTRE d'une commune,
// jamais une position GPS exacte.
import { z } from 'zod'
import { departement, departementDepuisInsee, region } from './referentiel-geo'

export interface Commune {
  insee: string
  nom: string
  departement: string
  region: string
  latitude: number
  longitude: number
}

export class ErreurCommune extends Error {
  constructor(public status: 400 | 404 | 503, message: string) {
    super(message)
  }
}

export const INSEE_REGEX = /^(\d{5}|2[AB]\d{3})$/

const reponseApi = z.object({
  nom: z.string().min(1).max(120),
  code: z.string(),
  codeDepartement: z.string(),
  codeRegion: z.string(),
  centre: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
})

const TTL_MS = 24 * 60 * 60_000
const TAILLE_MAX_CACHE = 5000
const cache = new Map<string, { commune: Commune; expire: number }>()

type Fetcher = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export async function resoudreCommune(insee: string, fetcher: Fetcher = fetch as unknown as Fetcher, maintenant = Date.now()): Promise<Commune> {
  if (!INSEE_REGEX.test(insee)) throw new ErreurCommune(400, 'Code commune invalide')
  const enCache = cache.get(insee)
  if (enCache && enCache.expire > maintenant) return enCache.commune

  // Deux tentatives courtes : le service public répond en quelques dizaines de ms, mais une connexion peut s'enliser (IPv6)
  let corps: unknown
  for (let tentative = 1; ; tentative++) {
    try {
      const res = await fetcher(`https://geo.api.gouv.fr/communes/${insee}?fields=nom,code,codeDepartement,codeRegion,centre&format=json`, {
        signal: AbortSignal.timeout(4000),
      })
      if (res.status === 404) throw new ErreurCommune(404, 'Commune introuvable')
      if (!res.ok) throw new Error(`statut ${res.status}`)
      corps = await res.json()
      break
    } catch (err) {
      if (err instanceof ErreurCommune) throw err
      // Échec fermé : sans confirmation officielle, aucune position n'est enregistrée
      if (tentative >= 2) throw new ErreurCommune(503, 'Le service de localisation est momentanément indisponible')
    }
  }

  const lu = reponseApi.safeParse(corps)
  if (!lu.success || lu.data.code !== insee) throw new ErreurCommune(503, 'Réponse du service de localisation inattendue')

  const { nom, codeDepartement, codeRegion, centre } = lu.data
  // Cohérence : le département annoncé doit correspondre au code INSEE et exister dans notre référentiel (outre-mer lointain exclu)
  if (codeDepartement !== departementDepuisInsee(insee) || !departement(codeDepartement) || !region(codeRegion)) {
    throw new ErreurCommune(404, "Cette commune n'est pas prise en charge")
  }

  const [longitude, latitude] = centre.coordinates
  const commune: Commune = { insee, nom, departement: codeDepartement, region: codeRegion, latitude, longitude }
  if (cache.size >= TAILLE_MAX_CACHE) cache.clear()
  cache.set(insee, { commune, expire: maintenant + TTL_MS })
  return commune
}

/** Vide le cache (tests). */
export function viderCacheCommunes(): void {
  cache.clear()
}
