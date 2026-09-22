import { Prisma } from '@prisma/client'
import { db } from './db'

export interface RowTransporteurGeo {
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
  nom: string
  telephone: string | null
  email: string
  verifie: boolean
  note_moyenne: number | null
  nb_avis: number
}

export async function rechercherParRayon(
  lat: number,
  lng: number,
  rayonKm: number,
  disponibleSeulement = false
): Promise<RowTransporteurGeo[]> {
  const clauseDisponible = disponibleSeulement
    ? Prisma.sql`AND tp.disponible = true`
    : Prisma.sql``

  return db.$queryRaw<RowTransporteurGeo[]>(Prisma.sql`
    SELECT
      tp.id,
      tp."userId",
      tp.siret,
      tp."raisonSociale",
      tp.description,
      tp.latitude,
      tp.longitude,
      tp."zonesCirculation",
      tp.disponible,
      tp."derniereMAJ",
      u.nom,
      u.telephone,
      u.email,
      u.verifie,
      av.note_moyenne,
      COALESCE(av.nb_avis, 0)::int AS nb_avis,
      ROUND(
        CAST(
          6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(tp.latitude))
              * cos(radians(tp.longitude) - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(tp.latitude))
            )
          )
        AS NUMERIC), 1
      ) AS distance_km
    FROM "TransporteurProfil" tp
    JOIN "User" u ON u.id = tp."userId"
    LEFT JOIN (
      SELECT "transporteurId", AVG(note)::float AS note_moyenne, COUNT(*)::int AS nb_avis
      FROM "Avis" GROUP BY "transporteurId"
    ) av ON av."transporteurId" = tp.id
    WHERE
      6371 * acos(
        LEAST(1.0,
          cos(radians(${lat})) * cos(radians(tp.latitude))
          * cos(radians(tp.longitude) - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(tp.latitude))
        )
      ) <= ${rayonKm}
      ${clauseDisponible}
    ORDER BY distance_km ASC
    LIMIT 200
  `)
}

export interface RowAnnonceGeo {
  id: string
  transporteurId: string
  userId: string
  villeDepart: string
  latDepart: number
  lngDepart: number
  villeArrivee: string | null
  dateDisponibilite: Date
  dateDisponibiliteFin: Date | null
  commentaire: string | null
  raisonSociale: string
  disponible: boolean
  nom: string
  telephone: string | null
  verifie: boolean
  note_moyenne: number | null
  nb_avis: number
  vehiculeType: string | null
  vehiculeChargeUtile: number | null
  distance_km: number
}

export async function rechercherAnnoncesParRayon(params: {
  lat: number
  lng: number
  rayonKm: number
  date?: Date
  villeArrivee?: string
}): Promise<RowAnnonceGeo[]> {
  const { lat, lng, rayonKm, date, villeArrivee } = params

  // Sans date précisée : n'affiche que les annonces encore valides (pas expirées depuis plus d'un jour)
  const clauseDate = date
    ? Prisma.sql`AND a."dateDisponibilite" <= ${date} AND (a."dateDisponibiliteFin" IS NULL OR a."dateDisponibiliteFin" >= ${date})`
    : Prisma.sql`AND COALESCE(a."dateDisponibiliteFin", a."dateDisponibilite") >= NOW() - INTERVAL '1 day'`

  // Une annonce "toutes directions" (villeArrivee vide) matche toujours la destination recherchée
  const clauseArrivee = villeArrivee
    ? Prisma.sql`AND (a."villeArrivee" IS NULL OR a."villeArrivee" ILIKE ${'%' + villeArrivee + '%'})`
    : Prisma.sql``

  return db.$queryRaw<RowAnnonceGeo[]>(Prisma.sql`
    SELECT
      a.id,
      a."transporteurId",
      tp."userId",
      a."villeDepart",
      a."latDepart",
      a."lngDepart",
      a."villeArrivee",
      a."dateDisponibilite",
      a."dateDisponibiliteFin",
      a.commentaire,
      tp."raisonSociale",
      tp.disponible,
      u.nom,
      u.telephone,
      u.verifie,
      av.note_moyenne,
      COALESCE(av.nb_avis, 0)::int AS nb_avis,
      v.type AS "vehiculeType",
      v."chargeUtile" AS "vehiculeChargeUtile",
      ROUND(
        CAST(
          6371 * acos(
            LEAST(1.0,
              cos(radians(${lat})) * cos(radians(a."latDepart"))
              * cos(radians(a."lngDepart") - radians(${lng}))
              + sin(radians(${lat})) * sin(radians(a."latDepart"))
            )
          )
        AS NUMERIC), 1
      ) AS distance_km
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
      ${clauseDate}
      ${clauseArrivee}
      AND 6371 * acos(
        LEAST(1.0,
          cos(radians(${lat})) * cos(radians(a."latDepart"))
          * cos(radians(a."lngDepart") - radians(${lng}))
          + sin(radians(${lat})) * sin(radians(a."latDepart"))
        )
      ) <= ${rayonKm}
    ORDER BY a."dateDisponibilite" ASC, distance_km ASC
    LIMIT 200
  `)
}
