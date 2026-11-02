import { beforeEach, describe, expect, it } from 'vitest'
import { ErreurCommune, resoudreCommune, viderCacheCommunes } from '../src/lib/communes'
import { DUREES_DISPONIBILITE_H, disponibleMaintenant, dureeValide, finDisponibilite, rappelRenouvellementDu } from '../src/lib/disponibilite'
import { ilYA, jusquA } from '../src/lib/fraicheur'
import { DEPARTEMENTS, REGIONS, departement, departementDepuisInsee, departementsDeLaRegion, libelleDepartement, region } from '../src/lib/referentiel-geo'
import { annonceDansZone, departementsDeLaZone, distanceKm, libelleZone, zoneComplete, zonePourApi, zonePourQuery } from '../src/lib/zone'
import { aUneZone, disponibiliteSchema, positionSchema, zoneRechercheSchema, zoneSchema } from '../src/lib/validations/position'

const HEURE = 3_600_000
const reponse = (corps: unknown, status = 200) => async () => ({ ok: status < 400, status, json: async () => corps })
const metz = { nom: 'Metz', code: '57463', codeDepartement: '57', codeRegion: '44', centre: { type: 'Point', coordinates: [6.1757, 49.1193] } }

describe('référentiel géographique', () => {
  it('contient les 101 départements (métropole, Corse 2A/2B, outre-mer) et leurs régions', () => {
    expect(DEPARTEMENTS).toHaveLength(101)
    expect(REGIONS).toHaveLength(18)
    for (const code of ['01', '57', '75', '2A', '2B', '95', '971', '972', '973', '974', '976']) expect(departement(code)).toBeDefined()
    for (const d of DEPARTEMENTS) expect(region(d.region)).toBeDefined()
  })

  it('compte 96 départements métropolitains', () => {
    expect(DEPARTEMENTS.filter((d) => !d.code.startsWith('97'))).toHaveLength(96)
  })

  it('place chaque département dans une plage de coordonnées plausible', () => {
    for (const d of DEPARTEMENTS) {
      expect(d.latitude).toBeGreaterThan(-22)
      expect(d.latitude).toBeLessThan(52)
      expect(d.longitude).toBeGreaterThan(-62)
      expect(d.longitude).toBeLessThan(56)
    }
    const moselle = departement('57')!
    expect(moselle.latitude).toBeCloseTo(49.05, 0)
    expect(moselle.longitude).toBeCloseTo(6.64, 0)
  })

  it('retrouve les départements d’une région et formate un libellé', () => {
    expect(departementsDeLaRegion('44')).toEqual(expect.arrayContaining(['57', '67', '54', '88']))
    expect(departementsDeLaRegion('94').sort()).toEqual(['2A', '2B'])
    expect(libelleDepartement('57')).toBe('Moselle (57)')
    expect(libelleDepartement('zz')).toBe('zz')
  })
})

describe('déduction du département à partir du code INSEE', () => {
  it('métropole : deux premiers caractères', () => {
    expect(departementDepuisInsee('57463')).toBe('57')
    expect(departementDepuisInsee('75056')).toBe('75')
    expect(departementDepuisInsee('01001')).toBe('01')
  })
  it('Corse : 2A et 2B', () => {
    expect(departementDepuisInsee('2A004')).toBe('2A')
    expect(departementDepuisInsee('2B033')).toBe('2B')
  })
  it('outre-mer : trois premiers caractères', () => {
    expect(departementDepuisInsee('97411')).toBe('974')
    expect(departementDepuisInsee('97101')).toBe('971')
  })
  it('refuse un code mal formé', () => {
    for (const mauvais of ['', '5746', '574633', 'ABCDE', '2C001', "57' OR 1=1", '57 63']) expect(departementDepuisInsee(mauvais)).toBeNull()
  })
})

