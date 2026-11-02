import { Prisma } from '@prisma/client'
import { db } from './db'
import { clauseConforme } from './documents'
import { departementsDeLaRegion } from './referentiel-geo'

export interface ZoneRecherche {
  lat?: number
  lng?: number
  rayonKm: number
  departements?: string[]
  region?: string
}

export interface RowTransporteurGeo {
  id: string
  userId: string
  siret: string
  raisonSociale: string
  description: string | null
  latitude: number
  longitude: number
  positionVille: string | null
  positionDepartement: string | null
  positionRegion: string | null
  zonesCirculation: string[]
  rayonInterventionKm: number | null
  destinationVille: string | null
  /** Disponible maintenant (indicateur actif et échéance non dépassée) */
  disponible: boolean
  disponibleJusqua: Date | null
  derniereMAJ: Date
  /** Distance au centre de recherche (null pour une recherche par départements ou région) */
  distance_km: number | null
  /** Trouvé parce qu'il accepte de se déplacer jusqu'à la zone, et non parce qu'il s'y trouve */
  via_intervention: boolean
  nom: string
  telephone: string | null
  verifie: boolean
  note_moyenne: number | null
  nb_avis: number
}

/** Distance (km) entre deux points exprimés en SQL, formule haversine. */
function distanceSql(latCol: string, lngCol: string, lat: number, lng: number): Prisma.Sql {
  const c = Prisma.raw
  return Prisma.sql`6371 * acos(LEAST(1.0,
    cos(radians(${lat})) * cos(radians(${c(latCol)}))
    * cos(radians(${c(lngCol)}) - radians(${lng}))
    + sin(radians(${lat})) * sin(radians(${c(latCol)}))))`
}

/**
 * Transporteurs DISPONIBLES MAINTENANT dans une zone : rayon autour d'une ville, départements ou région.
 * Un transporteur dont la zone d'intervention couvre la zone cherchée est aussi proposé (signalé « via_intervention »).
 * Triés par fraîcheur : dernière mise à jour en premier.
 */
export async function rechercherTransporteurs(zone: ZoneRecherche): Promise<RowTransporteurGeo[]> {
  const aUnPoint = zone.lat !== undefined && zone.lng !== undefined
  const dist = aUnPoint ? distanceSql('tp.latitude', 'tp.longitude', zone.lat!, zone.lng!) : null

  let predicatZone: Prisma.Sql
  let viaIntervention: Prisma.Sql
  if (zone.departements?.length) {
    const d = zone.departements
    predicatZone = Prisma.sql`(tp."positionDepartement" = ANY(${d}::text[]) OR tp."zonesCirculation" && ${d}::text[])`
    viaIntervention = Prisma.sql`NOT COALESCE(tp."positionDepartement" = ANY(${d}::text[]), false)`
  } else if (zone.region) {
    const d = departementsDeLaRegion(zone.region)
    predicatZone = Prisma.sql`(tp."positionRegion" = ${zone.region} OR tp."zonesCirculation" && ${d}::text[])`
    viaIntervention = Prisma.sql`tp."positionRegion" IS DISTINCT FROM ${zone.region}`
  } else if (dist) {
    predicatZone = Prisma.sql`(${dist} <= ${zone.rayonKm} OR ${dist} <= COALESCE(tp."rayonInterventionKm", 0))`
    viaIntervention = Prisma.sql`${dist} > ${zone.rayonKm}`
  } else {
    return []
  }

  return db.$queryRaw<RowTransporteurGeo[]>(Prisma.sql`
    SELECT
      tp.id,
      tp."userId",
      tp.siret,
      tp."raisonSociale",
      tp.description,
      tp.latitude,
      tp.longitude,
      tp."positionVille",
      tp."positionDepartement",
      tp."positionRegion",
      tp."zonesCirculation",
      tp."rayonInterventionKm",
      tp."destinationVille",
      true AS disponible,
      tp."disponibleJusqua",
      tp."derniereMAJ",
      u.nom,
      u.telephone,
      u.verifie,
      av.note_moyenne,
      COALESCE(av.nb_avis, 0)::int AS nb_avis,
      ${dist ? Prisma.sql`ROUND(CAST(${dist} AS NUMERIC), 1)` : Prisma.sql`NULL`} AS distance_km,
      (${viaIntervention}) AS via_intervention
    FROM "TransporteurProfil" tp
    JOIN "User" u ON u.id = tp."userId"
    LEFT JOIN (
      SELECT "transporteurId", AVG(note)::float AS note_moyenne, COUNT(*)::int AS nb_avis
      FROM "Avis" GROUP BY "transporteurId"
    ) av ON av."transporteurId" = tp.id
    WHERE
      NOT u.suspendu AND u."supprimeLe" IS NULL
      ${clauseConforme('u')}
      AND tp.disponible AND tp."disponibleJusqua" > NOW()
      AND ${predicatZone}
    ORDER BY tp."derniereMAJ" DESC, distance_km ASC NULLS LAST
    LIMIT 200
  `)
}