describe('résolution d’une commune auprès de l’API officielle', () => {
  beforeEach(() => viderCacheCommunes())

  it('retourne le centre de la commune, son département et sa région', async () => {
    const c = await resoudreCommune('57463', reponse(metz))
    expect(c).toMatchObject({ insee: '57463', nom: 'Metz', departement: '57', region: '44', latitude: 49.1193, longitude: 6.1757 })
  })

  it('met en cache (un seul appel pour deux demandes)', async () => {
    let appels = 0
    const f = async () => { appels++; return { ok: true, status: 200, json: async () => metz } }
    await resoudreCommune('57463', f)
    await resoudreCommune('57463', f)
    expect(appels).toBe(1)
  })

  it('refuse un code invalide sans appeler le service', async () => {
    let appels = 0
    const f = async () => { appels++; return { ok: true, status: 200, json: async () => metz } }
    await expect(resoudreCommune("57' OR 1=1", f)).rejects.toMatchObject({ status: 400 })
    expect(appels).toBe(0)
  })

  it('réessaie une fois après un échec réseau, mais jamais après un 404', async () => {
    let appels = 0
    const capricieux = async () => {
      appels++
      if (appels === 1) throw new Error('délai dépassé')
      return { ok: true, status: 200, json: async () => metz }
    }
    await expect(resoudreCommune('57463', capricieux)).resolves.toMatchObject({ nom: 'Metz' })
    expect(appels).toBe(2)

    viderCacheCommunes()
    let appels404 = 0
    await expect(resoudreCommune('99999', async () => { appels404++; return { ok: false, status: 404, json: async () => ({}) } })).rejects.toMatchObject({ status: 404 })
    expect(appels404).toBe(1)
  })

  it('404 pour une commune inconnue, 503 si le service est indisponible (échec fermé)', async () => {
    await expect(resoudreCommune('99999', reponse({}, 404))).rejects.toMatchObject({ status: 404 })
    await expect(resoudreCommune('57463', reponse({}, 500))).rejects.toMatchObject({ status: 503 })
    await expect(resoudreCommune('57463', async () => { throw new Error('réseau coupé') })).rejects.toBeInstanceOf(ErreurCommune)
    await expect(resoudreCommune('57463', reponse({ truc: 1 }))).rejects.toMatchObject({ status: 503 })
  })

  it('rejette une réponse incohérente avec le code INSEE (département falsifié)', async () => {
    await expect(resoudreCommune('57463', reponse({ ...metz, codeDepartement: '67' }))).rejects.toMatchObject({ status: 404 })
    await expect(resoudreCommune('57463', reponse({ ...metz, code: '57464' }))).rejects.toMatchObject({ status: 503 })
  })

  it('rejette une commune d’un territoire hors référentiel', async () => {
    const stPierre = { nom: 'Saint-Pierre', code: '97502', codeDepartement: '975', codeRegion: '05', centre: { type: 'Point', coordinates: [-56.17, 46.78] } }
    await expect(resoudreCommune('97502', reponse(stPierre))).rejects.toMatchObject({ status: 404 })
  })
})

describe('expiration de « disponible maintenant »', () => {
  const maintenant = new Date('2026-11-03T10:00:00Z')

  it('est disponible tant que l’échéance n’est pas dépassée', () => {
    expect(disponibleMaintenant({ disponible: true, disponibleJusqua: new Date(maintenant.getTime() + HEURE) }, maintenant)).toBe(true)
  })
  it('expire exactement à l’échéance', () => {
    expect(disponibleMaintenant({ disponible: true, disponibleJusqua: maintenant }, maintenant)).toBe(false)
    expect(disponibleMaintenant({ disponible: true, disponibleJusqua: new Date(maintenant.getTime() - 1) }, maintenant)).toBe(false)
  })
  it('une disponibilité sans échéance est considérée comme expirée', () => {
    expect(disponibleMaintenant({ disponible: true, disponibleJusqua: null }, maintenant)).toBe(false)
  })
  it('un indicateur désactivé n’est jamais disponible', () => {
    expect(disponibleMaintenant({ disponible: false, disponibleJusqua: new Date(maintenant.getTime() + HEURE) }, maintenant)).toBe(false)
  })
  it('calcule la fin selon la durée choisie (24 h par défaut)', () => {
    expect(finDisponibilite(24, maintenant).toISOString()).toBe('2026-11-04T10:00:00.000Z')
    expect(finDisponibilite(4, maintenant).toISOString()).toBe('2026-11-03T14:00:00.000Z')
  })
  it('n’autorise que 4, 12, 24 ou 48 heures', () => {
    expect([...DUREES_DISPONIBILITE_H]).toEqual([4, 12, 24, 48])
    expect(dureeValide(24)).toBe(true)
    for (const d of [0, 1, 5, 72, -4, 24.5, '24', null]) expect(dureeValide(d)).toBe(false)
  })
})

describe('rappel de renouvellement', () => {
  const maintenant = new Date('2026-11-03T10:00:00Z')
  const base = { disponible: true, dureeH: 24, rappelEnvoyeLe: null as Date | null }

  it('se déclenche dans les 2 dernières heures, une seule fois', () => {
    expect(rappelRenouvellementDu({ ...base, disponibleJusqua: new Date(maintenant.getTime() + 1.5 * HEURE) }, maintenant)).toBe(true)
    expect(rappelRenouvellementDu({ ...base, disponibleJusqua: new Date(maintenant.getTime() + 5 * HEURE) }, maintenant)).toBe(false)
    expect(rappelRenouvellementDu({ ...base, rappelEnvoyeLe: maintenant, disponibleJusqua: new Date(maintenant.getTime() + HEURE) }, maintenant)).toBe(false)
  })
  it('ne concerne pas les disponibilités courtes ni les disponibilités expirées', () => {
    expect(rappelRenouvellementDu({ ...base, dureeH: 4, disponibleJusqua: new Date(maintenant.getTime() + HEURE) }, maintenant)).toBe(false)
    expect(rappelRenouvellementDu({ ...base, disponibleJusqua: new Date(maintenant.getTime() - HEURE) }, maintenant)).toBe(false)
  })
})

describe('fraîcheur', () => {
  const maintenant = new Date('2026-11-03T10:00:00Z')
  it('formule « il y a X »', () => {
    expect(ilYA(new Date(maintenant.getTime() - 20_000), maintenant)).toBe("à l'instant")
    expect(ilYA(new Date(maintenant.getTime() - 5 * 60_000), maintenant)).toBe('il y a 5 min')
    expect(ilYA(new Date(maintenant.getTime() - 3 * HEURE), maintenant)).toBe('il y a 3 h')
    expect(ilYA(new Date(maintenant.getTime() - 50 * HEURE), maintenant)).toBe('il y a 2 j')
    expect(ilYA(new Date(maintenant.getTime() + 5000), maintenant)).toBe("à l'instant")
  })
  it('formule « jusqu’à »', () => {
    expect(jusquA(new Date(maintenant.getTime() + 2 * HEURE), maintenant)).toMatch(/^jusqu'à \d{2}:\d{2}$/)
    expect(jusquA(new Date(maintenant.getTime() + 30 * HEURE), maintenant)).toMatch(/^jusqu'au \d{2}\/\d{2} à \d{2}:\d{2}$/)
  })
})

describe('validation des critères de position et de zone', () => {
  it('position : code INSEE obligatoire, disponible par défaut, durée contrôlée', () => {
    expect(positionSchema.parse({ insee: '57463' })).toMatchObject({ insee: '57463', disponible: true })
    expect(positionSchema.safeParse({ insee: 'abc' }).success).toBe(false)
    expect(positionSchema.safeParse({ insee: '57463', dureeHeures: 99 }).success).toBe(false)
    expect(positionSchema.safeParse({ insee: '2A004', dureeHeures: 12 }).success).toBe(true)
    expect(positionSchema.safeParse({ lat: 48, lng: 2 }).success).toBe(false) // jamais de coordonnées envoyées par le client
  })
  it('bascule de disponibilité', () => {
    expect(disponibiliteSchema.safeParse({ disponible: true, dureeHeures: 24 }).success).toBe(true)
    expect(disponibiliteSchema.safeParse({ disponible: 'oui' }).success).toBe(false)
  })
  it("zone d'intervention : départements existants, rayon borné", () => {
    expect(zoneSchema.safeParse({ departements: ['57', '67', '2A'], rayonInterventionKm: 200, destinationInsee: '69123' }).success).toBe(true)
    expect(zoneSchema.safeParse({ departements: ['99'] }).success).toBe(false)
    expect(zoneSchema.safeParse({ rayonInterventionKm: 5 }).success).toBe(false)
    expect(zoneSchema.safeParse({ rayonInterventionKm: 99999 }).success).toBe(false)
    expect(zoneSchema.parse({})).toEqual({ rayonInterventionKm: null, departements: [], destinationInsee: null })
  })
  it('recherche : rayon, départements ou région', () => {
    expect(aUneZone(zoneRechercheSchema.parse({ lat: 48.8, lng: 2.3 }))).toBe(true)
    expect(aUneZone(zoneRechercheSchema.parse({ departements: ['57', '67'] }))).toBe(true)
    expect(aUneZone(zoneRechercheSchema.parse({ region: '44' }))).toBe(true)
    expect(aUneZone(zoneRechercheSchema.parse({}))).toBe(false)
    expect(zoneRechercheSchema.safeParse({ departements: [] }).success).toBe(false)
    expect(zoneRechercheSchema.safeParse({ departements: ['57'], region: '99' }).success).toBe(false)
    expect(zoneRechercheSchema.safeParse({ departements: Array(13).fill('57') }).success).toBe(false)
  })
})

describe('zone de recherche (client)', () => {
  const paris = { lat: 48.8566, lng: 2.3522 }
  const annonce = (d: string | null, lat = 49.12, lng = 6.18) => ({ latDepart: lat, lngDepart: lng, departementDepart: d })

  it('une zone doit être complète pour lancer une recherche', () => {
    expect(zoneComplete({ mode: 'ville', rayonKm: 50, departements: [] })).toBe(false)
    expect(zoneComplete({ mode: 'ville', rayonKm: 50, departements: [], ...paris })).toBe(true)
    expect(zoneComplete({ mode: 'departements', rayonKm: 50, departements: [] })).toBe(false)
    expect(zoneComplete({ mode: 'departements', rayonKm: 50, departements: ['57'] })).toBe(true)
    expect(zoneComplete({ mode: 'region', rayonKm: 50, departements: [] })).toBe(false)
    expect(zoneComplete({ mode: 'region', rayonKm: 50, departements: [], region: '44' })).toBe(true)
  })

  it('traduit la zone pour l’API : un seul critère à la fois', () => {
    expect(zonePourApi({ mode: 'ville', rayonKm: 80, departements: ['57'], region: '44', ...paris })).toEqual({ ...paris, rayonKm: 80 })
    expect(zonePourApi({ mode: 'departements', rayonKm: 80, departements: ['57', '67'] })).toEqual({ departements: ['57', '67'] })
    expect(zonePourApi({ mode: 'region', rayonKm: 80, departements: [], region: '44' })).toEqual({ region: '44' })
    expect(zonePourQuery({ mode: 'departements', rayonKm: 80, departements: ['57', '67'] })).toEqual({ departements: '57,67' })
  })

  it('décrit la zone en français', () => {
    expect(libelleZone({ mode: 'ville', rayonKm: 100, departements: [], villeNom: 'Metz' })).toBe('autour de Metz (100 km)')
    expect(libelleZone({ mode: 'departements', rayonKm: 1, departements: ['57', '67'] })).toBe('Moselle (57), Bas-Rhin (67)')
    expect(libelleZone({ mode: 'region', rayonKm: 1, departements: [], region: '44' })).toBe('Grand Est')
  })

  it('une annonce reçue en direct est filtrée comme côté serveur : rayon, départements, région', () => {
    const metz = { mode: 'ville' as const, lat: 49.1193, lng: 6.1757, rayonKm: 50, departements: [] }
    expect(annonceDansZone(annonce('57'), metz)).toBe(true)
    expect(annonceDansZone(annonce('75', 48.8566, 2.3522), metz)).toBe(false)
    const depts = { mode: 'departements' as const, rayonKm: 1, departements: ['57', '67'] }
    expect(annonceDansZone(annonce('57'), depts)).toBe(true)
    expect(annonceDansZone(annonce('67'), depts)).toBe(true)
    expect(annonceDansZone(annonce('54'), depts)).toBe(false)
    expect(annonceDansZone(annonce(null), depts)).toBe(false)
    const reg = { mode: 'region' as const, rayonKm: 1, departements: [], region: '44' }
    expect(annonceDansZone(annonce('54'), reg)).toBe(true) // Meurthe-et-Moselle, Grand Est
    expect(annonceDansZone(annonce('69'), reg)).toBe(false)
  })

  it('une alerte par région couvre tous ses départements', () => {
    expect(departementsDeLaZone({ mode: 'region', rayonKm: 1, departements: [], region: '94' })?.sort()).toEqual(['2A', '2B'])
    expect(departementsDeLaZone({ mode: 'ville', rayonKm: 1, departements: [] })).toBeNull()
    for (const r of REGIONS) expect(departementsDeLaRegion(r.code).length).toBeLessThanOrEqual(15)
  })

  it('calcule des distances plausibles', () => {
    expect(distanceKm(48.8566, 2.3522, 49.1193, 6.1757)).toBeGreaterThan(280)
    expect(distanceKm(48.8566, 2.3522, 49.1193, 6.1757)).toBeLessThan(330)
    expect(distanceKm(48.8566, 2.3522, 48.8566, 2.3522)).toBe(0)
  })
})