/** Nombre de transporteurs disponibles maintenant, par département (carte). */
export async function compterDisponiblesParDepartement(): Promise<Array<{ code: string; nb: number }>> {
  return db.$queryRaw<Array<{ code: string; nb: number }>>(Prisma.sql`
    SELECT tp."positionDepartement" AS code, COUNT(*)::int AS nb
    FROM "TransporteurProfil" tp
    JOIN "User" u ON u.id = tp."userId"
    WHERE tp."positionDepartement" IS NOT NULL
      AND NOT u.suspendu AND u."supprimeLe" IS NULL
      ${clauseConforme('u')}
      AND tp.disponible AND tp."disponibleJusqua" > NOW()
    GROUP BY tp."positionDepartement"
  `)
}

export interface RowAnnonceGeo {
  id: string
  transporteurId: string
  userId: string
  villeDepart: string
  latDepart: number
  lngDepart: number
  departementDepart: string | null
  villeArrivee: string | null
  departementArrivee: string | null
  dateDisponibilite: Date
  dateDisponibiliteFin: Date | null
  createdAt: Date
  commentaire: string | null
  raisonSociale: string
  disponible: boolean
  nom: string
  verifie: boolean
  note_moyenne: number | null
  nb_avis: number
  vehiculeType: string | null
  vehiculeChargeUtile: number | null
  distance_km: number | null
}

export type RowAnnonceDiffusion = Omit<RowAnnonceGeo, 'distance_km'>

// Récupère une annonce fraîchement créée avec tous les champs d'affichage,
// pour la diffuser en direct via Socket.io (voir POST /api/annonces).
// distance_km est omis : chaque client la calcule lui-même selon sa recherche en cours.
export async function recupererAnnonceDiffusion(id: string): Promise<RowAnnonceDiffusion | null> {
  const rows = await db.$queryRaw<RowAnnonceDiffusion[]>(Prisma.sql`
    SELECT
      a.id,
      a."transporteurId",
      tp."userId",
      a."villeDepart",
      a."latDepart",
      a."lngDepart",
      a."departementDepart",
      a."villeArrivee",
      a."departementArrivee",
      a."dateDisponibilite",
      a."dateDisponibiliteFin",
      a."createdAt",
      a.commentaire,
      tp."raisonSociale",
      (tp.disponible AND tp."disponibleJusqua" > NOW()) AS disponible,
      u.nom,
      u.verifie,
      av.note_moyenne,
      COALESCE(av.nb_avis, 0)::int AS nb_avis,
      v.type AS "vehiculeType",
      v."chargeUtile" AS "vehiculeChargeUtile"
    FROM "Annonce" a
    JOIN "TransporteurProfil" tp ON tp.id = a."transporteurId"
    JOIN "User" u ON u.id = tp."userId"
    LEFT JOIN "Vehicule" v ON v.id = a."vehiculeId"
    LEFT JOIN (
      SELECT "transporteurId", AVG(note)::float AS note_moyenne, COUNT(*)::int AS nb_avis
      FROM "Avis" GROUP BY "transporteurId"
    ) av ON av."transporteurId" = tp.id
    WHERE a.id = ${id}
    LIMIT 1
  `)
  return rows[0] ?? null
}

export interface FiltresAnnonces {
  date?: Date
  villeArrivee?: string
  typeVehicule?: string
  disponibleMaintenant?: boolean
}

/** Annonces datées dont le départ est dans la zone (rayon, départements ou région), les plus récentes en premier. */
export async function rechercherAnnonces(zone: ZoneRecherche, filtres: FiltresAnnonces = {}): Promise<RowAnnonceGeo[]> {
  const { date, villeArrivee, typeVehicule, disponibleMaintenant } = filtres
  const aUnPoint = zone.lat !== undefined && zone.lng !== undefined
  const dist = aUnPoint ? distanceSql('a."latDepart"', 'a."lngDepart"', zone.lat!, zone.lng!) : null

  let predicatZone: Prisma.Sql
  if (zone.departements?.length) predicatZone = Prisma.sql`a."departementDepart" = ANY(${zone.departements}::text[])`
  else if (zone.region) predicatZone = Prisma.sql`a."regionDepart" = ${zone.region}`
  else if (dist) predicatZone = Prisma.sql`${dist} <= ${zone.rayonKm}`
  else return []

  // Sans date précisée : n'affiche que les annonces encore valides (pas expirées depuis plus d'un jour)
  const clauseDate = date
    ? Prisma.sql`AND a."dateDisponibilite" <= ${date} AND (a."dateDisponibiliteFin" IS NULL OR a."dateDisponibiliteFin" >= ${date})`
    : Prisma.sql`AND COALESCE(a."dateDisponibiliteFin", a."dateDisponibilite") >= NOW() - INTERVAL '1 day'`

  // Une annonce "toutes directions" (villeArrivee vide) matche toujours la destination recherchée
  const clauseArrivee = villeArrivee
    ? Prisma.sql`AND (a."villeArrivee" IS NULL OR a."villeArrivee" ILIKE ${'%' + villeArrivee + '%'})`
    : Prisma.empty
  const clauseVehicule = typeVehicule ? Prisma.sql`AND v.type = ${typeVehicule}::"TypeVehicule"` : Prisma.empty
  const clauseDispo = disponibleMaintenant ? Prisma.sql`AND tp.disponible AND tp."disponibleJusqua" > NOW()` : Prisma.empty

  return db.$queryRaw<RowAnnonceGeo[]>(Prisma.sql`
    SELECT
      a.id,
      a."transporteurId",
      tp."userId",
      a."villeDepart",
      a."latDepart",
      a."lngDepart",
      a."departementDepart",
      a."villeArrivee",
      a."departementArrivee",
      a."dateDisponibilite",
      a."dateDisponibiliteFin",
      a."createdAt",
      a.commentaire,
      tp."raisonSociale",
      (tp.disponible AND tp."disponibleJusqua" > NOW()) AS disponible,
      u.nom,
      u.verifie,
      av.note_moyenne,
      COALESCE(av.nb_avis, 0)::int AS nb_avis,
      v.type AS "vehiculeType",
      v."chargeUtile" AS "vehiculeChargeUtile",
      ${dist ? Prisma.sql`ROUND(CAST(${dist} AS NUMERIC), 1)` : Prisma.sql`NULL`} AS distance_km
    FROM "Annonce" a
    JOIN "TransporteurProfil" tp ON tp.id = a."transporteurId"
    JOIN "User" u ON u.id = tp."userId"
    LEFT JOIN "Vehicule" v ON v.id = a."vehiculeId"
    LEFT JOIN (
      SELECT "transporteurId", AVG(note)::float AS note_moyenne, COUNT(*)::int AS nb_avis
      FROM "Avis" GROUP BY "transporteurId"
    ) av ON av."transporteurId" = tp.id
    WHERE
      a.active = true
      AND NOT u.suspendu AND u."supprimeLe" IS NULL
      ${clauseConforme('u')}
      ${clauseDate}
      ${clauseArrivee}
      ${clauseVehicule}
      ${clauseDispo}
      AND ${predicatZone}
    ORDER BY a."createdAt" DESC
    LIMIT 200
  `)
}

export interface RowBesoinGeo {
  id: string
  userId: string
  commissionnaireId: string
  raisonSociale: string
  verifie: boolean
  villeDepart: string
  latDepart: number
  lngDepart: number
  villeArrivee: string
  dateEnlevement: Date
  typeVehicule: string | null
  poidsKg: number | null
  description: string | null
  distance_km: number
}

/** Besoins de transport actifs dont le départ est dans le rayon (vue transporteur). */
export async function rechercherBesoinsParRayon(lat: number, lng: number, rayonKm: number): Promise<RowBesoinGeo[]> {
  return db.$queryRaw<RowBesoinGeo[]>(Prisma.sql`
    SELECT
      b.id,
      cp."userId",
      b."commissionnaireId",
      cp."raisonSociale",
      u.verifie,
      b."villeDepart",
      b."latDepart",
      b."lngDepart",
      b."villeArrivee",
      b."dateEnlevement",
      b."typeVehicule",
      b."poidsKg",
      b.description,
      ROUND(CAST(6371 * acos(LEAST(1.0,
        cos(radians(${lat})) * cos(radians(b."latDepart"))
        * cos(radians(b."lngDepart") - radians(${lng}))
        + sin(radians(${lat})) * sin(radians(b."latDepart")))) AS NUMERIC), 1) AS distance_km
    FROM "Besoin" b
    JOIN "CommissionnaireProfil" cp ON cp.id = b."commissionnaireId"
    JOIN "User" u ON u.id = cp."userId"
    WHERE b.active
      AND NOT u.suspendu AND u."supprimeLe" IS NULL
      ${clauseConforme('u')}
      AND b."dateEnlevement" >= NOW() - INTERVAL '1 day'
      AND 6371 * acos(LEAST(1.0,
        cos(radians(${lat})) * cos(radians(b."latDepart"))
        * cos(radians(b."lngDepart") - radians(${lng}))
        + sin(radians(${lat})) * sin(radians(b."latDepart")))) <= ${rayonKm}
    ORDER BY b."dateEnlevement" ASC, distance_km ASC
    LIMIT 200
  `)
}

export type RowBesoinDiffusion = Omit<RowBesoinGeo, 'distance_km'>

export async function recupererBesoinDiffusion(id: string): Promise<RowBesoinDiffusion | null> {
  const rows = await db.$queryRaw<RowBesoinDiffusion[]>(Prisma.sql`
    SELECT b.id, cp."userId", b."commissionnaireId", cp."raisonSociale", u.verifie,
      b."villeDepart", b."latDepart", b."lngDepart", b."villeArrivee", b."dateEnlevement",
      b."typeVehicule", b."poidsKg", b.description
    FROM "Besoin" b
    JOIN "CommissionnaireProfil" cp ON cp.id = b."commissionnaireId"
    JOIN "User" u ON u.id = cp."userId"
    WHERE b.id = ${id}
    LIMIT 1
  `)
  return rows[0] ?? null
}
